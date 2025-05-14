#!/bin/bash
set -e

# CONFIG
ZOOM="5-7"
DAY_DIR="tiles/day"
NIGHT_DIR="tiles/night"
TRANSCODED_FORMAT="ktx2"
MERGED_DAY="merged_day.vrt"
MERGED_NIGHT="merged_night.vrt"
DAY_TILESET_DIR="tileset/day"
NIGHT_TILESET_DIR="tileset/night"
GDAL2TILES="/opt/homebrew/bin/gdal2tiles.py"

# Tools
TOKTX=$(which toktx)
command -v gdalbuildvrt >/dev/null || { echo "❌ gdalbuildvrt not found"; exit 1; }
[ -x "$TOKTX" ] || { echo "❌ toktx not found"; exit 1; }
[ -x "$GDAL2TILES" ] || { echo "❌ gdal2tiles.py not found at $GDAL2TILES"; exit 1; }

# Directories
echo -e "\n📁 Creating folders..."
mkdir -p "$DAY_DIR" "$NIGHT_DIR"

# Bounds lookup
get_bounds_for_tile() {
  local key="$1"
  local col=${key:0:1}
  local row=${key:1:1}
  case "$col" in A) x=0;; B) x=1;; C) x=2;; D) x=3;; *) return 1;; esac
  case "$row" in 1) y=0;; 2) y=1;; *) return 1;; esac
  local lon_min=$(( -180 + x * 90 ))
  local lon_max=$(( lon_min + 90 ))
  local lat_max=$(( 90 - y * 90 ))
  local lat_min=$(( lat_max - 90 ))
  echo "$lon_min $lat_max $lon_max $lat_min"
}

echo -e "\n🌍 Building VRT for Blue Marble PNGs..."
rm -f "$MERGED_DAY"
mkdir -p vrt_tiles/day
VRT_DAY_INPUTS=()

for f in world*.png; do
  base=$(basename "$f" .png)
  key=$(echo "$base" | grep -oE '[A-D][12]$') || continue
  bounds=$(get_bounds_for_tile "$key") || continue
  vrt="vrt_tiles/day/$base.vrt"

  echo "🧭 Creating VRT for $f with bounds $bounds"
  gdal_translate -of VRT \
    -a_ullr $bounds \
    -a_srs EPSG:4326 \
    "$f" "$vrt"

  VRT_DAY_INPUTS+=("$vrt")
done

gdalbuildvrt -a_srs EPSG:4326 "$MERGED_DAY" "${VRT_DAY_INPUTS[@]}"

echo -e "\n🌌 Building VRT for Black Marble JPEGs..."
rm -f "$MERGED_NIGHT"
mkdir -p vrt_tiles/night
VRT_NIGHT_INPUTS=()

for f in BlackMarble_2016_*.jpg; do
  base=$(basename "$f" .jpg)
  key=$(echo "$base" | grep -oE '[A-D][12]$') || continue
  bounds=$(get_bounds_for_tile "$key") || continue
  vrt="vrt_tiles/night/$base.vrt"

  echo "🧭 Creating VRT for $f with bounds $bounds"
  gdal_translate -of VRT \
    -a_ullr $bounds \
    -a_srs EPSG:4326 \
    "$f" "$vrt"

  VRT_NIGHT_INPUTS+=("$vrt")
done

gdalbuildvrt -a_srs EPSG:4326 "$MERGED_NIGHT" "${VRT_NIGHT_INPUTS[@]}"

# Step 1: Generate tiles
echo -e "\n🧱 Tiling $MERGED_DAY → $DAY_DIR ..."
/opt/homebrew/bin/python3 "$GDAL2TILES" -z "$ZOOM" -r bilinear -w none -t "Blue Marble Day" "$MERGED_DAY" "$DAY_DIR"

echo -e "\n🧱 Tiling $MERGED_NIGHT → $NIGHT_DIR ..."
/opt/homebrew/bin/python3 "$GDAL2TILES" -z "$ZOOM" -r bilinear -w none -t "Black Marble Night" "$MERGED_NIGHT" "$NIGHT_DIR"

# Step 2: Compress to .ktx2
compress_to_ktx2() {
  local DIR="$1"
  echo -e "\n🎛️ Compressing $DIR ..."
  find "$DIR" -type f -name "*.png" -print0 | while IFS= read -r -d '' file; do
    local output="${file%.*}.$TRANSCODED_FORMAT"
    [ -f "$output" ] && echo "✅ Skipping $output" && continue
    echo "🧊 Compressing $file → $output"
    "$TOKTX" --encode uastc --zcmp 19 --genmipmap "$output" "$file" >/dev/null || {
      echo "❌ Failed to compress $file"
    }
  done
}
compress_to_ktx2 "$DAY_DIR"
compress_to_ktx2 "$NIGHT_DIR"

# Remove source PNGs after compression to KTX2
echo -e "\n🧽 Cleaning up original .png tiles..."
find "$DAY_DIR" -type f -name "*.png" -delete
find "$NIGHT_DIR" -type f -name "*.png" -delete

# Cleanup
echo -e "\n🧼 Cleaning up temporary VRT files..."
rm -f "$MERGED_DAY" "$MERGED_NIGHT"
rm -rf vrt_tiles

# Done
echo -e "\n✅ 3D Tilesets ready for 3DTilesRendererJS:"
echo "   📁 $DAY_TILESET_DIR"
echo "   📁 $NIGHT_TILESET_DIR"
