# Contributing

This repository turns Kimi's official macOS release into a Linux x86_64
AppImage. The repository itself must not contain Kimi archives, extracted
application files, or built AppImages.

## Set up

You need Linux x86_64 with glibc, `mise`, `7z`, `curl`, `rsync`, `tar`,
`unzip`, `xz`, a C/C++ toolchain, and Python for `node-gyp`. musl-based hosts
are out of scope.

```sh
mise install
pnpm install --frozen-lockfile
pnpm test
```

## Build

```sh
pnpm build
pnpm package
```

`pnpm build` creates a runnable tree at `build/kimi-work`. `pnpm package`
creates the AppImage under `dist/` and writes `latest-linux.yml`. Downloads are
cached in `.cache/downloads`.

The build:

1. Downloads Kimi's latest official macOS update and verifies its published
   SHA-512 checksum.
2. Fetches matching Linux Electron, Node, Python, uv, and WebBridge binaries.
3. Reinstalls or rebuilds native Node dependencies for Linux.
4. Applies the small Linux compatibility patches in
   `scripts/patch-asar.mjs`.
5. Packages the result as an AppImage with Linux update metadata.

## Making changes

Start with an item in [BACKLOG.md](BACKLOG.md), or describe the gap your change
addresses.

- Keep compatibility patches narrow. Every ASAR replacement must assert its
  expected match count so an upstream change fails the build instead of silently
  dropping a patch.
- Add a test for new patch or packaging behavior.
- Run `pnpm test` before submitting a change.
- Do not use `npm audit fix --force` on Kimi's dependency tree; see
  [SECURITY.md](SECURITY.md).

Useful environment variables:

- `KIMI_CACHE_DIR` changes the download cache.
- `KIMI_BUILD_DIR` changes the unpacked build directory.
- `KIMI_APP_DIR` selects the unpacked build packaged by `pnpm package`.
- `KIMI_UPDATE_URL` embeds or overrides the AppImage update feed.
- `KIMI_LINUX_VERSION` sets the full Linux packaging version (`x.y.z-linux.N`)
  embedded in the app and AppImage name. Defaults to `$upstream-linux.1`, or
  `$upstream-linux.$KIMI_LINUX_REVISION` when that revision is set.
- `KIMI_LINUX_REVISION` selects the packaging revision when
  `KIMI_LINUX_VERSION` is unset (default `1`).
- `KIMI_UPSTREAM_MANIFEST_URL` overrides Kimi's upstream update manifest for
  testing.

## Releases

The scheduled GitHub Actions workflow checks upstream daily. Linux releases use
`x.y.z-linux.N` versions (and `kimi-work-vVERSION` tags) so packaging-only
rebuilds can bump `N` and be picked up by the AppImage updater. A new upstream
`x.y.z` starts at `-linux.1`. Workflow `force` rebuilds bump `N`. The workflow
publishes the GitHub Release and commits the matching `latest-linux.yml`.

The packaging approach was informed by
[`codex-desktop-linux`](https://github.com/ilysenko/codex-desktop-linux).
