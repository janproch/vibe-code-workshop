#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
SOURCE_DIR="$ROOT_DIR/data/source"

if [[ ! -d "$SOURCE_DIR" ]]; then
  echo "Error: source directory not found: $SOURCE_DIR" >&2
  exit 1
fi

shopt -s nullglob
source_files=("$SOURCE_DIR"/*.osm.pbf)

if (( ${#source_files[@]} == 0 )); then
  echo "No .osm.pbf files found in $SOURCE_DIR"
  exit 0
fi

processed=0
skipped=0

for input_file in "${source_files[@]}"; do
  file_name="$(basename "$input_file")"

  if [[ "$file_name" != *-latest.osm.pbf ]]; then
    echo "Skipping unsupported filename pattern: $file_name"
    skipped=$((skipped + 1))
    continue
  fi

  slug="${file_name%-latest.osm.pbf}"
  bash "$SCRIPT_DIR/extract-water-data.sh" "$slug"
  processed=$((processed + 1))
done

echo "Done. Processed $processed file(s). Skipped $skipped file(s)."
