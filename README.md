# Kimi Work for Linux

`kimi-desktop-linux` is an experimental, community Linux repackager for Kimi
Work. It downloads Kimi's latest official macOS update, verifies the published
SHA-512 checksum, swaps in matching Linux runtimes, rebuilds native modules, and
produces an x86_64 AppImage.

This repository contains no Kimi application files. Kimi Work is proprietary;
do not redistribute the result without permission.

## Status

Kimi Work 3.1.2 has been verified on Linux x86_64: the UI, login state,
workspace daemon, Kimi Code, gateway RPC, and WebBridge all start. The patch adds
native Linux window decorations, removes the redundant application menu, and
skips the upstream PPT Tools installer because it has no Linux build.

The builder deliberately fails when an expected upstream code fragment changes,
so a new Kimi release cannot silently lose a compatibility or security patch.

## Build

Requirements: Linux x86_64, `7z`, `curl`, `rsync`, `tar`, `unzip`, `xz`, a C/C++
toolchain, Python for node-gyp, and `mise`.

```sh
mise install
pnpm install --frozen-lockfile
pnpm build
pnpm package
```

The runnable directory is `build/kimi-work`; the AppImage is written to `dist/`.
Downloads are cached under `.cache/downloads`. Electron, Node, Python, uv,
WebBridge, and the Kimi source archive are checksum-verified.

The portable launcher currently uses `--no-sandbox`, because an AppImage cannot
install Electron's `chrome-sandbox` helper as root with its required mode.

## Updates

The AppImage uses Kimi's bundled `electron-updater`, pointed at one generic Linux
feed. Packaging writes the matching `latest-linux.yml`; the file and AppImage
must be published together at the feed URL.

The scheduled GitHub Actions workflow checks Kimi daily. For each new version it
builds the AppImage, creates a `kimi-work-vVERSION` GitHub Release, uploads both
files, and commits the new `latest-linux.yml`. CI embeds this stable feed URL:

```text
https://github.com/OWNER/kimi-desktop-linux/releases/latest/download/
```

GitHub requires authentication when that repository is private. Launch the
AppImage with a fine-grained, read-only token in `KIMI_UPDATE_TOKEN`; no token is
needed if the release assets are public. `KIMI_UPDATE_URL` can override the
embedded feed at runtime.

The updater is disabled in locally packaged AppImages unless `KIMI_UPDATE_URL`
was set while packaging or is supplied when launching.

## Notes

Simply putting `app.asar` in stock Electron is insufficient: Electron must be
renamed so `app.isPackaged` is true, and every macOS native runtime must be
replaced or rebuilt for Linux.

Kimi currently pins an OpenClaw dependency tree with known high and critical npm
advisories. See [SECURITY.md](SECURITY.md) before enabling optional gateway or
channel integrations.

The architecture follows the same broad approach as
[`codex-desktop-linux`](https://github.com/ilysenko/codex-desktop-linux).
