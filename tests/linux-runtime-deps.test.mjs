import assert from "node:assert/strict";
import test from "node:test";
import {
  LINUX_DAIMON_PATH,
  checkLinuxGit,
  checkLinuxRuntimeDeps,
} from "../scripts/linux-runtime-deps.mjs";

test("checkLinuxGit reports version when git is present", () => {
  const result = checkLinuxGit({
    execFileSyncImpl: (cmd, args, opts) => {
      assert.equal(cmd, "git");
      assert.deepEqual(args, ["--version"]);
      assert.equal(opts.env.PATH, LINUX_DAIMON_PATH);
      return "git version 2.43.0\n";
    },
  });
  assert.deepEqual(result, { id: "git", ok: true, version: "git version 2.43.0" });
});

test("checkLinuxGit reports missing git with install hint", () => {
  const result = checkLinuxGit({
    execFileSyncImpl: () => {
      throw Object.assign(new Error("not found"), { code: "ENOENT" });
    },
  });
  assert.equal(result.id, "git");
  assert.equal(result.ok, false);
  assert.match(result.hint, /apt install git/);
});

test("checkLinuxRuntimeDeps lists missing required deps", () => {
  const ok = checkLinuxRuntimeDeps({
    execFileSyncImpl: () => "git version 2.43.0\n",
  });
  assert.deepEqual(ok.missingRequired, []);
  assert.equal(ok.deps[0].ok, true);

  const missing = checkLinuxRuntimeDeps({
    execFileSyncImpl: () => {
      throw new Error("missing");
    },
  });
  assert.deepEqual(missing.missingRequired, ["git"]);
});
