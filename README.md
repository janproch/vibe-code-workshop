# Height Map Extractor

A workshop project that lets you draw a rectangle on an OpenStreetMap view and download an elevation/height map for that area — entirely with free, no-key-required services.

## How it works

1. Open the app in your browser.
2. Draw a rectangle on the map to select any geographic area.
3. The app fetches elevation samples from [OpenTopoData](https://api.opentopodata.org) (SRTM 30 m).
4. A grayscale height map is generated (pixel brightness = relative elevation) and displayed.
5. Optionally export the result as a PNG or GeoTIFF.

## Tech stack

| Layer | Technology |
|-------|-----------|
| Map UI | [Leaflet.js](https://leafletjs.com) + [leaflet-draw](https://github.com/Leaflet/Leaflet.draw) |
| Map tiles | [OpenStreetMap](https://www.openstreetmap.org) (no API key needed) |
| Elevation data | [OpenTopoData SRTM 30 m](https://www.opentopodata.org/datasets/srtm30m/) (no API key needed) |

No API keys or accounts are required.

## Setup

> _Commands will be filled in once the project is scaffolded. Run `/Scaffold Project` in Copilot chat to generate the starter code for your preferred stack._

```bash
# Example — replace with actual commands after scaffolding
npm install        # install dependencies
npm run dev        # start the development server
```

Then open `http://localhost:3000` (or the port shown in the terminal) in your browser.

## Project structure

```
/
├── frontend/      # Map UI — Leaflet rectangle selection, height map display
├── backend/       # API — receives bounding box, queries elevation, returns PNG
├── AGENTS.md      # AI agent instructions and project conventions
└── README.md      # This file
```

> Structure is created during scaffolding and may differ depending on the chosen stack.

## API reference

### `POST /elevation`

Request body:

```json
{
  "north": 50.1,
  "south": 49.9,
  "east":  14.5,
  "west":  14.2,
  "resolution": 128
}
```

| Field | Type | Description |
|-------|------|-------------|
| `north`, `south`, `east`, `west` | `number` | Bounding box in decimal degrees (WGS-84) |
| `resolution` | `number` | Grid size (default **128**, meaning 128 × 128 samples) |

Response: a PNG image where pixel brightness encodes elevation (0 = lowest point, 255 = highest point in the selected area).

## Elevation data limits

OpenTopoData accepts up to **100 locations per request**. For a 128 × 128 grid the backend splits the request into multiple batches automatically.

## Contributing / Workshop notes

- Keep code simple and readable — this is a learning project.
- Add a comment or README section for any non-obvious step.
- See [AGENTS.md](AGENTS.md) for architecture decisions and coding conventions used by AI agents.
