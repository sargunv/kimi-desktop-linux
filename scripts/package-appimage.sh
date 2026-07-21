#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_DIR="$(readlink -f "${KIMI_APP_DIR:-$ROOT_DIR/build/kimi-work}")"
APPIMAGETOOL="${APPIMAGETOOL:-$(command -v appimagetool || true)}"
[[ -d "$APP_DIR" ]] || { printf 'Build the app first with pnpm build.\n' >&2; exit 1; }
[[ -x "$APPIMAGETOOL" ]] || { printf 'Install appimagetool or set APPIMAGETOOL=/path/to/appimagetool.\n' >&2; exit 1; }

VERSION="$(basename "$APP_DIR" | sed -n 's/^kimi-work-\(.*\)-linux-x64$/\1/p')"
[[ -n "$VERSION" ]] || { printf 'Cannot parse version from %s\n' "$APP_DIR" >&2; exit 1; }
APPIMAGE_WORK="$(mktemp -d "${TMPDIR:-/tmp}/kimi-appimage.XXXXXXXX")"
trap 'rm -rf -- "$APPIMAGE_WORK"' EXIT
APPDIR="$APPIMAGE_WORK/Kimi_Work.AppDir"
mkdir -p "$APPDIR/opt/kimi-work" "$APPDIR/usr/share/applications" "$APPDIR/usr/share/icons/hicolor/256x256/apps" "$ROOT_DIR/dist"
rsync -a "$APP_DIR/" "$APPDIR/opt/kimi-work/"
cp "$ROOT_DIR/packaging/appimage/AppRun" "$APPDIR/AppRun"
cp "$ROOT_DIR/packaging/appimage/kimi-work.desktop" "$APPDIR/kimi-work.desktop"
cp "$ROOT_DIR/packaging/appimage/kimi-work.desktop" "$APPDIR/usr/share/applications/kimi-work.desktop"
cp "$APP_DIR/kimi-work.png" "$APPDIR/kimi-work.png"
cp "$APP_DIR/kimi-work.png" "$APPDIR/.DirIcon"
cp "$APP_DIR/kimi-work.png" "$APPDIR/usr/share/icons/hicolor/256x256/apps/kimi-work.png"
chmod 0755 "$APPDIR/AppRun"

OUTPUT="$ROOT_DIR/dist/kimi-work-$VERSION-x86_64.AppImage"
[[ ! -e "$OUTPUT" ]] || { printf 'Output already exists: %s\n' "$OUTPUT" >&2; exit 1; }
ARCH=x86_64 VERSION="$VERSION" "$APPIMAGETOOL" --no-appstream "$APPDIR" "$OUTPUT"
chmod 0755 "$OUTPUT"
printf 'Built %s\n' "$OUTPUT"

