import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

test("ASAR patcher contains fail-closed replacement counts", async () => {
  const source = await readFile(new URL("../scripts/patch-asar.mjs", import.meta.url), "utf8");
  assert.match(source, /expected: 2/);
  assert.match(source, /actual !== replacement\.expected/);
  assert.match(source, /Menu\.setApplicationMenu\(null\)/);
  assert.match(source, /process\.platform === \"linux\"/);
  assert.match(source, /KIMI_UPDATE_TOKEN/);
  assert.match(source, /allowPrerelease = true/);
  assert.match(source, /KIMI_LINUX_VERSION/);
  assert.match(source, /vendor', 'npm'/);
  assert.match(source, /Tray\.isSupported\(\)/);
  assert.match(source, /if \(!tray\)/);
  assert.match(source, /xdg-terminal-exec/);
  assert.match(source, /konsole --workdir/);
  assert.match(source, /kreadconfig6/);
  assert.match(source, /TerminalApplication/);
  assert.match(source, /listLinuxWorkbenchOpenWithApplications/);
  assert.match(source, /gio", \["launch"/);
  assert.match(source, /neo-ppt\/cli-install\/inside_install\.sh/);
  assert.match(source, /PPT_TOOLS_SCRIPT_URLS\.linux/);
  assert.doesNotMatch(source, /PPT Tools does not provide a Linux installer/);
});

test("Linux update manifest matches its AppImage", async () => {
  const directory = await mkdtemp(join(tmpdir(), "kimi-update-test-"));
  try {
    const appImage = join(directory, "kimi-work-1.2.3-linux.1-x86_64.AppImage");
    const manifest = join(directory, "latest-linux.yml");
    await writeFile(appImage, "test AppImage payload");
    await execFileAsync(process.execPath, [
      new URL("../scripts/write-update-manifest.mjs", import.meta.url).pathname,
      appImage,
      "1.2.3-linux.1",
      manifest,
    ]);
    const yaml = await readFile(manifest, "utf8");
    assert.match(yaml, /^version: 1\.2\.3-linux\.1$/m);
    assert.match(yaml, /url: kimi-work-1\.2\.3-linux\.1-x86_64\.AppImage/);
    assert.match(yaml, /size: 21/);
    assert.match(yaml, /sha512: [A-Za-z0-9+/]+=*/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
