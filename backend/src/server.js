import express from 'express'
import cors from 'cors'
import { generateHeightMap } from './elevation.js'

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json())

app.post('/elevation', async (req, res) => {
  const { north, south, east, west, resolution = 512 } = req.body

  // Validate bounding box (WGS-84 decimal degrees)
  if (
    typeof north !== 'number' || typeof south !== 'number' ||
    typeof east  !== 'number' || typeof west  !== 'number' ||
    north < -90  || north > 90  || south < -90  || south > 90  ||
    east  < -180 || east  > 180 || west  < -180 || west  > 180 ||
    north <= south || east <= west
  ) {
    return res.status(400).json({ error: 'Invalid bounding box' })
  }

  // Clamp resolution: 2–512 (512×512 = 262 144 pts ≈ 2621 OpenTopoData requests)
  const clampedRes = Math.min(Math.max(Math.round(resolution), 2), 512)

  try {
    const png = await generateHeightMap({ north, south, east, west }, clampedRes)
    res.set('Content-Type', 'image/png')
    res.send(png)
  } catch (err) {
    console.error('Elevation error:', err.message)
    res.status(502).json({ error: 'Failed to fetch elevation data', detail: err.message })
  }
})

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`)
})
