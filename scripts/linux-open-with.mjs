import { execFile } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const DESKTOP_ID = /^[A-Za-z0-9][A-Za-z0-9._-]*\.desktop$/;

export function xdgApplicationDirs(env = process.env) {
  const home = env.HOME || homedir() || "";
  const dataHome = env.XDG_DATA_HOME || (home ? join(home, ".local/share") : "");
  const dataDirs = (env.XDG_DATA_DIRS || "/usr/local/share:/usr/share").split(":").filter(Boolean);
  const dirs = [];
  if (dataHome) dirs.push(join(dataHome, "applications"));
  for (const dataDir of dataDirs) dirs.push(join(dataDir, "applications"));
  return dirs;
}

export function resolveDesktopFile(desktopId, dirs = xdgApplicationDirs()) {
  if (typeof desktopId !== "string" || !DESKTOP_ID.test(desktopId)) return null;
  for (const dir of dirs) {
    const candidate = join(dir, desktopId);
    if (existsSync(candidate)) return candidate;
  }
  return null;
}

export function readDesktopName(desktopPath, fallback) {
  try {
    const named = readFileSync(desktopPath, "utf8").match(/^Name=(.+)$/m);
    const name = named?.[1]?.trim();
    if (name) return name;
  } catch {
    // ignore unreadable desktop files
  }
  return fallback;
}

export function parseGioContentType(output) {
  return output.match(/standard::content-type:\s*(\S+)/)?.[1] ?? null;
}

export function parseGioMimeDesktopIds(output) {
  const ids = [];
  const seen = new Set();
  for (const line of output.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    let desktopId = "";
    if (trimmed.startsWith("Default application for")) {
      const idx = trimmed.lastIndexOf(":");
      desktopId = idx >= 0 ? trimmed.slice(idx + 1).trim() : "";
    } else if (trimmed.endsWith(".desktop")) {
      desktopId = trimmed;
    }
    if (!DESKTOP_ID.test(desktopId) || seen.has(desktopId)) continue;
    seen.add(desktopId);
    ids.push(desktopId);
  }
  return ids;
}

async function runGio(args) {
  try {
    const { stdout } = await execFileAsync("gio", args, {
      encoding: "utf8",
      timeout: 3000,
      maxBuffer: 1024 * 1024,
    });
    return String(stdout ?? "");
  } catch {
    return "";
  }
}

export async function listLinuxOpenWithApplications({
  path,
  locale = "en",
  zh = String(locale).toLowerCase().startsWith("zh"),
} = {}) {
  const applications = [
    { id: "file-manager", name: zh ? "文件管理器" : "File manager" },
    { id: "terminal", name: zh ? "终端" : "Terminal" },
  ];
  const seen = new Set(["file-manager", "terminal"]);
  if (!path) return applications;

  const mime = parseGioContentType(await runGio(["info", "-a", "standard::content-type", path]));
  if (!mime) return applications;

  for (const desktopId of parseGioMimeDesktopIds(await runGio(["mime", mime]))) {
    if (seen.has(desktopId)) continue;
    const desktopPath = resolveDesktopFile(desktopId);
    if (!desktopPath) continue;
    seen.add(desktopId);
    applications.push({
      id: desktopId,
      name: readDesktopName(desktopPath, desktopId.replace(/\.desktop$/i, "")),
    });
  }
  return applications;
}

export function linuxOpenWithLaunchArgs(applicationId, path, isDirectory, openTerminalShell) {
  const targetDir = isDirectory ? path : dirname(path);
  if (applicationId === "file-manager") {
    return { command: "xdg-open", args: [targetDir] };
  }
  if (applicationId === "terminal") {
    return {
      command: "sh",
      args: ["-c", openTerminalShell, "kimi-open-terminal", targetDir],
    };
  }
  const desktopPath = resolveDesktopFile(applicationId);
  if (!desktopPath) return null;
  return { command: "gio", args: ["launch", desktopPath, path] };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const target = process.argv[2];
  if (!target) {
    console.error("usage: linux-open-with.mjs PATH");
    process.exit(2);
  }
  console.log(JSON.stringify(await listLinuxOpenWithApplications({ path: target }), null, 2));
}
