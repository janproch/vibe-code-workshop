# Vibe Coding Workshop — Height Map Extractor

A workshop project that lets users draw a rectangle on an OpenStreetMap view and extract an elevation/height map for that geographic area.

## Project Goal

1. User selects a rectangular area on an OpenStreetMap map (drag to draw bounds).
2. The app fetches elevation data for that bounding box.
3. The data is visualized and optionally exported as a height map (PNG / GeoTIFF).

## Architecture

| Layer | Responsibility |
|-------|---------------|
| Frontend | OpenStreetMap rectangle selection UI, height map visualization |
| Backend / API | Receives bounding box, fetches & grids elevation data, returns height map |
| Elevation source | OpenTopoData (SRTM 30 m, free & no key required) |

Keep frontend and backend concerns separate. If the project grows, put them in `frontend/` and `backend/` subdirectories.

## Key APIs & Services

- **Leaflet.js** — map rendering + rectangle draw control (`L.Rectangle` / `leaflet-draw` plugin) for selection; no API key needed
- **OpenTopoData** (`https://api.opentopodata.org/v1/srtm30m`) — elevation samples over a grid (SRTM 30 m), free, no key required
- OpenStreetMap tiles served from `https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png` — no API key needed
- No secret keys required; remove the `.env` setup if no other keys are needed.

## Build & Test

> Commands will be added once the stack is chosen (Node/Python/etc.). Update this section when scaffolding is done.

## Conventions

- Bounding boxes are always `{ north, south, east, west }` in decimal degrees (WGS-84).
- Height map grid resolution defaults to **128 × 128** samples; allow the user to override.
- Exported PNG: pixel brightness encodes elevation (0 = min, 255 = max in the selected area).
- All coordinates and elevation values should be validated at the API boundary (reject out-of-range lat/lon).
- Prefer metric units (metres) internally; convert for display only.

## README

Keep [README.md](README.md) up to date whenever you:
- Add, rename, or remove a build/run command → update the **Setup** section.
- Add a new endpoint or change the request/response shape → update **API reference**.
- Change the folder structure → update **Project structure**.
- Add a significant dependency or change a key service → update **Tech stack**.

Do not duplicate content between README.md and AGENTS.md — README is user-facing, AGENTS.md is agent-facing.

## Workshop Notes

- This is a **learning/demo** project — favour clarity and simplicity over production-grade complexity.
- Use the smallest viable dependency set so participants can follow along easily.
- Document any non-obvious step (API key setup, CORS config, etc.) with a comment or README section.
