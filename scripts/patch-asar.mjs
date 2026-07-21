import * as asar from "@electron/asar";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const [sourceAsar, outputAsar, outputIcon] = process.argv.slice(2);

if (!sourceAsar || !outputAsar || !outputIcon) {
  throw new Error("usage: patch-asar.mjs SOURCE_ASAR OUTPUT_ASAR OUTPUT_ICON");
}

const workDir = await mkdtemp(join(tmpdir(), "kimi-asar-"));

const linuxOpenTerminalShell =
  'dir=$1; kde_term=; command -v kreadconfig6 >/dev/null 2>&1 && kde_term=$(kreadconfig6 --file kdeglobals --group General --key TerminalApplication 2>/dev/null); [ -z "$kde_term" ] && command -v kreadconfig5 >/dev/null 2>&1 && kde_term=$(kreadconfig5 --file kdeglobals --group General --key TerminalApplication 2>/dev/null); case $kde_term in \'\'|*[!A-Za-z0-9._-]*) ;; *) command -v "$kde_term" >/dev/null 2>&1 && cd "$dir" && exec "$kde_term" ;; esac; if command -v xdg-terminal-exec >/dev/null 2>&1; then cd "$dir" && exec xdg-terminal-exec; fi; if command -v konsole >/dev/null 2>&1; then exec konsole --workdir "$dir"; fi; if command -v gnome-terminal >/dev/null 2>&1; then exec gnome-terminal --working-directory="$dir"; fi; if command -v xfce4-terminal >/dev/null 2>&1; then exec xfce4-terminal --working-directory="$dir"; fi; if command -v x-terminal-emulator >/dev/null 2>&1; then cd "$dir" && exec x-terminal-emulator; fi; if command -v xterm >/dev/null 2>&1; then cd "$dir" && exec xterm; fi; exit 127';

const linuxOpenWithHelpers = `
function linuxXdgApplicationDirs() {
  const home = process.env.HOME || "";
  const dataHome = process.env.XDG_DATA_HOME || (home ? join(home, ".local/share") : "");
  const dataDirs = (process.env.XDG_DATA_DIRS || "/usr/local/share:/usr/share").split(":").filter(Boolean);
  const dirs = [];
  if (dataHome) {
    dirs.push(join(dataHome, "applications"));
  }
  for (const dataDir of dataDirs) {
    dirs.push(join(dataDir, "applications"));
  }
  return dirs;
}
function resolveLinuxDesktopFile(desktopId) {
  if (typeof desktopId !== "string" || !/^[A-Za-z0-9][A-Za-z0-9._-]*\\.desktop$/.test(desktopId)) {
    return null;
  }
  for (const dir of linuxXdgApplicationDirs()) {
    const candidate = join(dir, desktopId);
    if (existsSync$1(candidate)) {
      return candidate;
    }
  }
  return null;
}
function readLinuxDesktopName(desktopPath, fallback) {
  try {
    const named = readFileSync$1(desktopPath, "utf8").match(/^Name=(.+)$/m);
    const name = named?.[1]?.trim();
    if (name) {
      return name;
    }
  } catch {
  }
  return fallback;
}
function execFileUtf8(command, args, timeoutMs = 3e3) {
  return new Promise((resolve2) => {
    execFile(command, args, { encoding: "utf8", timeout: timeoutMs, maxBuffer: 1024 * 1024 }, (error2, stdout) => {
      resolve2(error2 ? "" : String(stdout ?? ""));
    });
  });
}
function parseGioMimeDesktopIds(output) {
  const ids = [];
  const seen = /* @__PURE__ */ new Set();
  for (const line of output.split(/\\r?\\n/)) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }
    let desktopId = "";
    if (trimmed.startsWith("Default application for")) {
      const idx = trimmed.lastIndexOf(":");
      desktopId = idx >= 0 ? trimmed.slice(idx + 1).trim() : "";
    } else if (trimmed.endsWith(".desktop")) {
      desktopId = trimmed;
    }
    if (!/^[A-Za-z0-9][A-Za-z0-9._-]*\\.desktop$/.test(desktopId) || seen.has(desktopId)) {
      continue;
    }
    seen.add(desktopId);
    ids.push(desktopId);
  }
  return ids;
}
async function listLinuxWorkbenchOpenWithApplications(path2, locale) {
  const zh = isChineseLocale(locale);
  const applications = [
    { id: "file-manager", name: zh ? "文件管理器" : "File manager" },
    { id: "terminal", name: zh ? "终端" : "Terminal" }
  ];
  const seen = /* @__PURE__ */ new Set(["file-manager", "terminal"]);
  try {
    const info = await execFileUtf8("gio", ["info", "-a", "standard::content-type", path2]);
    const mime = info.match(/standard::content-type:\\s*(\\S+)/)?.[1];
    if (mime) {
      const mimeOut = await execFileUtf8("gio", ["mime", mime]);
      for (const desktopId of parseGioMimeDesktopIds(mimeOut)) {
        if (seen.has(desktopId)) {
          continue;
        }
        const desktopPath = resolveLinuxDesktopFile(desktopId);
        if (!desktopPath) {
          continue;
        }
        seen.add(desktopId);
        applications.push({
          id: desktopId,
          name: readLinuxDesktopName(desktopPath, desktopId.replace(/\\.desktop$/i, ""))
        });
      }
    }
  } catch (error2) {
    KLogMain.warn(\`RightWorkbench\`, \`query Linux open-with applications failed: \${error2 instanceof Error ? error2.message : String(error2)}\`);
  }
  return applications;
}
`.trim();

const linuxLaunchAtLoginHelpers = `
function linuxAutostartDir() {
  const home = process.env.HOME || app.getPath("home") || "";
  const configHome = process.env.XDG_CONFIG_HOME || (home ? join(home, ".config") : "");
  return configHome ? join(configHome, "autostart") : "";
}
function linuxAutostartDesktopPath() {
  const dir2 = linuxAutostartDir();
  return dir2 ? join(dir2, "kimi-work.desktop") : "";
}
function linuxAutostartExecPath() {
  const appImage = process.env.APPIMAGE;
  if (typeof appImage === "string" && appImage.trim()) {
    return appImage.trim();
  }
  return process.execPath;
}
function quoteLinuxDesktopExecArg(value) {
  return \`"\${String(value).replace(/\\\\/g, "\\\\\\\\").replace(/"/g, '\\\\"')}"\`;
}
function buildLinuxAutostartDesktopEntry() {
  const name = String(app.name || app.getName() || "Kimi Work").replace(/[\\r\\n]/g, " ").trim() || "Kimi Work";
  return [
    "[Desktop Entry]",
    "Type=Application",
    \`Name=\${name}\`,
    "Comment=Kimi Work",
    \`Exec=\${quoteLinuxDesktopExecArg(linuxAutostartExecPath())}\`,
    "Terminal=false",
    "X-GNOME-Autostart-enabled=true",
    "StartupWMClass=Kimi",
    ""
  ].join("\\n");
}
function readLinuxLaunchAtLogin() {
  const path2 = linuxAutostartDesktopPath();
  return Boolean(path2 && existsSync$1(path2));
}
function applyLinuxLaunchAtLogin(enabled) {
  const dir2 = linuxAutostartDir();
  const path2 = linuxAutostartDesktopPath();
  if (!dir2 || !path2) {
    throw new Error("XDG autostart directory is unavailable");
  }
  if (!enabled) {
    if (existsSync$1(path2)) {
      unlinkSync(path2);
    }
    return;
  }
  if (!existsSync$1(dir2)) {
    mkdirSync(dir2, { recursive: true });
  }
  writeFileSync(path2, buildLinuxAutostartDesktopEntry(), "utf-8");
}
`.trim();

const linuxPortPidHelpers = `
function linuxFindListeningPidsOnPort(port) {
  const n = Number(port);
  if (!Number.isInteger(n) || n <= 0 || n > 65535) {
    return [];
  }
  try {
    const output = execFileSync("ss", ["-H", "-lptn", \`sport = :\${n}\`], {
      encoding: "utf8",
      timeout: 3e3,
      maxBuffer: 65536
    });
    const pids = [];
    const seen = /* @__PURE__ */ new Set();
    for (const line of String(output).split(/\\r?\\n/)) {
      for (const match of line.matchAll(/pid=(\\d+)/g)) {
        const pid = Number(match[1]);
        if (Number.isFinite(pid) && pid > 0 && !seen.has(pid)) {
          seen.add(pid);
          pids.push(pid);
        }
      }
    }
    return pids;
  } catch {
    return [];
  }
}
`.trim();

const linuxRuntimeDepsHelpers = `
let linuxRuntimeDepsWarned = false;
function warnLinuxRuntimeDepsOnStartup() {
  if (process.platform !== "linux" || linuxRuntimeDepsWarned) {
    return;
  }
  linuxRuntimeDepsWarned = true;
  const daimonPath = "/usr/bin:/bin:/usr/sbin:/sbin:/usr/local/bin";
  try {
    execFileSync("git", ["--version"], {
      encoding: "utf8",
      timeout: 3e3,
      env: { ...process.env, PATH: daimonPath }
    });
    return;
  } catch {
  }
  KLogMain.warn("LinuxRuntimeDeps", "git not found on daimon PATH; coding workflows will fail");
  const zh = String(process.env.LANG || process.env.LC_ALL || "").toLowerCase().startsWith("zh");
  dialog.showMessageBox({
    type: "warning",
    title: zh ? "缺少 Git" : "Git not found",
    message: zh ? "未检测到 Git，代码相关功能将无法使用。" : "Git was not found. Coding workflows will not work.",
    detail: zh ? "请通过系统包管理器安装 Git，例如：\\nsudo apt install git" : "Install Git from your distro packages, e.g.:\\nsudo apt install git",
    buttons: [zh ? "知道了" : "OK"],
    noLink: true
  }).catch(() => {
  });
}
`.trim();

const replacements = [
  {
    description: "remove the redundant Linux application menu",
    expected: 1,
    from:
      "function setupAppMenu({ windowManager: windowManager2, cookieWatcher: cookieWatcher2, tokenStore: tokenStore2, kimiAgent: kimiAgent2 }) {\n  const isMac = process.platform === \"darwin\";",
    to:
      "function setupAppMenu({ windowManager: windowManager2, cookieWatcher: cookieWatcher2, tokenStore: tokenStore2, kimiAgent: kimiAgent2 }) {\n  if (process.platform === \"linux\") {\n    Menu.setApplicationMenu(null);\n    return;\n  }\n  const isMac = process.platform === \"darwin\";",
  },
  {
    description: "native Linux decorations on conversation and main windows",
    expected: 2,
    from: 'titleBarStyle: process.platform === "darwin" ? "hiddenInset" : "hidden",',
    to:
      '...process.platform === "darwin" ? { titleBarStyle: "hiddenInset" } : process.platform === "win32" ? { titleBarStyle: "hidden" } : {},',
  },
  {
    description: "advertise the Linux PPT Tools inside_install.sh URL",
    expected: 1,
    from: `const PPT_TOOLS_SCRIPT_URLS = {
  posix: "https://www.kimi.com/neo-ppt/cli-install/install.sh",
  windows: "https://www.kimi.com/neo-ppt/cli-install/install.ps1"
};`,
    to: `const PPT_TOOLS_SCRIPT_URLS = {
  posix: "https://www.kimi.com/neo-ppt/cli-install/install.sh",
  linux: "https://www.kimi.com/neo-ppt/cli-install/inside_install.sh",
  windows: "https://www.kimi.com/neo-ppt/cli-install/install.ps1"
};`,
  },
  {
    description: "select inside_install.sh for PPT Tools on Linux",
    expected: 1,
    from: `  if (platform === "win32") {
    return {
      url: PPT_TOOLS_SCRIPT_URLS.windows,
      sourcePolicy: PPT_TOOLS_SOURCE_POLICY,
      scriptArgs: ["-InstallDir", installDir]
    };
  }
  return {
    url: PPT_TOOLS_SCRIPT_URLS.posix,
    sourcePolicy: PPT_TOOLS_SOURCE_POLICY,
    scriptArgs: [installDir]
  };`,
    to: `  if (platform === "win32") {
    return {
      url: PPT_TOOLS_SCRIPT_URLS.windows,
      sourcePolicy: PPT_TOOLS_SOURCE_POLICY,
      scriptArgs: ["-InstallDir", installDir]
    };
  }
  if (platform === "linux") {
    return {
      url: PPT_TOOLS_SCRIPT_URLS.linux,
      sourcePolicy: PPT_TOOLS_SOURCE_POLICY,
      scriptArgs: [installDir]
    };
  }
  return {
    url: PPT_TOOLS_SCRIPT_URLS.posix,
    sourcePolicy: PPT_TOOLS_SOURCE_POLICY,
    scriptArgs: [installDir]
  };`,
  },
  {
    description: "disable vendor updates for an unofficial Linux package",
    expected: 1,
    from:
      'function setupAutoUpdater() {\n  if (isDev && !process.env.KIMI_UPDATE_URL) {',
    to:
      'function setupAutoUpdater() {\n  if (process.platform === "linux" && !process.env.KIMI_UPDATE_URL) {\n    return;\n  }\n  if (isDev && !process.env.KIMI_UPDATE_URL) {',
  },
  {
    description: "enable Linux prerelease updates and optional private feed auth",
    expected: 1,
    from:
      'autoUpdater.forceDevUpdateConfig = true;\n    autoUpdater.setFeedURL({ provider: "generic", url: envUrl });',
    to:
      'autoUpdater.forceDevUpdateConfig = true;\n    autoUpdater.allowPrerelease = true;\n    autoUpdater.setFeedURL({ provider: "generic", url: envUrl });\n    const updateToken = process.env.KIMI_UPDATE_TOKEN;\n    if (updateToken) {\n      autoUpdater.requestHeaders = { Authorization: `Bearer ${updateToken}`, Accept: "application/octet-stream" };\n    }',
  },
  {
    description: "use the bundled vendor npm layout on Linux managed commands",
    expected: 1,
    from:
      "const npmDir = process.platform === 'darwin'\n  ? path.join(runtimeDir, 'vendor', 'npm')\n  : path.join(runtimeDir, 'node_modules', 'npm')",
    to:
      "const npmDir = process.platform === 'win32'\n  ? path.join(runtimeDir, 'node_modules', 'npm')\n  : path.join(runtimeDir, 'vendor', 'npm')",
  },
  {
    description: "skip tray setup when Electron reports no tray support",
    expected: 1,
    from: "function setupTray() {\n  let icon;",
    to:
      "function setupTray() {\n  if (!Tray.isSupported()) {\n    return;\n  }\n  let icon;",
  },
  {
    description: "quit on close when no tray was created",
    expected: 1,
    from:
      'this.baseWindow.on("close", (e) => {\n      if (!this.isQuitting) {\n        e.preventDefault();\n        if (this.baseWindow?.isFullScreen()) {\n          this.baseWindow.setFullScreen(false);\n        } else {\n          this.baseWindow?.hide();\n        }\n      }\n    });',
    to:
      'this.baseWindow.on("close", (e) => {\n      if (!this.isQuitting) {\n        if (!tray) {\n          e.preventDefault();\n          app.quit();\n          return;\n        }\n        e.preventDefault();\n        if (this.baseWindow?.isFullScreen()) {\n          this.baseWindow.setFullScreen(false);\n        } else {\n          this.baseWindow?.hide();\n        }\n      }\n    });',
  },
  {
    description: "best-effort Linux terminal launch for workspace open-terminal",
    expected: 1,
    from:
      '        const terminals = ["gnome-terminal", "konsole", "xfce4-terminal", "xterm"];\n        for (const term of terminals) {\n          try {\n            spawnProcess(term, ["--working-directory", workdir], { detached: true, stdio: "ignore" });\n            return { success: true };\n          } catch {\n            continue;\n          }\n        }\n        return { success: false, message: "No terminal emulator found" };',
    to:
      `        spawnProcess("sh", ["-c", ${JSON.stringify(linuxOpenTerminalShell)}, "kimi-open-terminal", workdir], { detached: true, stdio: "ignore" });\n        return { success: true };`,
  },
  {
    description: "inject Linux gio Open With helpers",
    expected: 1,
    from: "async function listWorkbenchOpenWithApplications(path2, isDirectory, locale) {",
    to: `${linuxOpenWithHelpers}
async function listWorkbenchOpenWithApplications(path2, isDirectory, locale) {`,
  },
  {
    description: "list Linux Open With apps via gio mime handlers",
    expected: 1,
    from:
      '  if (process.platform === "linux") {\n    const zh = isChineseLocale(locale);\n    return [\n      { id: "file-manager", name: zh ? "文件管理器" : "File manager" },\n      { id: "terminal", name: zh ? "终端" : "Terminal" }\n    ];\n  }',
    to:
      '  if (process.platform === "linux") {\n    return listLinuxWorkbenchOpenWithApplications(path2, locale);\n  }',
  },
  {
    description: "open Linux Open With targets via gio launch",
    expected: 1,
    from:
      '  if (process.platform === "linux") {\n    const targetDir = isDirectory ? path2 : dirname$2(path2);\n    if (applicationId === "file-manager") {\n      spawnDetached("xdg-open", [targetDir]);\n      return true;\n    }\n    if (applicationId === "terminal") {\n      spawnDetached("x-terminal-emulator", ["--working-directory", targetDir]);\n      return true;\n    }\n  }',
    to:
      `  if (process.platform === "linux") {\n    const targetDir = isDirectory ? path2 : dirname$2(path2);\n    if (applicationId === "file-manager") {\n      spawnDetached("xdg-open", [targetDir]);\n      return true;\n    }\n    if (applicationId === "terminal") {\n      spawnDetached("sh", ["-c", ${JSON.stringify(linuxOpenTerminalShell)}, "kimi-open-terminal", targetDir]);\n      return true;\n    }\n    const desktopPath = resolveLinuxDesktopFile(applicationId);\n    if (!desktopPath) {\n      return false;\n    }\n    spawnDetached("gio", ["launch", desktopPath, path2]);\n    return true;\n  }`,
  },
  {
    description: "inject Linux XDG launch-at-login helpers",
    expected: 1,
    from: "function readLaunchAtLogin() {",
    to: `${linuxLaunchAtLoginHelpers}
function readLaunchAtLogin() {`,
  },
  {
    description: "read launch-at-login from XDG autostart on Linux",
    expected: 1,
    from:
      "function readLaunchAtLogin() {\n  try {\n    return app.getLoginItemSettings().openAtLogin === true;\n  } catch (err) {\n    KLogMain.warn(TAG$x, `读取登录项失败: ${err instanceof Error ? err.message : String(err)}`);\n    return false;\n  }\n}",
    to:
      'function readLaunchAtLogin() {\n  try {\n    if (process.platform === "linux") {\n      return readLinuxLaunchAtLogin();\n    }\n    return app.getLoginItemSettings().openAtLogin === true;\n  } catch (err) {\n    KLogMain.warn(TAG$x, `读取登录项失败: ${err instanceof Error ? err.message : String(err)}`);\n    return false;\n  }\n}',
  },
  {
    description: "apply launch-at-login via XDG autostart on Linux",
    expected: 1,
    from:
      "function applyLaunchAtLogin(enabled) {\n  try {\n    app.setLoginItemSettings({ openAtLogin: enabled });\n  } catch (err) {\n    KLogMain.error(TAG$x, `设置登录项失败: ${err instanceof Error ? err.message : String(err)}`);\n  }\n}",
    to:
      'function applyLaunchAtLogin(enabled) {\n  try {\n    if (process.platform === "linux") {\n      applyLinuxLaunchAtLogin(enabled);\n      return;\n    }\n    app.setLoginItemSettings({ openAtLogin: enabled });\n  } catch (err) {\n    KLogMain.error(TAG$x, `设置登录项失败: ${err instanceof Error ? err.message : String(err)}`);\n  }\n}',
  },
  {
    description: "inject Linux ss-based listening-port helpers",
    expected: 1,
    from: "function findPidByPort(port) {",
    to: `${linuxPortPidHelpers}
function findPidByPort(port) {`,
  },
  {
    description: "use ss for findPidByPort on Linux",
    expected: 1,
    from:
      '    const out2 = execSync(`lsof -iTCP:${port} -sTCP:LISTEN -t`, {\n      timeout: 5e3,\n      encoding: "utf-8"\n    }).trim();\n    const pid = parseInt(out2.split("\\n")[0] ?? "", 10);\n    return Number.isFinite(pid) && pid > 0 ? pid : null;',
    to:
      '    if (process.platform === "linux") {\n      const pid2 = linuxFindListeningPidsOnPort(port)[0];\n      return pid2 ?? null;\n    }\n    const out2 = execSync(`lsof -iTCP:${port} -sTCP:LISTEN -t`, {\n      timeout: 5e3,\n      encoding: "utf-8"\n    }).trim();\n    const pid = parseInt(out2.split("\\n")[0] ?? "", 10);\n    return Number.isFinite(pid) && pid > 0 ? pid : null;',
  },
  {
    description: "use ss for findPidsOnPort on Linux",
    expected: 1,
    from:
      '    } else {\n      const output = execFileSync("lsof", ["-nP", `-iTCP:${port}`, "-sTCP:LISTEN", "-t"], { encoding: "utf8" });\n      for (const line of output.split(/\\r?\\n/)) {\n        const pid = Number(line.trim());\n        if (Number.isFinite(pid) && pid > 0) {\n          pids.add(pid);\n        }\n      }\n    }',
    to:
      '    } else if (process.platform === "linux") {\n      for (const pid of linuxFindListeningPidsOnPort(port)) {\n        pids.add(pid);\n      }\n    } else {\n      const output = execFileSync("lsof", ["-nP", `-iTCP:${port}`, "-sTCP:LISTEN", "-t"], { encoding: "utf8" });\n      for (const line of output.split(/\\r?\\n/)) {\n        const pid = Number(line.trim());\n        if (Number.isFinite(pid) && pid > 0) {\n          pids.add(pid);\n        }\n      }\n    }',
  },
  {
    description: "inject Linux runtime dependency warn helper",
    expected: 1,
    from: "function applyWorkSettingsOnStartup() {",
    to: `${linuxRuntimeDepsHelpers}
function applyWorkSettingsOnStartup() {`,
  },
  {
    description: "warn once at startup when Linux host git is missing",
    expected: 1,
    from:
      "  KLogMain.info(TAG$x, `启动重放: keepAwake=${persisted.keepAwake} selectionToolbar=${persisted.selectionToolbarEnabled}`);\n}",
    to:
      "  KLogMain.info(TAG$x, `启动重放: keepAwake=${persisted.keepAwake} selectionToolbar=${persisted.selectionToolbarEnabled}`);\n  warnLinuxRuntimeDepsOnStartup();\n}",
  },
];

function countOccurrences(haystack, needle) {
  return haystack.split(needle).length - 1;
}

try {
  asar.extractAll(sourceAsar, workDir);
  const mainPath = join(workDir, "out", "main", "index.js");
  let main = await readFile(mainPath, "utf8");

  for (const replacement of replacements) {
    const actual = countOccurrences(main, replacement.from);
    if (actual !== replacement.expected) {
      throw new Error(
        `${replacement.description}: expected ${replacement.expected} match(es), found ${actual}`,
      );
    }
    main = main.replaceAll(replacement.from, replacement.to);
  }

  await writeFile(mainPath, main);

  const linuxVersion = process.env.KIMI_LINUX_VERSION?.trim();
  if (linuxVersion) {
    if (!/^\d+\.\d+\.\d+-linux\.\d+$/.test(linuxVersion)) {
      throw new Error(
        `KIMI_LINUX_VERSION must look like x.y.z-linux.N (got ${linuxVersion})`,
      );
    }
    const packagePath = join(workDir, "package.json");
    const packageJson = JSON.parse(await readFile(packagePath, "utf8"));
    packageJson.version = linuxVersion;
    await writeFile(packagePath, `${JSON.stringify(packageJson, null, 2)}\n`);
  }

  await asar.createPackage(workDir, outputAsar);
  await writeFile(outputIcon, await readFile(join(workDir, "assets", "icon.png")));
} finally {
  await rm(workDir, { recursive: true, force: true });
}
