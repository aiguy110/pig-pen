#!/usr/bin/env bash
set -euo pipefail

log() {
    # Prepend timestamp
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"
}

PIGPEN_DIR="$HOME/pig-pen"
TMP_DIR="$HOME/pig-pen-upgrade-tmp"
BACKUP_DIR="$TMP_DIR/backup"
REPO="aiguy110/pig-pen"
ARTIFACT_NAME="pig-pen-linux-x64.zip"
OLD_ARTIFACT="$TMP_DIR/old-$ARTIFACT_NAME"
NEW_ARTIFACT="$TMP_DIR/$ARTIFACT_NAME"
VERSION_FILE="$TMP_DIR/current-version.txt"

mkdir -p "$TMP_DIR"

log "Checking for latest release..."

# Get latest release info including tag and asset URL
RELEASE_INFO=$(curl -s "https://api.github.com/repos/$REPO/releases/latest")
LATEST_TAG=$(echo "$RELEASE_INFO" | jq -r ".tag_name")
ASSET_URL=$(echo "$RELEASE_INFO" | jq -r ".assets[] | select(.name == \"$ARTIFACT_NAME\") | .browser_download_url")
ASSET_ID=$(echo "$RELEASE_INFO" | jq -r ".assets[] | select(.name == \"$ARTIFACT_NAME\") | .id")
ASSET_UPDATED=$(echo "$RELEASE_INFO" | jq -r ".assets[] | select(.name == \"$ARTIFACT_NAME\") | .updated_at")

if [[ -z "$ASSET_URL" || "$ASSET_URL" == "null" ]]; then
  log "Could not find asset $ARTIFACT_NAME"
  exit 1
fi

log "Latest release: $LATEST_TAG (asset updated: $ASSET_UPDATED)"

# Check if we already have this version
if [[ -f "$VERSION_FILE" ]]; then
  CURRENT_VERSION=$(cat "$VERSION_FILE")
  if [[ "$CURRENT_VERSION" == "${LATEST_TAG}_${ASSET_ID}_${ASSET_UPDATED}" ]]; then
    log "Already on latest version $LATEST_TAG. No update needed."
    exit 0
  fi
  log "Current version differs from latest. Update required."
fi

# Download new artifact
log "Downloading new artifact..."
curl -L -o "$NEW_ARTIFACT" "$ASSET_URL"

log "New artifact detected! Updating..."

# Stop pig-pen if running
if pgrep -f "$PIGPEN_DIR/pig-pen" >/dev/null; then
  log "Stopping existing pig-pen process..."
  pkill -f "$PIGPEN_DIR/pig-pen"
  sleep 2
fi

# Backup db and bots
log "Backing up db and bots..."
rm -rf "$BACKUP_DIR"
mkdir -p "$BACKUP_DIR"
[[ -f "$PIGPEN_DIR/pig-pen.db" ]] && mv "$PIGPEN_DIR/pig-pen.db" "$BACKUP_DIR/"
[[ -d "$PIGPEN_DIR/bots" ]] && mv "$PIGPEN_DIR/bots" "$BACKUP_DIR/"

# Clean directory
log "Cleaning $PIGPEN_DIR..."
rm -rf "$PIGPEN_DIR"/*
cd "$PIGPEN_DIR"

# Extract
log "Extracting new artifact..."
unzip -o "$NEW_ARTIFACT" -d "$PIGPEN_DIR"
mv linux/* .

# Restore db and bots
log "Restoring db and bots..."
[[ -f "$BACKUP_DIR/pig-pen.db" ]] && mv "$BACKUP_DIR/pig-pen.db" "$PIGPEN_DIR/"
[[ -d "$BACKUP_DIR/bots" ]] && mv "$BACKUP_DIR/bots" "$PIGPEN_DIR/"

# Start pig-pen
log "Starting pig-pen..."
cd "$PIGPEN_DIR"
chmod +x ./pig-pen
./pig-pen &

# Save version info for next check
echo "${LATEST_TAG}_${ASSET_ID}_${ASSET_UPDATED}" > "$VERSION_FILE"

# Clean up downloaded artifact
rm -f "$NEW_ARTIFACT"

log "Update complete."
