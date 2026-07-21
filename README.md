# Kimi Work for Linux

An unofficial community build of [Kimi Work](https://www.kimi.com/) for Linux.

## Install

Download the latest AppImage for your CPU from
[GitHub Releases](https://github.com/sargunv/kimi-desktop-linux/releases/latest),
make it executable, and run it:

```sh
# x86_64
chmod +x kimi-work-*-x86_64.AppImage
./kimi-work-*-x86_64.AppImage

# aarch64 / arm64
chmod +x kimi-work-*-aarch64.AppImage
./kimi-work-*-aarch64.AppImage
```

The AppImage checks this repository's public releases for updates. New upstream
versions are checked daily and repackaged automatically.

## Status

Kimi Work 3.1.2 has been tested on Linux x86_64. Arm64 AppImages are built in
CI on native runners; please report issues if something fails on your machine.

Known limitations:

- Only glibc Linux on x86_64 and aarch64 is supported. musl distributions are
  not supported.
- PPT Tools and the selection toolbar are currently unavailable.
- Closing the window hides Kimi in the system tray when Electron reports tray
  support (including KDE). If no tray is available, closing the window quits.
  Some hosts still report support but show no icon; that needs a desktop tray
  extension or Electron improvement.
- The AppImage currently launches Electron without its Chromium sandbox. See
  [the security notes](SECURITY.md) before using higher-risk integrations.

Desktop menu entries, icons, and `kimi:` / `kimi-work:` protocol handlers are
provided by host AppImage integration tools such as Gear Lever or
AppImageLauncher. Git is expected to be installed for coding workflows.

## Unofficial distribution

This project is not affiliated with or endorsed by Moonshot AI. GitHub Release
artifacts contain Moonshot AI's Kimi Work application files repackaged for
Linux. If Moonshot AI is not comfortable with this community distribution,
please get in touch; I will gladly remove the release artifacts on request.

Development instructions are in [CONTRIBUTING.md](CONTRIBUTING.md).
