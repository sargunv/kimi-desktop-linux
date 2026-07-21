import * as asar from "@electron/asar";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const [sourceAsar, outputAsar, outputIcon] = process.argv.slice(2);

if (!sourceAsar || !outputAsar || !outputIcon) {
  throw new Error("usage: patch-asar.mjs SOURCE_ASAR OUTPUT_ASAR OUTPUT_ICON");
}

const workDir = await mkdtemp(join(tmpdir(), "kimi-asar-"));

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
    description: "skip the unsupported upstream PPT installer on Linux",
    expected: 1,
    from: 'const arch = options.arch ?? process.arch;\n  if (platform === "win32" && arch !== "x64") {',
    to:
      'const arch = options.arch ?? process.arch;\n  if (platform === "linux") {\n    return { status: "skipped-unsupported", reason: "PPT Tools does not provide a Linux installer" };\n  }\n  if (platform === "win32" && arch !== "x64") {',
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
    description: "allow authenticated private Linux update feeds",
    expected: 1,
    from:
      'autoUpdater.forceDevUpdateConfig = true;\n    autoUpdater.setFeedURL({ provider: "generic", url: envUrl });',
    to:
      'autoUpdater.forceDevUpdateConfig = true;\n    autoUpdater.setFeedURL({ provider: "generic", url: envUrl });\n    const updateToken = process.env.KIMI_UPDATE_TOKEN;\n    if (updateToken) {\n      autoUpdater.requestHeaders = { Authorization: `Bearer ${updateToken}`, Accept: "application/octet-stream" };\n    }',
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
      '        spawnProcess("sh", ["-c", \'dir=$1; if command -v xdg-terminal-exec >/dev/null 2>&1; then cd "$dir" && exec xdg-terminal-exec; fi; if command -v konsole >/dev/null 2>&1; then exec konsole --workdir "$dir"; fi; if command -v gnome-terminal >/dev/null 2>&1; then exec gnome-terminal --working-directory="$dir"; fi; if command -v xfce4-terminal >/dev/null 2>&1; then exec xfce4-terminal --working-directory="$dir"; fi; if command -v x-terminal-emulator >/dev/null 2>&1; then cd "$dir" && exec x-terminal-emulator; fi; if command -v xterm >/dev/null 2>&1; then cd "$dir" && exec xterm; fi; exit 127\', "kimi-open-terminal", workdir], { detached: true, stdio: "ignore" });\n        return { success: true };',
  },
  {
    description: "best-effort Linux terminal launch for Open With",
    expected: 1,
    from:
      '    if (applicationId === "terminal") {\n      spawnDetached("x-terminal-emulator", ["--working-directory", targetDir]);\n      return true;\n    }',
    to:
      '    if (applicationId === "terminal") {\n      spawnDetached("sh", ["-c", \'dir=$1; if command -v xdg-terminal-exec >/dev/null 2>&1; then cd "$dir" && exec xdg-terminal-exec; fi; if command -v konsole >/dev/null 2>&1; then exec konsole --workdir "$dir"; fi; if command -v gnome-terminal >/dev/null 2>&1; then exec gnome-terminal --working-directory="$dir"; fi; if command -v xfce4-terminal >/dev/null 2>&1; then exec xfce4-terminal --working-directory="$dir"; fi; if command -v x-terminal-emulator >/dev/null 2>&1; then cd "$dir" && exec x-terminal-emulator; fi; if command -v xterm >/dev/null 2>&1; then cd "$dir" && exec xterm; fi; exit 127\', "kimi-open-terminal", targetDir]);\n      return true;\n    }',
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
  await asar.createPackage(workDir, outputAsar);
  await writeFile(outputIcon, await readFile(join(workDir, "assets", "icon.png")));
} finally {
  await rm(workDir, { recursive: true, force: true });
}
