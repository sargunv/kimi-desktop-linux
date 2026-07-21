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

## Cursor Cloud specific instructions

Toolchain comes from `mise` (Node 24.15.0, pnpm, dprint, actionlint, hk), not
from the preinstalled `nvm`. `mise` is on the global PATH and activated in
`~/.bashrc` after `nvm`, so a normal login shell resolves the pinned tools
automatically. In a non-login/non-interactive shell, prefix commands with
`mise exec --` (e.g. `mise exec -- pnpm test`) if the tools aren't on PATH.

`pnpm build` needs the `7z` (`p7zip-full`) and `rsync` system packages plus a
C/C++ toolchain and Python (all preinstalled here) to rebuild the daemon's
native modules (`better-sqlite3`, `node-pty`). The build downloads several
hundred MB (Kimi's macOS archive, Electron, Node, Python, uv, WebBridge) from
public endpoints, so it needs network access and takes a few minutes.

Running the app: `pnpm build` writes `build/kimi-work/`; launch it with
`DISPLAY=:1 ./build/kimi-work/start-kimi-work`. It loads kimi.com and reaches
the login screen; signing in requires real Kimi credentials. Under the headless
Xvfb software GL, WebGL is blocklisted and a brief black screen with a white
"loading cube" can appear during navigation — this is a rendering quirk, not a
crash (`kimi-agent:get-status` keeps polling and the login UI returns).

`pnpm build` refuses to overwrite an existing `build/kimi-work-<ver>-linux-x64`;
move the old output aside before rebuilding. `pnpm package` produces a ~430MB
AppImage under `dist/` and rewrites the tracked `latest-linux.yml`; revert that
file unless you actually intend to cut a release.
