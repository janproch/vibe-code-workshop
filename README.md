# Height Map Extractor

A workshop project that lets you draw a rectangle on an OpenStreetMap view and download an elevation/height map PNG for that area — entirely with free, no-key-required services.

## How it works

1. Open the app in your browser and set your desired grid resolution (8–512 points per side, default **512 × 512**).
2. Click **Select area** and draw a rectangle on the map to define any geographic area.
3. The app fetches elevation samples from [OpenTopoData](https://api.opentopodata.org) (SRTM 30 m) and detects water bodies from local OpenStreetMap water extracts in `data/water/`.
4. A topographic PNG map is generated with color-coded elevation zones (green = lowlands, brown = uplands, white = peaks) and blue water overlays.
5. View the result in the right panel and export it as a PNG.

## Tech stack

| Layer | Technology |
|-------|-----------|
| Frontend | [React 18](https://react.dev) + [Vite](https://vitejs.dev) |
| Map UI | [Leaflet.js](https://leafletjs.com) (custom rectangle draw — no plugin needed) |
| Map tiles | [OpenStreetMap](https://www.openstreetmap.org) (no API key needed) |
| Backend | [Node.js](https://nodejs.org) + [Express](https://expressjs.com) |
| Elevation data | [OpenTopoData SRTM 30 m](https://www.opentopodata.org/datasets/srtm30m/) (no API key needed) |
| Water detection | Local OpenStreetMap extracts + [osmium-tool](https://osmcode.org/osmium-tool/) |
| PNG generation | [pngjs](https://github.com/pngjs/pngjs) |

No API keys or accounts are required.

## Setup

### Prerequisites
- [Node.js](https://nodejs.org) 18 or later
- [osmium-tool](https://osmcode.org/osmium-tool/) (required for water extraction and backend water rendering)

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

Open **http://localhost:5173** in your browser, set a grid resolution (default **512 × 512**), click **Select area**, and draw a rectangle on the map. The topographic height map appears in the right panel with a legend showing elevation zones.

Before rendering inland water overlays, generate local water extracts:

```bash
./scripts/extract-water-data-all.sh
```

To extract water data only for one downloaded Geofabrik slug:

```bash
./scripts/extract-water-data.sh czech-republic
```

> **Grid resolution:** Ranges from 8 to 128 points per side. Resolution 32 × 32 uses ~11 API requests (~12 s). Resolution 128 × 128 takes ~3 minutes due to OpenTopoData's 1 req/s rate limit on the free tier.

## Project structure

```
/
├── backend/
│   ├── package.json
│   └── src/
│       ├── server.js      # Express server, POST /elevation endpoint
│       └── elevation.js   # OpenTopoData + local osmium water overlay rendering
├── scripts/
│   ├── extract-water-data.sh      # Builds one water extract from data/source/<slug>-latest.osm.pbf
│   └── extract-water-data-all.sh  # Builds water extracts for all data/source/*.osm.pbf files
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

Response: `image/png` where pixel colors encode elevation and water:
- **Blue**: Water (oceans, lakes, reservoirs, wetlands)
- **Green to brown gradient**: Land (green = lowlands → brown = uplands/mountains)
- **White**: High peaks / snow zones

Color intensity and hue follow a topographic scale relative to the min/max elevation in the selected area.

## API and data limits

**OpenTopoData (elevation):** Accepts up to 100 locations per request. For a 512 × 512 grid (~262k elevation points) the backend splits requests into ~2,621 batches. Due to the free tier's 1 req/s rate limit, this takes roughly 5–10 minutes.

**Local water detection (osmium):** The backend reads pre-filtered files in `data/water/`, clips each file by the requested bounding box with `osmium extract`, exports geometries via `osmium export -f jsonseq`, and paints those polygons as water. If local files are missing or osmium fails, the map still renders elevation (and oceans from null/negative elevation cells), but inland water overlays may be missing.

**Grid resolution:** Ranges from 8 to 512 points per side. Higher resolution = finer detail but significantly longer processing time due to elevation API rate limiting.

## Offline water extraction (osmium)

If you have local OSM PBF files in `data/source/`, you can pre-extract water features into `data/water/`:

```bash
./scripts/extract-water-data-all.sh
```

To extract only one file by Geofabrik slug:

```bash
./scripts/extract-water-data.sh <slug>
```

Example:

```bash
./scripts/extract-water-data.sh czech-republic
```

What the scripts do:
- `extract-water-data.sh <slug>` reads `data/source/<slug>-latest.osm.pbf`, runs `osmium tags-filter` with water-related tags, and writes `data/water/<slug>-latest-water.osm.pbf`
- `extract-water-data-all.sh` reads every `*.osm.pbf` file in `data/source/` and runs the single-file script for each Geofabrik `*-latest.osm.pbf` source file

Example output:
- `data/source/austria-latest.osm.pbf` -> `data/water/austria-latest-water.osm.pbf`

## Contributing / Workshop notes

- Keep code simple and readable — this is a learning project.
- Add a comment or README section for any non-obvious step.
- See [AGENTS.md](AGENTS.md) for architecture decisions and coding conventions used by AI agents.
