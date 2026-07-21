#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CACHE_DIR="${KIMI_CACHE_DIR:-$ROOT_DIR/.cache/downloads}"
BUILD_DIR="${KIMI_BUILD_DIR:-$ROOT_DIR/build}"
WINDOWS_INSTALLER="${WINDOWS_INSTALLER:-}"
MACOS_INSTALLER="${MACOS_INSTALLER:-}"

info() { printf '[kimi-linux] %s\n' "$*" >&2; }
die() { printf '[kimi-linux] error: %s\n' "$*" >&2; exit 1; }
require() { command -v "$1" >/dev/null 2>&1 || die "missing required command: $1"; }

find_one() {
  local pattern="$1"
  local label="$2"
  local -a matches=()
  while IFS= read -r -d '' file; do matches+=("$file"); done < <(find "$ROOT_DIR/original" -maxdepth 1 -type f -name "$pattern" -print0)
  ((${#matches[@]} == 1)) || die "expected one $label in original/, found ${#matches[@]}"
  printf '%s\n' "${matches[0]}"
}

download() {
  local url="$1"
  local output="$2"
  if [[ ! -s "$output" ]]; then
    info "Downloading $(basename "$output")"
    mkdir -p "$(dirname "$output")"
    curl --fail --location --retry 3 --output "$output.part" "$url"
    mv "$output.part" "$output"
  fi
}

verify_sha256() {
  local file="$1"
  local expected="$2"
  local actual
  actual="$(sha256sum "$file" | awk '{print $1}')"
  [[ "$actual" == "$expected" ]] || die "checksum mismatch for $(basename "$file"): expected $expected, got $actual"
}

extract_7z() {
  local archive="$1"
  local output="$2"
  shift 2
  local status
  mkdir -p "$output"
  set +e
  7z x -y "-o$output" "$archive" "$@" >/dev/null
  status=$?
  set -e
  ((status <= 1)) || die "7z failed with status $status while extracting $(basename "$archive")"
}

for tool in 7z awk curl find node npm pnpm rsync sha256sum strings tar unzip xz; do require "$tool"; done
[[ "$(uname -m)" == "x86_64" ]] || die "this first implementation targets Linux x86_64"

[[ -n "$WINDOWS_INSTALLER" ]] || WINDOWS_INSTALLER="$(find_one '*.exe' 'Windows installer')"
[[ -n "$MACOS_INSTALLER" ]] || MACOS_INSTALLER="$(find_one '*.dmg' 'macOS installer')"
[[ -f "$WINDOWS_INSTALLER" ]] || die "Windows installer does not exist: $WINDOWS_INSTALLER"
[[ -f "$MACOS_INSTALLER" ]] || die "macOS installer does not exist: $MACOS_INSTALLER"

WORK_DIR="$(mktemp -d "${TMPDIR:-/tmp}/kimi-linux-build.XXXXXXXX")"
trap 'rm -rf -- "$WORK_DIR"' EXIT

info "Extracting the Windows installer"
extract_7z "$WINDOWS_INSTALLER" "$WORK_DIR/windows-installer"
WINDOWS_PAYLOAD="$(find "$WORK_DIR/windows-installer" -type f -name 'app-64.7z' -print -quit)"
[[ -n "$WINDOWS_PAYLOAD" ]] || die "Windows installer has no app-64.7z payload"
extract_7z "$WINDOWS_PAYLOAD" "$WORK_DIR/windows-app"
WINDOWS_ASAR="$WORK_DIR/windows-app/resources/app.asar"
WINDOWS_EXE="$WORK_DIR/windows-app/Kimi.exe"
[[ -f "$WINDOWS_ASAR" && -f "$WINDOWS_EXE" ]] || die "Windows application payload is incomplete"

info "Extracting the macOS installer"
# Gateway dependencies are reinstalled below. Excluding them also avoids 7-Zip
# rejecting npm's relative node_modules/.bin links while reading the DMG.
extract_7z "$MACOS_INSTALLER" "$WORK_DIR/macos-installer" '-xr!*/resources/gateway/node_modules/*'
MAC_ASAR="$(find "$WORK_DIR/macos-installer" -path '*/Kimi.app/Contents/Resources/app.asar' -print -quit)"
[[ -n "$MAC_ASAR" ]] || die "macOS installer has no embedded Kimi.app"
MAC_RESOURCES="$(dirname "$MAC_ASAR")"
MAC_RUNTIME="$MAC_RESOURCES/resources/runtime"
MAC_DAIMON="$MAC_RESOURCES/resources/daimon-bundle"
MAC_GATEWAY="$MAC_RESOURCES/resources/gateway"
[[ -d "$MAC_RUNTIME" && -d "$MAC_DAIMON" && -d "$MAC_GATEWAY" ]] || die "macOS workspace resources are incomplete"

ELECTRON_VERSION="$(strings "$WINDOWS_EXE" | sed -n 's/.*Electron v\([0-9][0-9.]*\).*/\1/p' | head -1)"
NODE_VERSION="$(sed 's/-darwin-arm64$//' "$MAC_RUNTIME/.node-stamp" | head -1)"
APP_VERSION="$(node -e 'const a=require("@electron/asar"); console.log(JSON.parse(a.extractFile(process.argv[1], "package.json")).version)' "$WINDOWS_ASAR")"
[[ -n "$ELECTRON_VERSION" && -n "$NODE_VERSION" && -n "$APP_VERSION" ]] || die "failed to detect bundled versions"
info "Kimi $APP_VERSION; Electron $ELECTRON_VERSION; Node $NODE_VERSION"

ELECTRON_ARCHIVE="electron-v$ELECTRON_VERSION-linux-x64.zip"
ELECTRON_BASE="https://github.com/electron/electron/releases/download/v$ELECTRON_VERSION"
download "$ELECTRON_BASE/$ELECTRON_ARCHIVE" "$CACHE_DIR/$ELECTRON_ARCHIVE"
download "$ELECTRON_BASE/SHASUMS256.txt" "$CACHE_DIR/electron-$ELECTRON_VERSION-SHASUMS256.txt"
ELECTRON_SHA="$(awk -v file="$ELECTRON_ARCHIVE" '{ name=$2; sub(/^\*/, "", name); if (name == file) print $1 }' "$CACHE_DIR/electron-$ELECTRON_VERSION-SHASUMS256.txt")"
[[ -n "$ELECTRON_SHA" ]] || die "Electron checksum manifest has no $ELECTRON_ARCHIVE"
verify_sha256 "$CACHE_DIR/$ELECTRON_ARCHIVE" "$ELECTRON_SHA"

NODE_ARCHIVE="node-v$NODE_VERSION-linux-x64.tar.xz"
NODE_BASE="https://nodejs.org/download/release/v$NODE_VERSION"
download "$NODE_BASE/$NODE_ARCHIVE" "$CACHE_DIR/$NODE_ARCHIVE"
download "$NODE_BASE/SHASUMS256.txt" "$CACHE_DIR/node-$NODE_VERSION-SHASUMS256.txt"
NODE_SHA="$(awk -v file="$NODE_ARCHIVE" '{ name=$2; sub(/^\*/, "", name); if (name == file) print $1 }' "$CACHE_DIR/node-$NODE_VERSION-SHASUMS256.txt")"
[[ -n "$NODE_SHA" ]] || die "Node checksum manifest has no $NODE_ARCHIVE"
verify_sha256 "$CACHE_DIR/$NODE_ARCHIVE" "$NODE_SHA"

PYTHON_ASSET="cpython-3.12.13+20260623-x86_64-unknown-linux-gnu-install_only.tar.gz"
PYTHON_SHA="9fa869d69be54f6b8eeae64272fbd9bb0646e0e1a8da9d80e51ba5a3bee48930"
PYTHON_URL="https://github.com/astral-sh/python-build-standalone/releases/download/20260623/cpython-3.12.13%2B20260623-x86_64-unknown-linux-gnu-install_only.tar.gz"
download "$PYTHON_URL" "$CACHE_DIR/$PYTHON_ASSET"
verify_sha256 "$CACHE_DIR/$PYTHON_ASSET" "$PYTHON_SHA"

UV_VERSION="0.11.29"
UV_ARCHIVE="uv-x86_64-unknown-linux-gnu.tar.gz"
UV_BASE="https://github.com/astral-sh/uv/releases/download/$UV_VERSION"
download "$UV_BASE/$UV_ARCHIVE" "$CACHE_DIR/uv-$UV_VERSION-$UV_ARCHIVE"
download "$UV_BASE/$UV_ARCHIVE.sha256" "$CACHE_DIR/uv-$UV_VERSION.sha256"
UV_SHA="$(awk '{print $1; exit}' "$CACHE_DIR/uv-$UV_VERSION.sha256")"
verify_sha256 "$CACHE_DIR/uv-$UV_VERSION-$UV_ARCHIVE" "$UV_SHA"

WEBBRIDGE_MANIFEST="$CACHE_DIR/kimi-webbridge-version.json"
download 'https://cdn.kimi.com/webbridge/latest/version.json' "$WEBBRIDGE_MANIFEST"
readarray -t WEBBRIDGE < <(node -e 'const m=require(process.argv[1]); const b=m.binaries["linux-amd64"]; console.log(m.version); console.log(b.url); console.log(b.sha256)' "$WEBBRIDGE_MANIFEST")
WEBBRIDGE_VERSION="${WEBBRIDGE[0]}"
WEBBRIDGE_URL="${WEBBRIDGE[1]}"
WEBBRIDGE_SHA="${WEBBRIDGE[2]}"
WEBBRIDGE_FILE="kimi-webbridge-$WEBBRIDGE_VERSION-linux-amd64"
download "$WEBBRIDGE_URL" "$CACHE_DIR/$WEBBRIDGE_FILE"
verify_sha256 "$CACHE_DIR/$WEBBRIDGE_FILE" "$WEBBRIDGE_SHA"

STAGE_DIR="$WORK_DIR/kimi-work-$APP_VERSION-linux-x64"
mkdir -p "$STAGE_DIR/resources/resources"
unzip -q "$CACHE_DIR/$ELECTRON_ARCHIVE" -d "$STAGE_DIR"
mv "$STAGE_DIR/electron" "$STAGE_DIR/kimi-work"

info "Patching the application for Linux window management and updates"
node "$ROOT_DIR/scripts/patch-asar.mjs" "$WINDOWS_ASAR" "$STAGE_DIR/resources/app.asar" "$STAGE_DIR/kimi-work.png"

info "Staging the matching Linux Node runtime"
mkdir -p "$WORK_DIR/node" "$STAGE_DIR/resources/resources/runtime"
tar -xJf "$CACHE_DIR/$NODE_ARCHIVE" -C "$WORK_DIR/node" --strip-components=1
rsync -a --exclude='*:com.apple.*' --exclude='node' "$MAC_RUNTIME/" "$STAGE_DIR/resources/resources/runtime/"
cp "$WORK_DIR/node/bin/node" "$STAGE_DIR/resources/resources/runtime/node"
chmod 0755 "$STAGE_DIR/resources/resources/runtime/node"
printf '%s\n' "$NODE_VERSION-linux-x64" > "$STAGE_DIR/resources/resources/runtime/.node-stamp"

info "Installing Linux gateway dependencies"
rsync -a --exclude='*:com.apple.*' --exclude='node_modules' "$MAC_GATEWAY/" "$STAGE_DIR/resources/resources/gateway/"
node "$ROOT_DIR/scripts/prepare-gateway.mjs" "$STAGE_DIR/resources/resources/gateway"
(
  cd "$STAGE_DIR/resources/resources/gateway"
  PATH="$WORK_DIR/node/bin:$PATH" npm install --omit=dev --foreground-scripts --package-lock=false
)

info "Rebuilding the workspace daemon's native modules"
rsync -a --exclude='*:com.apple.*' --exclude='runtime/python/***' --exclude='runtime/uv/***' "$MAC_DAIMON/" "$STAGE_DIR/resources/resources/daimon-bundle/"
DAIMON_DIR="$STAGE_DIR/resources/resources/daimon-bundle"
mkdir -p "$DAIMON_DIR/runtime/python/cpython-3.12" "$DAIMON_DIR/runtime/uv" "$WORK_DIR/uv"
tar -xzf "$CACHE_DIR/$PYTHON_ASSET" -C "$DAIMON_DIR/runtime/python/cpython-3.12" --strip-components=1
tar -xzf "$CACHE_DIR/uv-$UV_VERSION-$UV_ARCHIVE" -C "$WORK_DIR/uv"
cp "$(find "$WORK_DIR/uv" -type f -name uv -print -quit)" "$DAIMON_DIR/runtime/uv/uv"
chmod 0755 "$DAIMON_DIR/runtime/uv/uv"
node "$ROOT_DIR/scripts/patch-daimon-metadata.mjs" "$DAIMON_DIR/bundle.json" "$PYTHON_ASSET" "$PYTHON_SHA"
(
  cd "$DAIMON_DIR/app/daimon"
  PATH="$WORK_DIR/node/bin:$PATH" npm rebuild better-sqlite3 node-pty --foreground-scripts
)

cp "$CACHE_DIR/$WEBBRIDGE_FILE" "$STAGE_DIR/resources/resources/kimi-webbridge"
chmod 0755 "$STAGE_DIR/resources/resources/kimi-webbridge"
cp "$ROOT_DIR/launcher/kimi-work" "$STAGE_DIR/start-kimi-work"
chmod 0755 "$STAGE_DIR/start-kimi-work" "$STAGE_DIR/kimi-work"

node -e 'const sqlite=require(process.argv[1]); const db=new sqlite(":memory:"); if(db.prepare("select 42 as n").get().n!==42) process.exit(1)' "$DAIMON_DIR/app/daimon/node_modules/better-sqlite3"
PATH="$WORK_DIR/node/bin:$PATH" node -e 'require(process.argv[1])' "$DAIMON_DIR/app/daimon/node_modules/node-pty"

mkdir -p "$BUILD_DIR"
FINAL_DIR="$BUILD_DIR/kimi-work-$APP_VERSION-linux-x64"
[[ ! -e "$FINAL_DIR" ]] || die "output already exists: $FINAL_DIR (move it aside before rebuilding)"
mv "$STAGE_DIR" "$FINAL_DIR"
ln -sfn "$(basename "$FINAL_DIR")" "$BUILD_DIR/kimi-work"
info "Built $FINAL_DIR"
info "Run: $BUILD_DIR/kimi-work/start-kimi-work"
