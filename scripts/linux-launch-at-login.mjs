import { existsSync, mkdirSync, unlinkSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

export const LINUX_AUTOSTART_DESKTOP_ID = "kimi-work.desktop";

export function xdgAutostartDir(env = process.env, home = env.HOME || homedir() || "") {
  const configHome = env.XDG_CONFIG_HOME || (home ? join(home, ".config") : "");
  return configHome ? join(configHome, "autostart") : "";
}

export function linuxAutostartDesktopPath(
  env = process.env,
  home = env.HOME || homedir() || "",
  desktopId = LINUX_AUTOSTART_DESKTOP_ID,
) {
  const dir = xdgAutostartDir(env, home);
  return dir ? join(dir, desktopId) : "";
}

export function linuxAutostartExecPath({
  APPIMAGE = process.env.APPIMAGE,
  execPath = process.execPath,
} = {}) {
  if (typeof APPIMAGE === "string" && APPIMAGE.trim()) {
    return APPIMAGE.trim();
  }
  return execPath;
}

export function quoteDesktopExecArg(value) {
  return `"${String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

export function sanitizeDesktopName(name, fallback = "Kimi Work") {
  const cleaned = String(name ?? "").replace(/[\r\n]/g, " ").trim();
  return cleaned || fallback;
}

export function buildLinuxAutostartDesktopEntry({
  name = "Kimi Work",
  execPath,
  APPIMAGE,
  processExecPath = process.execPath,
} = {}) {
  const executable = execPath ?? linuxAutostartExecPath({ APPIMAGE, execPath: processExecPath });
  return [
    "[Desktop Entry]",
    "Type=Application",
    `Name=${sanitizeDesktopName(name)}`,
    "Comment=Kimi Work",
    `Exec=${quoteDesktopExecArg(executable)}`,
    "Terminal=false",
    "X-GNOME-Autostart-enabled=true",
    "StartupWMClass=Kimi",
    "",
  ].join("\n");
}

export function isLinuxLaunchAtLoginEnabled(env = process.env, home = env.HOME || homedir() || "") {
  const path = linuxAutostartDesktopPath(env, home);
  return Boolean(path && existsSync(path));
}

export function applyLinuxLaunchAtLogin(
  enabled,
  {
    env = process.env,
    home = env.HOME || homedir() || "",
    name = "Kimi Work",
    APPIMAGE = env.APPIMAGE,
    execPath = process.execPath,
    desktopId = LINUX_AUTOSTART_DESKTOP_ID,
  } = {},
) {
  const dir = xdgAutostartDir(env, home);
  const path = linuxAutostartDesktopPath(env, home, desktopId);
  if (!dir || !path) {
    throw new Error("XDG autostart directory is unavailable");
  }
  if (!enabled) {
    if (existsSync(path)) unlinkSync(path);
    return { path, enabled: false };
  }
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(
    path,
    buildLinuxAutostartDesktopEntry({ name, APPIMAGE, processExecPath: execPath }),
    "utf-8",
  );
  return { path, enabled: true };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const action = process.argv[2];
  if (action !== "enable" && action !== "disable" && action !== "status") {
    console.error("usage: linux-launch-at-login.mjs <enable|disable|status>");
    process.exit(2);
  }
  if (action === "status") {
    console.log(JSON.stringify({ enabled: isLinuxLaunchAtLoginEnabled() }));
  } else {
    console.log(JSON.stringify(applyLinuxLaunchAtLogin(action === "enable")));
  }
}
