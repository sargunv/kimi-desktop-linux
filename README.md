# Kimi Work for Linux

An experimental, community Linux repackager for Kimi Work. It combines files
from user-supplied official Windows x64 and macOS ARM64 installers with official
Linux runtimes and rebuilds every platform-specific native dependency.

This repository contains no Kimi application files. Kimi Work is proprietary;
use this only with installers you obtained from Kimi and do not redistribute the
result unless you have permission.

## Status

Kimi Work 3.1.2 has been verified on Linux x86_64: the UI launches, login state
loads, the workspace daemon provisions, Kimi Code starts, gateway RPC works, and
WebBridge starts. Native Linux window decorations are enabled because upstream
uses a frameless title bar without Linux controls.

Known limitation: the upstream PPT Tools installer explicitly rejects Linux, so
the Linux patch skips that startup installation. Vendor self-updates are also
disabled by default because Kimi does not publish a Linux update artifact. Set
`KIMI_UPDATE_URL` only if you operate a compatible Linux update feed.

Security note: Kimi 3.1.2 pins `openclaw@2026.3.13`. As of this repository's
verification date, `npm audit` reports known high and critical advisories in
that dependency tree. The builder intentionally preserves the vendor-pinned
version because upgrading this private integration without compatibility tests
would be unsafe. Treat the result as experimental, leave optional gateway and
channel integrations disabled unless needed, and review `npm audit --omit=dev`
under `build/kimi-work/resources/resources/gateway` before relying on them.

## Why both installers?

- Windows provides the x64 application ASAR. Its main process is the same build
  as macOS and already contains several Linux code paths.
- macOS provides the unpacked gateway and workspace-daemon layout that Kimi's
  main process expects on both macOS and Linux. The Windows daemon is packed as a
  Windows-only archive.
- The builder replaces Electron, Node, Python, uv, WebBridge, gateway optional
  dependencies, `better-sqlite3`, and `node-pty` with Linux x86_64 builds.

Simply dropping `app.asar` into stock Electron is insufficient. Electron must be
renamed so `app.isPackaged` is true; otherwise Kimi resolves workspace files
inside `app.asar/resources/targets/linux-x64` and reports that they are damaged.

## Build

Requirements: Linux x86_64, `7z`, `curl`, `rsync`, `tar`, `unzip`, `xz`, a C/C++
toolchain, Python (for node-gyp), and `mise`.

1. Put exactly one official `.exe` and one official `.dmg` in `original/`.
2. Install pinned tools and dependencies:

   ```sh
   mise install
   pnpm install --frozen-lockfile
   ```

3. Assemble and run:

   ```sh
   pnpm build
   ./build/kimi-work/start-kimi-work
   ```

Downloads are cached in `.cache/downloads`. The builder validates Electron,
Node, Python, uv, and WebBridge with publisher-provided or pinned SHA-256 hashes.
It refuses to overwrite an existing versioned build directory.

To select installers explicitly:

```sh
WINDOWS_INSTALLER=/path/to/Kimi.exe MACOS_INSTALLER=/path/to/Kimi.dmg pnpm build
```

## Package

Create a portable archive:

```sh
pnpm package:tar
```

Or install `appimagetool` and create an AppImage:

```sh
APPIMAGETOOL=/path/to/appimagetool pnpm package:appimage
```

The launcher currently uses `--no-sandbox`, as a portable directory cannot make
Electron's `chrome-sandbox` helper setuid-root. A future distro-native package
can install that helper with the required ownership and mode and remove the flag.

## Upgrading Kimi

Replace the two files under `original/` and rebuild. The ASAR patcher asserts the
exact number of upstream snippets it changes; when Kimi changes these areas, the
build stops and requires a manual review instead of silently emitting a broken
or insecure package.

The architecture follows the same broad approach as
[`codex-desktop-linux`](https://github.com/ilysenko/codex-desktop-linux): extract
an official desktop build, swap Electron and native payloads, apply small Linux
compatibility patches, then produce Linux packages.
