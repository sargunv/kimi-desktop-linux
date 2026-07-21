# Backlog

These gaps were identified while porting Kimi Work 3.1.2. Recheck them against
each upstream release before changing bundled code.

## Functional and security

- [x] **Repair managed `npm` and `npx` commands.** The managed-command launcher
      treated Linux like Windows (`runtime/node_modules/npm`), while the
      repackaged runtime keeps the macOS `runtime/vendor/npm` layout. Linux now
      uses the vendor path.
- [ ] **Make closing the window safe without a tray.** Kimi currently hides on
      close, which can leave it inaccessible on desktops without tray support.
      Prefer keeping close-to-tray where the tray works (e.g. KDE). Offer a
      close-to-tray setting that defaults off only on environments without a
      usable tray, or quit when tray setup fails.
- [ ] **Fix terminal launching.** Detect installed terminal emulators before
      spawning them, use emulator-specific working-directory arguments, and report
      asynchronous launch failures.
- [ ] **Restore Chromium sandboxing.** The AppImage launcher currently passes
      `--no-sandbox`. Use the user-namespace sandbox where supported or provide a
      package format that can install the sandbox helper correctly.
- [ ] **Validate AppImage updates end to end.** Test discovery, download,
      replacement, relaunch, and rollback behavior using two real release versions.

## Linux desktop integration

- [ ] **Enable PPT Tools.** Kimi now hosts `inside_install.sh` and Linux x64 and
      arm64 assets. Select that installer on Linux, remove the current compatibility
      skip, and cover installation and upgrade behavior.
- [ ] **Implement launch at login.** Replace Electron's macOS/Windows-only login
      item API with an XDG autostart desktop entry whose executable remains valid
      after an AppImage update.
- [x] **Install desktop and protocol metadata.** Out of scope for the portable
      AppImage itself. The bundle already ships `kimi-work.desktop` (with `kimi:` /
      `kimi-work:` MimeTypes), icons, and `.DirIcon` for host tools such as Gear
      Lever or AppImageLauncher to register.
- [x] **Provide proper application and AppImage icons.** The package already
      embeds upstream `icon.png` as the AppImage icon, `.DirIcon`, and hicolor
      entry. Multi-size hicolor polishing is optional; day-to-day icons work via the
      AppImage and host integration tools.
- [ ] **Improve Open With.** Resolve MIME associations and application names from
      desktop entries instead of offering only hardcoded file-manager and terminal
      choices.
- [ ] **Add runtime dependency diagnostics.** Detect missing Git and other
      required host tools early. Remove the `lsof` dependency from stale WebBridge
      port recovery or report its absence clearly.
- [ ] **Make unread state desktop-independent.** Linux launcher badges only work
      on Unity. Preserve unread state in the application UI when badges or a tray are
      unavailable.

## Portability and coverage

- [ ] **Support clipboard access on pure Wayland.** The current native clipboard
      addon uses its X11 backend and works in Wayland sessions through XWayland.
      Rebuild it with Wayland support and test without `DISPLAY`.
- [ ] **Port the selection toolbar.** Implement selected-text and selection-bounds
      discovery through AT-SPI2, including GNOME and KDE behavior under X11 and
      Wayland. It is currently disabled as unsupported.
- [ ] **Add Linux arm64 builds.** Select arm64 Electron, Node, Python, uv,
      WebBridge, gateway dependencies, and AppImage runtime assets, with native CI
      coverage.
- [x] **Define broader distribution support.** Supported: Linux x86_64 with glibc.
      musl distributions (Alpine, etc.) are explicitly out of scope for now.
- [ ] **Expand native-module smoke tests.** Exercise the gateway's Sharp, Canvas,
      clipboard, Koffi, and sqlite-vec modules in addition to the existing daemon
      checks.
- [ ] **Prune inactive platform payloads.** Remove safely identifiable macOS,
      Windows, and unused Unix prebuilds from multi-platform dependencies to reduce
      AppImage size.
