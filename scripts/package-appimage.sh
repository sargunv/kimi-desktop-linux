#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_DIR="$(readlink -f "${KIMI_APP_DIR:-$ROOT_DIR/build/kimi-work}")"
[[ -d "$APP_DIR" ]] || { printf 'Build the app first with pnpm build.\n' >&2; exit 1; }

HOST_ARCH="$(uname -m)"
case "$HOST_ARCH" in
  x86_64)
    APPIMAGE_ARCH=x86_64
    APPIMAGETOOL_NAME=appimagetool-x86_64.AppImage
    APPIMAGETOOL_SHA256=ed4ce84f0d9caff66f50bcca6ff6f35aae54ce8135408b3fa33abfc3cb384eb0
    RUNTIME_NAME=runtime-x86_64
    RUNTIME_SHA256=2fca8b443c92510f1483a883f60061ad09b46b978b2631c807cd873a47ec260d
    STAGE_ARCH=linux-x64
    UPDATE_MANIFEST="$ROOT_DIR/latest-linux.yml"
    ;;
  aarch64)
    APPIMAGE_ARCH=aarch64
    APPIMAGETOOL_NAME=appimagetool-aarch64.AppImage
    APPIMAGETOOL_SHA256=f0837e7448a0c1e4e650a93bb3e85802546e60654ef287576f46c71c126a9158
    RUNTIME_NAME=runtime-aarch64
    RUNTIME_SHA256=00cbdfcf917cc6c0ff6d3347d59e0ca1f7f45a6df1a428a0d6d8a78664d87444
    STAGE_ARCH=linux-arm64
    # electron-updater requests latest-linux-arm64.yml for process.arch === "arm64"
    UPDATE_MANIFEST="$ROOT_DIR/latest-linux-arm64.yml"
    ;;
  *)
    printf 'only Linux x86_64 and aarch64 are supported (got %s)\n' "$HOST_ARCH" >&2
    exit 1
    ;;
esac

APPIMAGETOOL="${APPIMAGETOOL:-}"
if [[ -z "$APPIMAGETOOL" ]]; then
  APPIMAGETOOL="$ROOT_DIR/.cache/downloads/appimagetool-1.9.1-$APPIMAGE_ARCH.AppImage"
  if [[ ! -s "$APPIMAGETOOL" ]]; then
    mkdir -p "$(dirname "$APPIMAGETOOL")"
    curl --fail --location --retry 3 \
      --output "$APPIMAGETOOL.part" \
      "https://github.com/AppImage/appimagetool/releases/download/1.9.1/$APPIMAGETOOL_NAME"
    mv "$APPIMAGETOOL.part" "$APPIMAGETOOL"
  fi
  ACTUAL="$(sha256sum "$APPIMAGETOOL" | awk '{print $1}')"
  [[ "$ACTUAL" == "$APPIMAGETOOL_SHA256" ]] || { printf 'appimagetool checksum mismatch.\n' >&2; exit 1; }
  chmod 0755 "$APPIMAGETOOL"
  APPIMAGETOOL_ARGS=(--appimage-extract-and-run)
else
  APPIMAGETOOL_ARGS=()
fi
[[ -x "$APPIMAGETOOL" ]] || { printf 'APPIMAGETOOL is not executable: %s\n' "$APPIMAGETOOL" >&2; exit 1; }

RUNTIME="$ROOT_DIR/.cache/downloads/appimage-runtime-20251108-$APPIMAGE_ARCH"
if [[ ! -s "$RUNTIME" ]]; then
  curl --fail --location --retry 3 \
    --output "$RUNTIME.part" \
    "https://github.com/AppImage/type2-runtime/releases/download/20251108/$RUNTIME_NAME"
  mv "$RUNTIME.part" "$RUNTIME"
fi
ACTUAL_RUNTIME="$(sha256sum "$RUNTIME" | awk '{print $1}')"
[[ "$ACTUAL_RUNTIME" == "$RUNTIME_SHA256" ]] || { printf 'AppImage runtime checksum mismatch.\n' >&2; exit 1; }

VERSION="$(basename "$APP_DIR" | sed -n "s/^kimi-work-\(.*\)-$STAGE_ARCH\$/\\1/p")"
[[ -n "$VERSION" ]] || { printf 'Cannot parse version from %s (expected kimi-work-*-%s)\n' "$APP_DIR" "$STAGE_ARCH" >&2; exit 1; }
APPIMAGE_WORK="$(mktemp -d "${TMPDIR:-/tmp}/kimi-appimage.XXXXXXXX")"
trap 'rm -rf -- "$APPIMAGE_WORK"' EXIT
APPDIR="$APPIMAGE_WORK/Kimi_Work.AppDir"
mkdir -p "$APPDIR/opt/kimi-work" "$APPDIR/usr/share/applications" "$APPDIR/usr/share/icons/hicolor/256x256/apps" "$ROOT_DIR/dist"
rsync -a "$APP_DIR/" "$APPDIR/opt/kimi-work/"
if [[ -n "${KIMI_UPDATE_URL:-}" ]]; then
  [[ "$KIMI_UPDATE_URL" == https://* ]] || { printf 'KIMI_UPDATE_URL must use HTTPS.\n' >&2; exit 1; }
  printf '%s\n' "$KIMI_UPDATE_URL" > "$APPDIR/opt/kimi-work/update-url"
fi
cp "$ROOT_DIR/packaging/appimage/AppRun" "$APPDIR/AppRun"
cp "$ROOT_DIR/packaging/appimage/kimi-work.desktop" "$APPDIR/kimi-work.desktop"
cp "$ROOT_DIR/packaging/appimage/kimi-work.desktop" "$APPDIR/usr/share/applications/kimi-work.desktop"
cp "$APP_DIR/kimi-work.png" "$APPDIR/kimi-work.png"
cp "$APP_DIR/kimi-work.png" "$APPDIR/.DirIcon"
cp "$APP_DIR/kimi-work.png" "$APPDIR/usr/share/icons/hicolor/256x256/apps/kimi-work.png"
chmod 0755 "$APPDIR/AppRun"

OUTPUT="$ROOT_DIR/dist/kimi-work-$VERSION-$APPIMAGE_ARCH.AppImage"
[[ ! -e "$OUTPUT" ]] || { printf 'Output already exists: %s\n' "$OUTPUT" >&2; exit 1; }
ARCH="$APPIMAGE_ARCH" VERSION="$VERSION" "$APPIMAGETOOL" "${APPIMAGETOOL_ARGS[@]}" \
  --no-appstream --runtime-file "$RUNTIME" "$APPDIR" "$OUTPUT"
chmod 0755 "$OUTPUT"
MANIFEST_OUT="${KIMI_UPDATE_MANIFEST:-$UPDATE_MANIFEST}"
node "$ROOT_DIR/scripts/write-update-manifest.mjs" "$OUTPUT" "$VERSION" "$MANIFEST_OUT"
printf 'Built %s\n' "$OUTPUT"
printf 'Wrote %s\n' "$MANIFEST_OUT"
