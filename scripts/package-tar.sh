#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_DIR="$(readlink -f "${KIMI_APP_DIR:-$ROOT_DIR/build/kimi-work}")"
[[ -d "$APP_DIR" ]] || { printf 'Build the app first with pnpm build.\n' >&2; exit 1; }
mkdir -p "$ROOT_DIR/dist"
OUTPUT="$ROOT_DIR/dist/$(basename "$APP_DIR").tar.zst"
[[ ! -e "$OUTPUT" ]] || { printf 'Output already exists: %s\n' "$OUTPUT" >&2; exit 1; }
tar --zstd -cf "$OUTPUT" -C "$(dirname "$APP_DIR")" "$(basename "$APP_DIR")"
printf 'Built %s\n' "$OUTPUT"

