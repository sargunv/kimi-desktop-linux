# Kimi Work Linux repackaging

This repository creates an unofficial Linux AppImage from Kimi's latest official
macOS update. Never commit Kimi's proprietary archive, extracted application, or
built AppImage.

## Commands

- `mise install && pnpm install --frozen-lockfile`: install project tools.
- `pnpm build`: assemble the runnable Linux x86_64 app under `build/`.
- `pnpm package`: produce the AppImage and `latest-linux.yml`.
- `pnpm test`: run formatting, syntax, and patcher tests.

Use `apply_patch` for source edits. Keep platform patches narrow and asserted in
`scripts/patch-asar.mjs`; changed upstream code must fail closed.
