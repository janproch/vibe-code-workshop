#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
SOURCE_DIR="$ROOT_DIR/data/source"
OUTPUT_DIR="$ROOT_DIR/data/water"

if ! command -v osmium >/dev/null 2>&1; then
  echo "Error: osmium is not installed or not in PATH." >&2
  echo "Install osmium-tool first: https://osmcode.org/osmium-tool/" >&2
  exit 1
fi

if [[ ! -d "$SOURCE_DIR" ]]; then
  echo "Error: source directory not found: $SOURCE_DIR" >&2
  exit 1
fi

mkdir -p "$OUTPUT_DIR"

shopt -s nullglob
source_files=("$SOURCE_DIR"/*.osm.pbf)

if (( ${#source_files[@]} == 0 )); then
  echo "No .osm.pbf files found in $SOURCE_DIR"
  exit 0
fi

for input_file in "${source_files[@]}"; do
  file_name="$(basename "$input_file")"
  base_name="${file_name%.osm.pbf}"
  output_file="$OUTPUT_DIR/${base_name}-water.osm.pbf"

  echo "Extracting water features: $file_name"
  osmium tags-filter "$input_file" \
    nwr/natural=water \
    nwr/water \
    nwr/waterway \
    nwr/landuse=reservoir \
    nwr/natural=wetland \
    -o "$output_file" \
    --overwrite

  echo "Saved: $output_file"
done

echo "Done. Water extracts are in $OUTPUT_DIR"