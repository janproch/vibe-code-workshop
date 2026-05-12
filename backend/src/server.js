import express from 'express'
import cors from 'cors'
import { generateHeightMap } from './elevation.js'

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json())

app.post('/elevation', async (req, res) => {
  const { north, south, east, west, resolution = 32 } = req.body

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

  // Clamp resolution: 2–128 (128×128 = 1 024 pts ≈ 11 OpenTopoData requests)
  const clampedRes = Math.min(Math.max(Math.round(resolution), 2), 128)

  try {
    const png = await generateHeightMap({ north, south, east, west }, clampedRes)
    res.set('Content-Type', 'image/png')
    res.send(png)
  } catch (err) {
    console.error(err)
    res.status(502).json({ error: 'Failed to fetch elevation data' })
  }
})

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`)
})
