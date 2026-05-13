# Height Map Extractor

A workshop project that lets you draw a rectangle on an OpenStreetMap view and download an elevation/height map PNG for that area — entirely with free, no-key-required services.

## How it works

1. Open the app in your browser.
2. Draw a rectangle on the map to select any geographic area.
3. The app fetches elevation samples from [OpenTopoData](https://api.opentopodata.org) (SRTM 30 m).
4. A grayscale height map is generated (pixel brightness = relative elevation) and displayed.
5. Export the result as a PNG.

## Tech stack

| Layer | Technology |
|-------|-----------|
| Frontend | [React 18](https://react.dev) + [Vite](https://vitejs.dev) |
| Map UI | [Leaflet.js](https://leafletjs.com) (custom rectangle draw — no plugin needed) |
| Map tiles | [OpenStreetMap](https://www.openstreetmap.org) (no API key needed) |
| Backend | [Node.js](https://nodejs.org) + [Express](https://expressjs.com) |
| Elevation data | [OpenTopoData SRTM 30 m](https://www.opentopodata.org/datasets/srtm30m/) (no API key needed) |
| PNG generation | [pngjs](https://github.com/pngjs/pngjs) |

No API keys or accounts are required.

## Setup

### Prerequisites
- [Node.js](https://nodejs.org) 18 or later

### 1 — Install dependencies

```bash
cd backend && npm install
cd ../frontend && npm install
```

### 2 — Start the backend

```bash
cd backend
npm run dev   # starts on http://localhost:3001
```

### 3 — Start the frontend (new terminal)

```bash
cd frontend
npm run dev   # starts on http://localhost:5173
```

Open **http://localhost:5173** in your browser, draw a rectangle on the map, and the height map appears in the right panel.

> **Note on grid resolution:** The default resolution is 32 × 32 (≈ 11 API requests, ~12 s).
> Raising it to 128 × 128 takes ~3 minutes due to OpenTopoData's 1 req/s rate limit on the free tier.

## Project structure

```
/
├── backend/
│   ├── package.json
│   └── src/
│       ├── server.js      # Express server, POST /elevation endpoint
│       └── elevation.js   # OpenTopoData fetching, grid sampling, PNG generation
├── frontend/
│   ├── index.html
│   ├── vite.config.js     # dev proxy: /api → localhost:3001
│   ├── package.json
│   └── src/
│       ├── main.jsx
│       ├── App.jsx
│       ├── App.css
│       └── components/
│           ├── MapView.jsx        # Leaflet map with custom rectangle draw
│           └── HeightMapPanel.jsx # Displays and downloads the PNG result
├── .gitignore
├── AGENTS.md      # AI agent instructions and project conventions
└── README.md      # This file
```

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
| `resolution` | `number` | Grid side length (default **32**). The backend clamps values to **2–128**. |

Response: `image/png` where pixel brightness encodes elevation (0 = lowest point, 255 = highest point in the selected area).

## Elevation data limits

OpenTopoData accepts up to **100 locations per request**. For a 128 × 128 grid the backend splits the request into multiple batches automatically.

## Contributing / Workshop notes

- Keep code simple and readable — this is a learning project.
- Add a comment or README section for any non-obvious step.
- See [AGENTS.md](AGENTS.md) for architecture decisions and coding conventions used by AI agents.
