# Backlog

These gaps were identified while porting Kimi Work 3.1.2. Recheck them against
each upstream release before changing bundled code.

## Functional and security

- [x] **Repair managed `npm` and `npx` commands.** The managed-command launcher
      treated Linux like Windows (`runtime/node_modules/npm`), while the
      repackaged runtime keeps the macOS `runtime/vendor/npm` layout. Linux now
      uses the vendor path.
- [x] **Make closing the window safe without a tray.** Best-effort: skip tray
      setup when `Tray.isSupported()` is false, and quit on close if no tray was
      created. Desktops where Electron still reports support but shows no icon
      (e.g. some GNOME setups) remain an Electron/host limitation.
- [x] **Fix terminal launching.** Best-effort: prefer KDE `kdeglobals`
      `TerminalApplication` via `kreadconfig6`/`5`, then `xdg-terminal-exec`,
      then `konsole --workdir`, then common terminals / `x-terminal-emulator` /
      `xterm`. Exhaustive emulator matrices and async failure reporting are out
      of scope.
- [x] **Restore Chromium sandboxing.** Not viable for a portable AppImage: FUSE
      mounts are nosuid so setuid `chrome-sandbox` cannot work, and user-namespace
      sandboxing depends on distro policy (e.g. Ubuntu AppArmor) that AppImages
      cannot install. Keep `--no-sandbox`; prefer a distro-native package for
      higher-risk deployments (see SECURITY.md).
- [ ] **Validate AppImage updates end to end.** Test discovery, download,
      replacement, relaunch, and rollback behavior using two real release versions.

## Linux desktop integration

- [x] **Enable PPT Tools.** Select `inside_install.sh` on Linux (upstream
      `install.sh` is macOS-only), remove the compatibility skip, and verify
      install plus idempotent upgrade against the hosted Linux x64/arm64 assets.
- [x] **Implement launch at login.** Best-effort: on Linux, map the settings
      toggle to an XDG autostart desktop entry (`kimi-work.desktop`) whose `Exec`
      uses `$APPIMAGE` when present so in-place AppImage updates keep working.
- [x] **Install desktop and protocol metadata.** Out of scope for the portable
      AppImage itself. The bundle already ships `kimi-work.desktop` (with `kimi:` /
      `kimi-work:` MimeTypes), icons, and `.DirIcon` for host tools such as Gear
      Lever or AppImageLauncher to register.
- [x] **Provide proper application and AppImage icons.** The package already
      embeds upstream `icon.png` as the AppImage icon, `.DirIcon`, and hicolor
      entry. Multi-size hicolor polishing is optional; day-to-day icons work via the
      AppImage and host integration tools.
- [x] **Improve Open With.** Best-effort: keep File manager / Terminal stubs and
      list MIME handlers via `gio info` / `gio mime`, opening chosen apps with
      `gio launch`. Works on modern desktops that ship GLib/`gio` (including
      typical KDE installs).
- [ ] **Add runtime dependency diagnostics.** Detect missing Git and other
      required host tools early. Remove the `lsof` dependency from stale WebBridge
      port recovery or report its absence clearly.
- [ ] **Make unread state desktop-independent.** Linux launcher badges only work
      on Unity. Preserve unread state in the application UI when badges or a tray are
      unavailable.

## Portability and coverage

- [x] **Support clipboard access on pure Wayland.** Rebuild
      `@mariozechner/clipboard` during packaging with `--features wayland` so
      `WAYLAND_DISPLAY` is preferred and X11 remains the fallback. Smoke-tested
      without `DISPLAY`. Compositors still need a data-control protocol (or
      XWayland fallback) for the native write to succeed.
- [ ] **Port the selection toolbar.** Implement selected-text and selection-bounds
      discovery through AT-SPI2, including GNOME and KDE behavior under X11 and
      Wayland. It is currently disabled as unsupported.
- [x] **Add Linux arm64 builds.** Native aarch64 CI selects arm64 Electron, Node,
      Python, uv, WebBridge, gateway dependencies, and AppImage runtime assets and
      publishes `latest-linux-arm64.yml` beside the x86_64 feed.
- [x] **Define broader distribution support.** Supported: Linux x86_64 and aarch64
      with glibc. musl distributions (Alpine, etc.) are explicitly out of scope for
      now.
- [ ] **Expand native-module smoke tests.** Exercise the gateway's Sharp, Canvas,
      clipboard, Koffi, and sqlite-vec modules in addition to the existing daemon
      checks.
- [x] **Prune inactive platform payloads.** Not worth the complexity: koffi and
      node-pty ship foreign prebuilds (~32 MiB unpacked), but AppImage savings are
      only ~6–10 MiB after compression. Optional natives (sharp, canvas, etc.) are
      already Linux-only. Leave the multi-platform tarballs as installed.
