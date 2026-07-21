import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { access, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { promisify } from "node:util";
import * as asar from "@electron/asar";

const execFileAsync = promisify(execFile);

const INSIDE_INSTALL_URL = "https://www.kimi.com/neo-ppt/cli-install/inside_install.sh";
const POSIX_INSTALL_URL = "https://www.kimi.com/neo-ppt/cli-install/install.sh";

async function fetchText(url) {
  const response = await fetch(url, { cache: "no-store", redirect: "follow" });
  assert.equal(response.ok, true, `failed to fetch ${url}: HTTP ${response.status}`);
  return response.text();
}

test("hosted PPT installers expose a Linux-only inside_install.sh", async () => {
  const [posix, inside] = await Promise.all([
    fetchText(POSIX_INSTALL_URL),
    fetchText(INSIDE_INSTALL_URL),
  ]);
  assert.match(posix, /Linux requires inside_install\.sh/);
  assert.match(inside, /inside_install\.sh supports Linux only/);
  assert.match(inside, /kimi-slides-linux-x64\.zip/);
  assert.match(inside, /kimi-slides-linux-arm64\.zip/);
  assert.match(inside, /linux_x64_sha256=[a-f0-9]{64}/);
  assert.match(inside, /linux_arm64_sha256=[a-f0-9]{64}/);
});

test("ASAR patcher selects inside_install.sh for Linux PPT Tools requests", async () => {
  const directory = await mkdtemp(join(tmpdir(), "kimi-ppt-asar-"));
  try {
    const sourceRoot = join(directory, "source");
    await mkdir(join(sourceRoot, "out", "main"), { recursive: true });
    await mkdir(join(sourceRoot, "assets"), { recursive: true });
    await writeFile(
      join(sourceRoot, "package.json"),
      JSON.stringify({ name: "fixture", version: "0.0.0" }),
    );
    // Minimal upstream snippets required by the PPT Tools replacements, plus
    // stubs for every other fail-closed patch so the patcher can run end to end.
    const main = [
      'function setupAppMenu({ windowManager: windowManager2, cookieWatcher: cookieWatcher2, tokenStore: tokenStore2, kimiAgent: kimiAgent2 }) {\n  const isMac = process.platform === "darwin";',
      'titleBarStyle: process.platform === "darwin" ? "hiddenInset" : "hidden",',
      'titleBarStyle: process.platform === "darwin" ? "hiddenInset" : "hidden",',
      `const PPT_TOOLS_SCRIPT_URLS = {
  posix: "https://www.kimi.com/neo-ppt/cli-install/install.sh",
  windows: "https://www.kimi.com/neo-ppt/cli-install/install.ps1"
};`,
      `  if (platform === "win32") {
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
      "function setupAutoUpdater() {\n  if (isDev && !process.env.KIMI_UPDATE_URL) {",
      'autoUpdater.forceDevUpdateConfig = true;\n    autoUpdater.setFeedURL({ provider: "generic", url: envUrl });',
      "const npmDir = process.platform === 'darwin'\n  ? path.join(runtimeDir, 'vendor', 'npm')\n  : path.join(runtimeDir, 'node_modules', 'npm')",
      "function setupTray() {\n  let icon;",
      'this.baseWindow.on("close", (e) => {\n      if (!this.isQuitting) {\n        e.preventDefault();\n        if (this.baseWindow?.isFullScreen()) {\n          this.baseWindow.setFullScreen(false);\n        } else {\n          this.baseWindow?.hide();\n        }\n      }\n    });',
      '        const terminals = ["gnome-terminal", "konsole", "xfce4-terminal", "xterm"];\n        for (const term of terminals) {\n          try {\n            spawnProcess(term, ["--working-directory", workdir], { detached: true, stdio: "ignore" });\n            return { success: true };\n          } catch {\n            continue;\n          }\n        }\n        return { success: false, message: "No terminal emulator found" };',
      "async function listWorkbenchOpenWithApplications(path2, isDirectory, locale) {",
      '  if (process.platform === "linux") {\n    const zh = isChineseLocale(locale);\n    return [\n      { id: "file-manager", name: zh ? "文件管理器" : "File manager" },\n      { id: "terminal", name: zh ? "终端" : "Terminal" }\n    ];\n  }',
      '  if (process.platform === "linux") {\n    const targetDir = isDirectory ? path2 : dirname$2(path2);\n    if (applicationId === "file-manager") {\n      spawnDetached("xdg-open", [targetDir]);\n      return true;\n    }\n    if (applicationId === "terminal") {\n      spawnDetached("x-terminal-emulator", ["--working-directory", targetDir]);\n      return true;\n    }\n  }',
      "function readLaunchAtLogin() {\n  try {\n    return app.getLoginItemSettings().openAtLogin === true;\n  } catch (err) {\n    KLogMain.warn(TAG$x, `读取登录项失败: ${err instanceof Error ? err.message : String(err)}`);\n    return false;\n  }\n}",
      "function applyLaunchAtLogin(enabled) {\n  try {\n    app.setLoginItemSettings({ openAtLogin: enabled });\n  } catch (err) {\n    KLogMain.error(TAG$x, `设置登录项失败: ${err instanceof Error ? err.message : String(err)}`);\n  }\n}",
      "function syncDockBadgeCount(count, reason, overlayDataUrl) {",
      '    app.setBadgeCount(next);\n    if (process.platform === "darwin") {\n      app.dock?.setBadge(next > 0 ? String(next) : "");\n      scheduleDarwinBadgeRepaint(next, reason);\n    }',
      "function findPidByPort(port) {",
      '    const out2 = execSync(`lsof -iTCP:${port} -sTCP:LISTEN -t`, {\n      timeout: 5e3,\n      encoding: "utf-8"\n    }).trim();\n    const pid = parseInt(out2.split("\\n")[0] ?? "", 10);\n    return Number.isFinite(pid) && pid > 0 ? pid : null;',
      '    } else {\n      const output = execFileSync("lsof", ["-nP", `-iTCP:${port}`, "-sTCP:LISTEN", "-t"], { encoding: "utf8" });\n      for (const line of output.split(/\\r?\\n/)) {\n        const pid = Number(line.trim());\n        if (Number.isFinite(pid) && pid > 0) {\n          pids.add(pid);\n        }\n      }\n    }',
      "function applyWorkSettingsOnStartup() {",
      "  KLogMain.info(TAG$x, `启动重放: keepAwake=${persisted.keepAwake} selectionToolbar=${persisted.selectionToolbarEnabled}`);\n}",
    ].join("\n");
    await writeFile(join(sourceRoot, "out", "main", "index.js"), main);
    await writeFile(join(sourceRoot, "assets", "icon.png"), Buffer.from([137, 80, 78, 71]));

    const sourceAsar = join(directory, "source.asar");
    const outputAsar = join(directory, "output.asar");
    const outputIcon = join(directory, "icon.png");
    await asar.createPackage(sourceRoot, sourceAsar);
    await execFileAsync(process.execPath, [
      new URL("../scripts/patch-asar.mjs", import.meta.url).pathname,
      sourceAsar,
      outputAsar,
      outputIcon,
    ]);

    const patchedRoot = join(directory, "patched");
    asar.extractAll(outputAsar, patchedRoot);
    const patched = await readFile(join(patchedRoot, "out", "main", "index.js"), "utf8");
    assert.match(patched, /linux: "https:\/\/www\.kimi\.com\/neo-ppt\/cli-install\/inside_install\.sh"/);
    assert.match(
      patched,
      /if \(platform === "linux"\) \{\n    return \{\n      url: PPT_TOOLS_SCRIPT_URLS\.linux,/,
    );
    assert.doesNotMatch(patched, /PPT Tools does not provide a Linux installer/);
    assert.match(patched, /function readLinuxLaunchAtLogin\(\)/);
    assert.match(patched, /kimi-work\.desktop/);
    assert.match(
      patched,
      /if \(process\.platform === "linux"\) \{\n      return readLinuxLaunchAtLogin\(\);/,
    );
    assert.match(
      patched,
      /if \(process\.platform === "linux"\) \{\n      applyLinuxLaunchAtLogin\(enabled\);/,
    );
    assert.match(patched, /syncLinuxLauncherBadgeCount/);
    assert.match(patched, /com\.canonical\.Unity\.LauncherEntry\.Update/);
    assert.match(patched, /application:\/\/kimi-work\.desktop/);
    assert.match(patched, /function linuxFindListeningPidsOnPort\(port\)/);
    assert.match(patched, /function warnLinuxRuntimeDepsOnStartup\(\)/);
    assert.match(patched, /warnLinuxRuntimeDepsOnStartup\(\);/);
    assert.match(patched, /linuxFindListeningPidsOnPort\(port\)/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("inside_install.sh installs and upgrades PPT Tools on Linux x64", async (t) => {
  if (process.platform !== "linux" || process.arch !== "x64") {
    t.skip("requires Linux x64 host");
    return;
  }

  const directory = await mkdtemp(join(tmpdir(), "kimi-ppt-install-"));
  try {
    const script = join(directory, "inside_install.sh");
    await writeFile(script, await fetchText(INSIDE_INSTALL_URL), { mode: 0o755 });
    const installDir = join(directory, "bin");

    const first = await execFileAsync("/bin/bash", [script, installDir], {
      cwd: directory,
      maxBuffer: 10 * 1024 * 1024,
    });
    assert.match(first.stdout, /Installed internal PPTD/);
    await access(join(installDir, "kimi-slides"));
    await access(join(installDir, "kimi-tools", "kimi-slides"));
    const stateAfterInstall = await readFile(join(installDir, "kimi-tools", "install-state"), "utf8");
    assert.match(stateAfterInstall, /platform=linux-x64/);
    assert.match(stateAfterInstall, /release_version=/);

    const version = await execFileAsync(join(installDir, "kimi-slides"), ["--version"], {
      maxBuffer: 1024 * 1024,
    });
    assert.match(version.stdout.trim(), /^\d+\.\d+\.\d+/);

    const second = await execFileAsync("/bin/bash", [script, installDir], {
      cwd: directory,
      maxBuffer: 10 * 1024 * 1024,
    });
    assert.doesNotMatch(second.stdout, /Downloading kimi-slides-linux-x64\.zip/);
    assert.match(second.stdout, /Installed internal PPTD/);
    const stateAfterUpgrade = await readFile(join(installDir, "kimi-tools", "install-state"), "utf8");
    assert.equal(stateAfterUpgrade, stateAfterInstall);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
