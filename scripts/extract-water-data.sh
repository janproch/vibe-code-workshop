#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
SOURCE_DIR="$ROOT_DIR/data/source"
OUTPUT_DIR="$ROOT_DIR/data/water"

usage() {
  echo "Usage: $(basename "$0") <slug>" >&2
  echo "Example: $(basename "$0") czech-republic" >&2
}

if (( $# != 1 )); then
  usage
  exit 1
fi

slug="$1"
input_file="$SOURCE_DIR/${slug}-latest.osm.pbf"
output_file="$OUTPUT_DIR/${slug}-latest-water.osm.pbf"

if ! command -v osmium >/dev/null 2>&1; then
  echo "Error: osmium is not installed or not in PATH." >&2
  echo "Install osmium-tool first: https://osmcode.org/osmium-tool/" >&2
  exit 1
fi

if [[ ! -d "$SOURCE_DIR" ]]; then
  echo "Error: source directory not found: $SOURCE_DIR" >&2
  exit 1
fi

if [[ ! -f "$input_file" ]]; then
  echo "Error: source file not found: $input_file" >&2
  exit 1
fi

mkdir -p "$OUTPUT_DIR"

echo "Extracting water features: $(basename "$input_file")"
osmium tags-filter "$input_file" \
  nwr/natural=water \
  nwr/water \
  nwr/waterway \
  nwr/landuse=reservoir \
  nwr/natural=wetland \
  -o "$output_file" \
  --overwrite

echo "Saved: $output_file"