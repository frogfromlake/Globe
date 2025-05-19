#!/bin/bash

log() {
  echo "$(date '+%Y-%m-%d %H:%M:%S') $*" | tee -a "$LOG_DIR/tile_prefill.log"
}

log "🚀 Starting tile prefill script..."

# === FLAGS ===
IS_TEST=0
if [[ "$1" == "--test" ]]; then
  IS_TEST=1
fi

# === PATHS ===
if [[ $IS_TEST -eq 1 ]]; then
  BASE_DIR="./test_tiles"
  LOG_DIR="./test_logs"
  ZOOM_START=5
  ZOOM_END=5
else
  BASE_DIR="/data/tiles"
  LOG_DIR="/data/logs"
  ZOOM_START=0
  ZOOM_END=8
fi

mkdir -p "$LOG_DIR"

# === CONFIG ===
MAX_RETRIES=8
RETRY_BASE_DELAY=3  # seconds
BATCH_SLEEP_EVERY=500
BATCH_SLEEP_SECONDS=5
TEMPLATE_URL="https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2024_3857/default/GoogleMapsCompatible"
CONCURRENT_FETCHES=20

# === SAFETY CHECK: Abort if any Z0–Z8 tiles already exist (unless in test mode) ===
ALLOW_EXISTING=0
if [[ "$1" == "--allow-existing" ]]; then
  ALLOW_EXISTING=1
fi

if [[ $IS_TEST -eq 0 && $ALLOW_EXISTING -eq 0 ]]; then
  for ((z=ZOOM_START; z<=ZOOM_END; z++)); do
    if compgen -G "$BASE_DIR/$z/*.jpg" > /dev/null; then
      log "❌ ABORTED: Existing tiles detected in Z$z. Use --allow-existing if you really intend to continue."
      exit 1
    fi
  done
fi

fetch_tile() {
  local z=$1 x=$2 y=$3
  local url="${TEMPLATE_URL}/${z}/${x}/${y}.jpg"
  local tile_path="${BASE_DIR}/${z}/${x}/${y}.jpg"

  # === CRITICAL SAFETY: never overwrite existing tile ===
  if [[ -f "$tile_path" ]]; then
    log "🛑 Skipped existing $z/$x/$y"
    return
  fi

  mkdir -p "$(dirname "$tile_path")"

  for ((attempt=1; attempt<=MAX_RETRIES; attempt++)); do
    http_code=$(curl -s -o "$tile_path" -w "%{http_code}" --connect-timeout 15 --max-time 30 "$url")

    if [[ "$http_code" == "200" ]]; then
      log "✅ Saved $z/$x/$y"
      return
    elif [[ "$http_code" == "403" || "$http_code" == "429" ]]; then
      delay=$((RETRY_BASE_DELAY * attempt + RANDOM % 2))
      log "🛑 Rate limited $z/$x/$y — HTTP $http_code, retrying in ${delay}s..."
      sleep $delay
    else
      log "⚠️  Skipped $z/$x/$y — HTTP $http_code"
      return
    fi
  done

  log "❌ Failed $z/$x/$y after $MAX_RETRIES retries"
}

# === MAIN LOOP ===
count=0
for ((z=ZOOM_START; z<=ZOOM_END; z++)); do
  max_tile=$((2 ** z))
  for ((x=0; x<max_tile; x++)); do
    for ((y=0; y<max_tile; y++)); do
      fetch_tile "$z" "$x" "$y" &
      ((count++))

      if (( count % CONCURRENT_FETCHES == 0 )); then
        wait  # throttle to CONCURRENT_FETCHES
      fi

      if (( count % BATCH_SLEEP_EVERY == 0 )); then
        log "⏳ Pausing for $BATCH_SLEEP_SECONDS seconds to reduce pressure..."
        sleep $BATCH_SLEEP_SECONDS
      fi
    done
  done
done

wait
log "🟡 Prefill complete. Sleeping to keep container alive..."
sleep infinity
