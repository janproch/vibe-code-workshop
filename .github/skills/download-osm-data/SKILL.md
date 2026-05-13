---
name: download-osm-data
description: "Download OSM PBF map data from Geofabrik (download.geofabrik.de). Use when the user says 'download data from <region/country>', 'get OSM data for <place>', 'fetch geofabrik <country>', or similar. Saves the .osm.pbf file into the data/ directory."
argument-hint: "country or region name (e.g. 'czech republic', 'germany', 'europe/austria')"
---

# Download OSM PBF Data from Geofabrik

## When to Use

Trigger phrases:
- "Download data from \<country\>"
- "Get OSM data for \<region\>"
- "Fetch geofabrik \<place\>"
- "Download \<country\> map data"

## Geofabrik URL Structure

Geofabrik organises downloads by continent → country/region:

| Pattern | Example |
|---------|---------|
| `https://download.geofabrik.de/<continent>/<region>-latest.osm.pbf` | `.../europe/czech-republic-latest.osm.pbf` |
| Index page | `https://download.geofabrik.de/<continent>/<region>.html` |

Common continent slugs: `europe`, `north-america`, `south-america`, `asia`, `africa`, `australia-oceania`, `antarctica`

## Procedure

### Step 1 — Resolve the Geofabrik slug

1. Convert the user's region name to a Geofabrik slug:
   - lowercase, spaces → hyphens, remove accents when possible
   - Examples: "Czech Republic" → `czech-republic`, "United Kingdom" → `great-britain`, "New Zealand" → `new-zealand`
2. Determine the parent continent. If uncertain, fetch the Geofabrik index page `https://download.geofabrik.de/` with `fetch_webpage` to confirm the correct path.
3. Optionally verify the download page exists: fetch `https://download.geofabrik.de/<continent>/<slug>.html` and confirm a `.osm.pbf` link is present.

### Step 2 — Build the download URL

```
https://download.geofabrik.de/<continent>/<slug>-latest.osm.pbf
```

Example for Czech Republic:
```
https://download.geofabrik.de/europe/czech-republic-latest.osm.pbf
```

### Step 3 — Download the file

Run the download command in the terminal, saving into `data/`:

**PowerShell (Windows):**
```powershell
Invoke-WebRequest -Uri "https://download.geofabrik.de/europe/czech-republic-latest.osm.pbf" `
  -OutFile "data/czech-republic-latest.osm.pbf"
```

**bash / macOS / Linux:**
```bash
curl -L -o "data/czech-republic-latest.osm.pbf" \
  "https://download.geofabrik.de/europe/czech-republic-latest.osm.pbf"
```

Replace continent and slug with the resolved values.

### Step 4 — Confirm

After the download completes, confirm the file exists and report its size:

**PowerShell:**
```powershell
Get-Item "data/<slug>-latest.osm.pbf" | Select-Object Name, Length
```

**bash:**
```bash
ls -lh data/<slug>-latest.osm.pbf
```

## Notes

- PBF files for whole countries can be several GB — warn the user if the region is large (e.g. Germany ~4 GB, Europe full ~30 GB).
- Sub-regions (e.g. `europe/germany/bavaria`) are available for large countries. Check `https://download.geofabrik.de/<continent>/<country>.html` for sub-region links if the user specifies a province or state.
- The `data/` directory is relative to the workspace root.
