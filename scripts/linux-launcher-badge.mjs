import { pathToFileURL } from "node:url";

/** Desktop file id shipped by the AppImage (`packaging/appimage/kimi-work.desktop`). */
export const LINUX_LAUNCHER_DESKTOP_ID = "kimi-work.desktop";

export const LINUX_LAUNCHER_ENTRY_IFACE = "com.canonical.Unity.LauncherEntry";

/**
 * GLib `g_str_hash` — used by libunity for `/com/canonical/unity/launcherentry/<hash>`.
 * Desktops that listen for LauncherEntry match primarily on the app URI; the path
 * still needs to be a stable, valid D-Bus object path.
 */
export function glibStrHash(value) {
  let hash = 5381;
  for (let i = 0; i < String(value).length; i++) {
    hash = (Math.imul(hash, 33) + String(value).charCodeAt(i)) >>> 0;
  }
  return hash >>> 0;
}

export function sanitizeLauncherBadgeCount(count) {
  if (!Number.isFinite(count)) {
    return 0;
  }
  return Math.max(0, Math.floor(count));
}

export function linuxLauncherEntryAppUri(desktopId = LINUX_LAUNCHER_DESKTOP_ID) {
  return `application://${desktopId}`;
}

export function linuxLauncherEntryObjectPath(desktopId = LINUX_LAUNCHER_DESKTOP_ID) {
  return `/com/canonical/unity/launcherentry/${glibStrHash(desktopId)}`;
}

export function linuxLauncherEntryPropertiesVariant(count) {
  const next = sanitizeLauncherBadgeCount(count);
  const visible = next > 0;
  return `{'count': <int64 ${next}>, 'count-visible': <${visible}>}`;
}

/** Args for `gdbus emit --session ...` (best-effort host tool; present on GLib desktops). */
export function buildLinuxLauncherBadgeGdbusArgs(
  count,
  desktopId = LINUX_LAUNCHER_DESKTOP_ID,
) {
  return [
    "emit",
    "--session",
    "--object-path",
    linuxLauncherEntryObjectPath(desktopId),
    "--signal",
    `${LINUX_LAUNCHER_ENTRY_IFACE}.Update`,
    linuxLauncherEntryAppUri(desktopId),
    linuxLauncherEntryPropertiesVariant(count),
  ];
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const raw = process.argv[2];
  if (raw === undefined || !/^\d+$/.test(raw)) {
    console.error("usage: linux-launcher-badge.mjs <count>");
    process.exit(2);
  }
  console.log(JSON.stringify(buildLinuxLauncherBadgeGdbusArgs(Number(raw))));
}
