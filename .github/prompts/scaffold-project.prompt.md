---
description: "Scaffold the height map extractor project — creates folder structure, config files, and starter code for the chosen stack"
name: "Scaffold Project"
argument-hint: "Stack to use, e.g. 'React + Node', 'Vanilla JS + Python FastAPI', 'Next.js'"
agent: "agent"
---

Scaffold the height map extractor project described in [AGENTS.md](../../AGENTS.md) for the following stack: $input

## What to create

1. **Folder structure** — `frontend/` and `backend/` (or a combined structure if the stack warrants it).
2. **Package / dependency files** — `package.json`, `requirements.txt`, `pyproject.toml`, etc.
3. **Environment config** — `.env.example` with `GOOGLE_MAPS_API_KEY=` and any other required keys. Add `.env` to `.gitignore`.
4. **Frontend starter**:
   - Leaflet.js map with OpenStreetMap tiles (`https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`).
   - The `leaflet-draw` plugin so the user can drag a rectangle to select a bounding box.
   - A panel that shows the resulting height map image once fetched.
5. **Backend starter**:
   - An endpoint `POST /elevation` accepting `{ north, south, east, west, resolution? }`.
   - Calls the OpenTopoData API (`https://api.opentopodata.org/v1/srtm30m`) to sample a grid.
   - Returns a PNG-encoded height map (min elevation → 0, max → 255).
6. **README.md** — Setup steps: install deps, run dev server. No API key needed.

## Conventions to follow (from AGENTS.md)
- Bounding box fields: `north`, `south`, `east`, `west` (decimal degrees, WGS-84).
- Default grid: 128 × 128 samples.
- No API keys required (all services are free and open).
- Prefer metric units internally.
- Keep code simple and readable for workshop participants.
