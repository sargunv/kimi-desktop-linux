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
  assert.match(source, /vendor', 'npm'/);
  assert.match(source, /Tray\.isSupported\(\)/);
  assert.match(source, /if \(!tray\)/);
  assert.match(source, /xdg-terminal-exec/);
  assert.match(source, /konsole --workdir/);
  assert.match(source, /kreadconfig6/);
  assert.match(source, /TerminalApplication/);
  assert.match(source, /listLinuxWorkbenchOpenWithApplications/);
  assert.match(source, /gio", \["launch"/);
});

test("Linux update manifest matches its AppImage", async () => {
  const directory = await mkdtemp(join(tmpdir(), "kimi-update-test-"));
  try {
    for (const filename of [
      "kimi-work-1.2.3-x86_64.AppImage",
      "kimi-work-1.2.3-aarch64.AppImage",
    ]) {
      const appImage = join(directory, filename);
      const manifest = join(directory, `${filename}.yml`);
      await writeFile(appImage, "test AppImage payload");
      await execFileAsync(process.execPath, [
        new URL("../scripts/write-update-manifest.mjs", import.meta.url).pathname,
        appImage,
        "1.2.3",
        manifest,
      ]);
      const yaml = await readFile(manifest, "utf8");
      assert.match(yaml, /^version: 1\.2\.3$/m);
      assert.match(yaml, new RegExp(`url: ${filename.replace(/\./g, "\\.")}`));
      assert.match(yaml, /size: 21/);
      assert.match(yaml, /sha512: [A-Za-z0-9+/]+=*/);
    }
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("build and package scripts support native x86_64 and aarch64", async () => {
  const build = await readFile(new URL("../scripts/build.sh", import.meta.url), "utf8");
  const pack = await readFile(new URL("../scripts/package-appimage.sh", import.meta.url), "utf8");
  const daimon = await readFile(
    new URL("../scripts/patch-daimon-metadata.mjs", import.meta.url),
    "utf8",
  );
  assert.match(build, /x86_64\)/);
  assert.match(build, /aarch64\)/);
  assert.match(build, /linux-arm64/);
  assert.match(build, /uv-aarch64-unknown-linux-gnu\.tar\.gz/);
  assert.match(build, /WEBBRIDGE_KEY=linux-arm64/);
  assert.doesNotMatch(build, /only Linux x86_64 is supported/);
  assert.match(pack, /APPIMAGE_ARCH=aarch64/);
  assert.match(pack, /latest-linux-arm64\.yml/);
  assert.match(pack, /runtime-aarch64/);
  assert.match(daimon, /linux-arm64/);
  assert.match(daimon, /unsupported daimon platform/);
});
