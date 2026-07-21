import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  applyLinuxLaunchAtLogin,
  buildLinuxAutostartDesktopEntry,
  isLinuxLaunchAtLoginEnabled,
  linuxAutostartDesktopPath,
  linuxAutostartExecPath,
  quoteDesktopExecArg,
  sanitizeDesktopName,
  xdgAutostartDir,
} from "../scripts/linux-launch-at-login.mjs";

test("xdg autostart path honors XDG_CONFIG_HOME", () => {
  const env = { XDG_CONFIG_HOME: "/tmp/kimi-config" };
  assert.equal(xdgAutostartDir(env, "/home/user"), "/tmp/kimi-config/autostart");
  assert.equal(
    linuxAutostartDesktopPath(env, "/home/user"),
    "/tmp/kimi-config/autostart/kimi-work.desktop",
  );
});

test("xdg autostart path falls back to ~/.config", () => {
  const env = {};
  assert.equal(xdgAutostartDir(env, "/home/user"), "/home/user/.config/autostart");
});

test("AppImage path is preferred for Exec", () => {
  assert.equal(
    linuxAutostartExecPath({
      APPIMAGE: " /opt/Kimi Work.AppImage ",
      execPath: "/usr/bin/kimi-work",
    }),
    "/opt/Kimi Work.AppImage",
  );
  assert.equal(
    linuxAutostartExecPath({ APPIMAGE: "", execPath: "/usr/bin/kimi-work" }),
    "/usr/bin/kimi-work",
  );
});

test("desktop entry quoting and naming", () => {
  assert.equal(quoteDesktopExecArg('/tmp/a"b\\c'), '"/tmp/a\\"b\\\\c"');
  assert.equal(sanitizeDesktopName("Kimi\nWork"), "Kimi Work");
  const entry = buildLinuxAutostartDesktopEntry({
    name: "Kimi Work",
    execPath: "/opt/Kimi Work.AppImage",
  });
  assert.match(entry, /^\[Desktop Entry\]$/m);
  assert.match(entry, /^Type=Application$/m);
  assert.match(entry, /^Name=Kimi Work$/m);
  assert.match(entry, /^Exec="\/opt\/Kimi Work\.AppImage"$/m);
  assert.match(entry, /^X-GNOME-Autostart-enabled=true$/m);
  assert.match(entry, /^StartupWMClass=Kimi$/m);
});

test("enable and disable write and remove the autostart desktop file", async () => {
  const root = await mkdtemp(join(tmpdir(), "kimi-autostart-"));
  const env = { XDG_CONFIG_HOME: root, APPIMAGE: `${root}/Kimi Work.AppImage` };
  try {
    assert.equal(isLinuxLaunchAtLoginEnabled(env), false);
    const enabled = applyLinuxLaunchAtLogin(true, {
      env,
      home: root,
      name: "Kimi Work",
      APPIMAGE: env.APPIMAGE,
      execPath: "/should/not/use",
    });
    assert.equal(enabled.enabled, true);
    assert.equal(isLinuxLaunchAtLoginEnabled(env), true);
    const body = await readFile(enabled.path, "utf8");
    assert.match(body, /^Exec=".*Kimi Work\.AppImage"$/m);
    assert.doesNotMatch(body, /should\/not\/use/);

    const disabled = applyLinuxLaunchAtLogin(false, { env, home: root });
    assert.equal(disabled.enabled, false);
    assert.equal(isLinuxLaunchAtLoginEnabled(env), false);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
