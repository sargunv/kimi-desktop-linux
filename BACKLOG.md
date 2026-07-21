# Backlog

These gaps were identified while porting Kimi Work 3.1.2. Recheck them against
each upstream release before changing bundled code.

## Functional and security

- [ ] **Repair managed `npm` and `npx` commands.** The Linux process runner looks
      for `runtime/node_modules/npm`, while the repackaged runtime contains
      `runtime/vendor/npm`. Add the compatible layout or patch the lookup, then test
      both commands through the managed-command wrapper.
- [ ] **Make closing the window safe without a tray.** Kimi currently hides on
      close, which can leave it inaccessible on desktops without tray support.
      Default to quitting on Linux or expose a close-to-tray setting that is off by
      default.
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
- [ ] **Install desktop and protocol metadata.** Register the application in the
      user's XDG applications directory so icons, launchers, and `kimi:` and
      `kimi-work:` deep links work without AppImageLauncher. Test both cold-start and
      already-running deep links.
- [ ] **Provide proper application and AppImage icons.** Generate correctly sized
      hicolor variants from Kimi's upstream artwork instead of placing the 1024px
      source in a 256px directory. Ensure the Electron window, desktop entry,
      AppImage `.DirIcon`, task switcher, and dock all resolve the Kimi Work icon on
      GNOME and KDE.
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
- [ ] **Define broader distribution support.** Establish and test minimum glibc
      and desktop-library requirements. Decide whether musl distributions are in
      scope or explicitly unsupported.
- [ ] **Expand native-module smoke tests.** Exercise the gateway's Sharp, Canvas,
      clipboard, Koffi, and sqlite-vec modules in addition to the existing daemon
      checks.
- [ ] **Prune inactive platform payloads.** Remove safely identifiable macOS,
      Windows, and unused Unix prebuilds from multi-platform dependencies to reduce
      AppImage size.
