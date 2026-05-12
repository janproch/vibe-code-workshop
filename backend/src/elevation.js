import { PNG } from 'pngjs'

const OPENTOPODATA_URL = 'https://api.opentopodata.org/v1/srtm30m'
const OVERPASS_URL = 'https://overpass.kumi.systems/api/interpreter'
const OVERPASS_HEADERS = {
  'Accept': 'application/json',
  'User-Agent': 'height-map-extractor/1.0 (workshop demo project)',
}
const BATCH_SIZE = 100     // OpenTopoData max locations per request
const RATE_LIMIT_MS = 1100 // public API allows ~1 req/s

// ── Grid ─────────────────────────────────────────────────────────────────────

/**
 * Build a flat array of { lat, lng } grid points covering the bounding box.
 * Row-major order: north→south rows, west→east columns.
 */
function buildGrid(bounds, resolution) {
  const { north, south, east, west } = bounds
  const points = []
  for (let row = 0; row < resolution; row++) {
    const lat = north - (row / (resolution - 1)) * (north - south)
    for (let col = 0; col < resolution; col++) {
      const lng = west + (col / (resolution - 1)) * (east - west)
      points.push({ lat, lng })
    }
  }
  return points
}

function chunk(arr, size) {
  const out = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

// ── Elevation (OpenTopoData) ──────────────────────────────────────────────────

async function fetchBatch(points) {
  const locations = points.map(p => `${p.lat},${p.lng}`).join('|')
  const res = await fetch(`${OPENTOPODATA_URL}?locations=${locations}`)
  if (!res.ok) throw new Error(`OpenTopoData HTTP ${res.status}`)
  const data = await res.json()
  if (data.status !== 'OK') throw new Error(`OpenTopoData status: ${data.status}`)
  // elevation can be null for ocean cells where SRTM has no coverage
  return data.results.map(r => r.elevation)
}

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))

async function fetchElevations(points) {
  const batches = chunk(points, BATCH_SIZE)
  const elevations = []
  for (let i = 0; i < batches.length; i++) {
    if (i > 0) await sleep(RATE_LIMIT_MS)
    const values = await fetchBatch(batches[i])
    elevations.push(...values)
  }
  return elevations
}

// ── Water polygons (Overpass API / OpenStreetMap) ─────────────────────────────

async function fetchWaterPolygons(bounds) {
  const { north, south, east, west } = bounds
  const bbox = `${south},${west},${north},${east}`
  // "out geom" returns node coordinates inline — much cheaper than out body;>;out skel qt;
  const query =
    `[out:json][timeout:20];` +
    `(` +
    `way["natural"="water"](${bbox});` +
    `way["landuse"="reservoir"](${bbox});` +
    `way["landuse"="basin"](${bbox});` +
    `way["natural"="wetland"](${bbox});` +
    `);` +
    `out geom;`

  const url = `${OVERPASS_URL}?data=${encodeURIComponent(query)}`
  const res = await fetch(url, { headers: OVERPASS_HEADERS })
  if (!res.ok) throw new Error(`Overpass API HTTP ${res.status}: ${await res.text().then(t => t.slice(0, 200))}`)
  const data = await res.json()

  // With "out geom" each way already carries its geometry array
  const polygons = []
  for (const el of data.elements) {
    if (el.type === 'way' && Array.isArray(el.geometry) && el.geometry.length >= 3) {
      polygons.push(el.geometry.map(n => ({ lat: n.lat, lng: n.lon })))
    }
  }
  return polygons
}

// Ray-casting point-in-polygon (works for any simple polygon in lat/lng space)
function pointInPolygon({ lat, lng }, polygon) {
  let inside = false
  const n = polygon.length
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = polygon[i].lng, yi = polygon[i].lat
    const xj = polygon[j].lng, yj = polygon[j].lat
    if ((yi > lat) !== (yj > lat) &&
        lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) {
      inside = !inside
    }
  }
  return inside
}

function isWater(point, elev, waterPolygons) {
  // null elevation = SRTM has no data → ocean cell
  // negative elevation = below sea level (sea, Dead Sea, etc.)
  if (elev === null || elev < 0) return true
  // Check inland water bodies from OpenStreetMap
  return waterPolygons.some(poly => pointInPolygon(point, poly))
}

// ── Topographic color scheme ──────────────────────────────────────────────────

// Control points: [normalised land elevation 0–1, [R, G, B]]
const COLOR_STOPS = [
  [0.00, [120, 196,  80]],  // lowland green
  [0.25, [172, 210, 110]],  // light green
  [0.45, [210, 195, 130]],  // savannah / steppe
  [0.60, [190, 145,  80]],  // light brown
  [0.75, [155, 100,  55]],  // brown
  [0.90, [130,  90,  70]],  // dark brown / rocky
  [1.00, [245, 245, 245]],  // snow / high peaks
]

const WATER_COLOR = [65, 150, 220]

function lerp(a, b, t) { return a + (b - a) * t }

function elevationToColor(norm) {
  const clamped = Math.max(0, Math.min(1, norm))
  for (let i = 1; i < COLOR_STOPS.length; i++) {
    const [t0, c0] = COLOR_STOPS[i - 1]
    const [t1, c1] = COLOR_STOPS[i]
    if (clamped <= t1) {
      const t = (clamped - t0) / (t1 - t0)
      return [
        Math.round(lerp(c0[0], c1[0], t)),
        Math.round(lerp(c0[1], c1[1], t)),
        Math.round(lerp(c0[2], c1[2], t)),
      ]
    }
  }
  return COLOR_STOPS.at(-1)[1]
}

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * Generate a topographic PNG height map for the given bounding box.
 * Blue = water, green = low land, brown = high land, white = peaks.
 *
 * @param {{ north, south, east, west }} bounds  - WGS-84 decimal degrees
 * @param {number} resolution                    - grid side length (e.g. 32 → 32×32)
 * @returns {Promise<Buffer>} PNG image buffer
 */
export async function generateHeightMap(bounds, resolution) {
  const points = buildGrid(bounds, resolution)

  // Fetch elevation data and water polygons in parallel.
  // Water fetch is best-effort — a timeout returns an empty list rather than failing the whole request.
  const [elevations, waterPolygons] = await Promise.all([
    fetchElevations(points),
    fetchWaterPolygons(bounds).catch(err => {
      console.warn('Water fetch failed (elevation map will have no water overlay):', err.message)
      return []
    }),
  ])

  // Compute min/max only over land cells for proper colour scaling
  const landElevs = elevations.filter(e => e !== null && e >= 0)
  const min = landElevs.length ? Math.min(...landElevs) : 0
  const max = landElevs.length ? Math.max(...landElevs) : 1
  const range = max - min || 1

  const png = new PNG({ width: resolution, height: resolution })
  png.data = Buffer.alloc(resolution * resolution * 4)

  for (let i = 0; i < points.length; i++) {
    const elev = elevations[i]
    let r, g, b

    if (isWater(points[i], elev, waterPolygons)) {
      ;[r, g, b] = WATER_COLOR
    } else {
      const norm = (elev - min) / range
      ;[r, g, b] = elevationToColor(norm)
    }

    const idx = i * 4
    png.data[idx]     = r
    png.data[idx + 1] = g
    png.data[idx + 2] = b
    png.data[idx + 3] = 255
  }

  return PNG.sync.write(png)
}
