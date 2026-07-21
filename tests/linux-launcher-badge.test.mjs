import assert from "node:assert/strict";
import test from "node:test";
import {
  LINUX_LAUNCHER_DESKTOP_ID,
  LINUX_LAUNCHER_ENTRY_IFACE,
  buildLinuxLauncherBadgeGdbusArgs,
  glibStrHash,
  linuxLauncherEntryAppUri,
  linuxLauncherEntryObjectPath,
  linuxLauncherEntryPropertiesVariant,
  sanitizeLauncherBadgeCount,
} from "../scripts/linux-launcher-badge.mjs";

test("glibStrHash matches GLib g_str_hash for the shipped desktop id", () => {
  // Precomputed with GLib-compatible uint32 rolling hash of "kimi-work.desktop".
  assert.equal(glibStrHash(LINUX_LAUNCHER_DESKTOP_ID), 723841703);
  assert.equal(
    linuxLauncherEntryObjectPath(),
    "/com/canonical/unity/launcherentry/723841703",
  );
});

test("sanitizeLauncherBadgeCount floors and clamps", () => {
  assert.equal(sanitizeLauncherBadgeCount(3.9), 3);
  assert.equal(sanitizeLauncherBadgeCount(-1), 0);
  assert.equal(sanitizeLauncherBadgeCount(Number.NaN), 0);
  assert.equal(sanitizeLauncherBadgeCount(Infinity), 0);
});

test("gdbus emit args target kimi-work.desktop LauncherEntry", () => {
  assert.equal(linuxLauncherEntryAppUri(), "application://kimi-work.desktop");
  assert.equal(
    linuxLauncherEntryPropertiesVariant(3),
    "{'count': <int64 3>, 'count-visible': <true>}",
  );
  assert.equal(
    linuxLauncherEntryPropertiesVariant(0),
    "{'count': <int64 0>, 'count-visible': <false>}",
  );

  const args = buildLinuxLauncherBadgeGdbusArgs(2);
  assert.deepEqual(args.slice(0, 6), [
    "emit",
    "--session",
    "--object-path",
    "/com/canonical/unity/launcherentry/723841703",
    "--signal",
    `${LINUX_LAUNCHER_ENTRY_IFACE}.Update`,
  ]);
  assert.equal(args[6], "application://kimi-work.desktop");
  assert.equal(args[7], "{'count': <int64 2>, 'count-visible': <true>}");
});
