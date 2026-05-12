import { PNG } from 'pngjs'

const OPENTOPODATA_URL = 'https://api.opentopodata.org/v1/srtm30m'
const BATCH_SIZE = 100     // OpenTopoData max locations per request
const RATE_LIMIT_MS = 1100 // public API allows ~1 req/s

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

async function fetchBatch(points) {
  const locations = points.map(p => `${p.lat},${p.lng}`).join('|')
  const res = await fetch(`${OPENTOPODATA_URL}?locations=${locations}`)
  if (!res.ok) throw new Error(`OpenTopoData HTTP ${res.status}`)
  const data = await res.json()
  if (data.status !== 'OK') throw new Error(`OpenTopoData status: ${data.status}`)
  return data.results.map(r => r.elevation ?? 0)
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

/**
 * Generate a grayscale PNG height map for the given bounding box.
 * Pixel brightness encodes relative elevation: 0 = lowest, 255 = highest.
 *
 * @param {{ north, south, east, west }} bounds  - WGS-84 decimal degrees
 * @param {number} resolution                    - grid side length (e.g. 32 → 32×32)
 * @returns {Promise<Buffer>} PNG image buffer
 */
export async function generateHeightMap(bounds, resolution) {
  const points = buildGrid(bounds, resolution)
  const elevations = await fetchElevations(points)

  const min = Math.min(...elevations)
  const max = Math.max(...elevations)
  const range = max - min || 1 // avoid division by zero for completely flat areas

  const png = new PNG({ width: resolution, height: resolution })
  png.data = Buffer.alloc(resolution * resolution * 4) // RGBA, 4 bytes/pixel

  for (let i = 0; i < elevations.length; i++) {
    const v = Math.round(((elevations[i] - min) / range) * 255)
    const idx = i * 4
    png.data[idx]     = v   // R
    png.data[idx + 1] = v   // G
    png.data[idx + 2] = v   // B
    png.data[idx + 3] = 255 // A (fully opaque)
  }

  return PNG.sync.write(png)
}
