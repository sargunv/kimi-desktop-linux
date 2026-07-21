# Kimi Work for Linux

An unofficial community build of [Kimi Work](https://www.kimi.com/) for Linux.

## Install

Download the latest x86_64 AppImage from
[GitHub Releases](https://github.com/sargunv/kimi-desktop-linux/releases/latest),
make it executable, and run it:

```sh
chmod +x kimi-work-*-x86_64.AppImage
./kimi-work-*-x86_64.AppImage
```

The AppImage checks this repository's public releases for updates. New upstream
versions are checked daily and repackaged automatically.

## Status

Kimi Work 3.1.2 has been tested on Linux x86_64. The interface, login,
workspaces, Kimi Code, gateway, and WebBridge start successfully.

Known limitations:

- Only x86_64 Linux systems using glibc are supported. musl distributions are
  not supported.
- PPT Tools and the selection toolbar are currently unavailable.
- Closing the window hides Kimi in the system tray. That works on desktops with
  tray support (including KDE); stock GNOME may need a tray extension to restore
  or quit it.
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
