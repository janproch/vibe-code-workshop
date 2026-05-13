import { PNG } from 'pngjs'
import os from 'node:os'
import path from 'node:path'
import { promisify } from 'node:util'
import { execFile } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { mkdtemp, readdir, rm } from 'node:fs/promises'

const OPENTOPODATA_URL = 'https://api.opentopodata.org/v1/srtm30m'
const BATCH_SIZE = 100     // OpenTopoData max locations per request
const RATE_LIMIT_MS = 1100 // public API allows ~1 req/s
const execFileAsync = promisify(execFile)

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT_DIR = path.resolve(__dirname, '../..')
const WATER_DIR = path.join(ROOT_DIR, 'data', 'water')

function formatBounds(bounds) {
  const { north, south, east, west } = bounds
  return `N:${north.toFixed(5)} S:${south.toFixed(5)} E:${east.toFixed(5)} W:${west.toFixed(5)}`
}

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

// ── Water polygons (local osmium + prefiltered OSM water files) ───────────────

function coordsToRing(coords) {
  if (!Array.isArray(coords) || coords.length < 3) return null
  return coords.map(([lng, lat]) => ({ lat, lng }))
}

function parseJsonSeqWaterAreas(jsonseq) {
  const areas = []
  const records = jsonseq.split('\n')

  for (const rawLine of records) {
    const line = rawLine.replace(/^\u001e/, '').trim()
    if (!line) continue

    let feature
    try {
      feature = JSON.parse(line)
    } catch {
      continue
    }

    const geometry = feature?.geometry
    if (!geometry || !geometry.type || !Array.isArray(geometry.coordinates)) continue

    if (geometry.type === 'Polygon') {
      const [outerRaw, ...holeRaws] = geometry.coordinates
      const outer = coordsToRing(outerRaw)
      if (!outer) continue
      const holes = holeRaws.map(coordsToRing).filter(Boolean)
      areas.push({ outer, holes })
      continue
    }

    if (geometry.type === 'MultiPolygon') {
      for (const poly of geometry.coordinates) {
        if (!Array.isArray(poly) || poly.length === 0) continue
        const [outerRaw, ...holeRaws] = poly
        const outer = coordsToRing(outerRaw)
        if (!outer) continue
        const holes = holeRaws.map(coordsToRing).filter(Boolean)
        areas.push({ outer, holes })
      }
    }
  }

  return areas
}

async function getWaterSources() {
  try {
    const entries = await readdir(WATER_DIR, { withFileTypes: true })
    return entries
      .filter(e => e.isFile() && e.name.endsWith('.osm.pbf'))
      .map(e => path.join(WATER_DIR, e.name))
  } catch (err) {
    if (err?.code === 'ENOENT') return []
    throw err
  }
}

async function fetchWaterPolygons(bounds) {
  const sources = await getWaterSources()
  if (sources.length === 0) {
    console.warn('[water] No water source files found in data/water; inland overlays will be skipped')
    return []
  }

  const bbox = `${bounds.west},${bounds.south},${bounds.east},${bounds.north}`
  const tmpDir = await mkdtemp(path.join(os.tmpdir(), 'water-bbox-'))
  console.log(`[water] Starting osmium water load for bbox ${bbox} from ${sources.length} file(s)`) 

  try {
    const allAreas = []

    for (let i = 0; i < sources.length; i++) {
      const sourceFile = sources[i]
      const clippedFile = path.join(tmpDir, `clip-${i}.osm.pbf`)
      const sourceName = path.basename(sourceFile)
      const extractStart = Date.now()

      console.log(`[water] [${i + 1}/${sources.length}] osmium extract start: ${sourceName}`)

      await execFileAsync('osmium', [
        'extract',
        '-b', bbox,
        sourceFile,
        '-o', clippedFile,
        '--overwrite',
      ])

      console.log(`[water] [${i + 1}/${sources.length}] osmium extract done: ${sourceName} (${Date.now() - extractStart}ms)`)

      const exportStart = Date.now()
      console.log(`[water] [${i + 1}/${sources.length}] osmium export start: ${sourceName}`)

      const { stdout } = await execFileAsync('osmium', [
        'export',
        clippedFile,
        '-f', 'jsonseq',
        '--geometry-types=polygon,multipolygon',
      ], { maxBuffer: 1024 * 1024 * 64 })

      console.log(`[water] [${i + 1}/${sources.length}] osmium export done: ${sourceName} (${Date.now() - exportStart}ms)`)

      const parsed = parseJsonSeqWaterAreas(stdout)
      allAreas.push(...parsed)
      console.log(`[water] [${i + 1}/${sources.length}] parsed ${parsed.length} polygon area(s) from ${sourceName}`)
    }

    console.log(`[water] Completed osmium water load: ${allAreas.length} total polygon area(s)`)
    return allAreas
  } catch (err) {
    console.error('[water] Osmium processing failed:', err.message)
    throw err
  } finally {
    await rm(tmpDir, { recursive: true, force: true })
    console.log('[water] Cleaned up temporary osmium directory')
  }
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

function isWater(point, elev, waterAreas) {
  // null elevation = SRTM has no data → ocean cell
  // negative elevation = below sea level (sea, Dead Sea, etc.)
  if (elev === null || elev < 0) return true
  // Check inland water bodies from prefiltered local OSM data
  return waterAreas.some(area => (
    pointInPolygon(point, area.outer) && !area.holes.some(hole => pointInPolygon(point, hole))
  ))
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
  const startedAt = Date.now()
  console.log(`[heightmap] Request started (${formatBounds(bounds)}), resolution=${resolution}`)

  const points = buildGrid(bounds, resolution)
  console.log(`[heightmap] Built grid with ${points.length} point(s)`)

  // Fetch elevation data and local water polygons in parallel.
  // Water load is best-effort: if osmium/files are unavailable, we still render elevation.
  const [elevations, waterAreas] = await Promise.all([
    fetchElevations(points),
    fetchWaterPolygons(bounds).catch(err => {
      console.warn('Local water load failed (elevation map will have no inland water overlay):', err.message)
      return []
    }),
  ])

  console.log(`[heightmap] Data fetch complete: elevations=${elevations.length}, waterAreas=${waterAreas.length}`)

  // Compute min/max only over land cells for proper colour scaling
  const landElevs = elevations.filter(e => e !== null && e >= 0)
  const min = landElevs.length ? Math.min(...landElevs) : 0
  const max = landElevs.length ? Math.max(...landElevs) : 1
  const range = max - min || 1
  console.log(`[heightmap] Land elevation stats: samples=${landElevs.length}, min=${min}, max=${max}`)

  const png = new PNG({ width: resolution, height: resolution })
  png.data = Buffer.alloc(resolution * resolution * 4)

  for (let i = 0; i < points.length; i++) {
    const elev = elevations[i]
    let r, g, b

    if (isWater(points[i], elev, waterAreas)) {
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

  const result = PNG.sync.write(png)
  console.log(`[heightmap] PNG generated (${result.length} bytes) in ${Date.now() - startedAt}ms`)
  return result
}
