import assert from "node:assert/strict";
import { mkdtemp, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  linuxOpenWithLaunchArgs,
  listLinuxOpenWithApplications,
  parseGioContentType,
  parseGioMimeDesktopIds,
  readDesktopName,
  resolveDesktopFile,
} from "../scripts/linux-open-with.mjs";

test("parse gio content-type and mime desktop ids", () => {
  assert.equal(
    parseGioContentType("attributes:\n  standard::content-type: text/plain\n"),
    "text/plain",
  );
  assert.deepEqual(
    parseGioMimeDesktopIds(`Default application for “text/plain”: emacs.desktop
Registered applications:
	emacs.desktop
	vim.desktop
Recommended applications:
	emacs.desktop
`),
    ["emacs.desktop", "vim.desktop"],
  );
});

test("resolve desktop files and names from XDG dirs", async () => {
  const root = await mkdtemp(join(tmpdir(), "kimi-open-with-"));
  const apps = join(root, "applications");
  await mkdir(apps);
  const desktop = join(apps, "demo-editor.desktop");
  await writeFile(desktop, "[Desktop Entry]\nName=Demo Editor\nExec=true %f\n");
  assert.equal(resolveDesktopFile("demo-editor.desktop", [apps]), desktop);
  assert.equal(readDesktopName(desktop, "fallback"), "Demo Editor");
  assert.equal(resolveDesktopFile("../demo-editor.desktop", [apps]), null);
});

test("open-with launch args cover stubs and gio launch", async () => {
  const root = await mkdtemp(join(tmpdir(), "kimi-open-with-launch-"));
  const apps = join(root, "applications");
  await mkdir(apps);
  const desktop = join(apps, "demo-editor.desktop");
  await writeFile(desktop, "[Desktop Entry]\nName=Demo Editor\nExec=true %f\n");
  const previousDataHome = process.env.XDG_DATA_HOME;
  const previousDataDirs = process.env.XDG_DATA_DIRS;
  process.env.XDG_DATA_HOME = root;
  process.env.XDG_DATA_DIRS = root;
  try {
    assert.deepEqual(linuxOpenWithLaunchArgs("file-manager", "/tmp/file.txt", false, "shell"), {
      command: "xdg-open",
      args: ["/tmp"],
    });
    assert.deepEqual(linuxOpenWithLaunchArgs("terminal", "/tmp/file.txt", false, "shell"), {
      command: "sh",
      args: ["-c", "shell", "kimi-open-terminal", "/tmp"],
    });
    assert.deepEqual(linuxOpenWithLaunchArgs("demo-editor.desktop", "/tmp/file.txt", false, "shell"), {
      command: "gio",
      args: ["launch", desktop, "/tmp/file.txt"],
    });
    assert.equal(linuxOpenWithLaunchArgs("missing.desktop", "/tmp/file.txt", false, "shell"), null);
  } finally {
    if (previousDataHome === undefined) delete process.env.XDG_DATA_HOME;
    else process.env.XDG_DATA_HOME = previousDataHome;
    if (previousDataDirs === undefined) delete process.env.XDG_DATA_DIRS;
    else process.env.XDG_DATA_DIRS = previousDataDirs;
  }
});

test("list open-with apps against the host gio database", async (t) => {
  const apps = await listLinuxOpenWithApplications({ path: "/etc/passwd", locale: "en" });
  assert.equal(apps[0]?.id, "file-manager");
  assert.equal(apps[1]?.id, "terminal");
  // Headless CI images often lack gio MIME handler desktop files.
  if (!apps.some((app) => app.id.endsWith(".desktop"))) {
    t.skip("host has no gio MIME desktop handlers");
  }
});
