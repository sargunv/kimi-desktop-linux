# Kimi Work Linux repackaging

This repository creates a Linux package from user-supplied official Windows and
macOS Kimi Work installers. Never commit or redistribute Kimi's proprietary
installers or extracted payloads.

## Commands

- `mise install && pnpm install --frozen-lockfile`: install project tools.
- `pnpm build`: assemble a runnable Linux x86_64 application under `build/`.
- `pnpm test`: run static and patcher tests.
- `pnpm package:tar`: create a portable tarball.
- `pnpm package:appimage`: create an AppImage (requires `appimagetool`).

Use `apply_patch` for source edits. Keep platform patches narrow, asserted, and
documented in `scripts/patch-asar.mjs`; a changed upstream bundle must fail
closed rather than silently producing an unpatched application.
