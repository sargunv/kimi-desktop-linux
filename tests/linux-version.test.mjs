import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import test from "node:test";
import {
  formatLinuxVersion,
  nextLinuxVersion,
  parseLinuxVersion,
} from "../scripts/linux-version.mjs";

const execFileAsync = promisify(execFile);
const script = new URL("../scripts/linux-version.mjs", import.meta.url).pathname;

test("parseLinuxVersion accepts packaging and legacy versions", () => {
  assert.deepEqual(parseLinuxVersion("3.1.2-linux.1"), {
    upstream: "3.1.2",
    revision: 1,
    legacy: false,
  });
  assert.deepEqual(parseLinuxVersion("3.1.2"), {
    upstream: "3.1.2",
    revision: 0,
    legacy: true,
  });
  assert.equal(parseLinuxVersion("3.1.2.1"), null);
  assert.equal(parseLinuxVersion("3.1.2-linux"), null);
});

test("formatLinuxVersion builds x.y.z-linux.N", () => {
  assert.equal(formatLinuxVersion("3.1.2", 1), "3.1.2-linux.1");
  assert.throws(() => formatLinuxVersion("3.1.2", 0));
  assert.throws(() => formatLinuxVersion("3.1.2.1", 1));
});

test("nextLinuxVersion migrates, resets, and bumps revisions", () => {
  assert.equal(nextLinuxVersion("3.1.2", "3.1.2", false), "3.1.2-linux.1");
  assert.equal(nextLinuxVersion("3.1.2", "3.1.2-linux.1", false), null);
  assert.equal(
    nextLinuxVersion("3.1.2", "3.1.2-linux.1", true),
    "3.1.2-linux.2",
  );
  assert.equal(
    nextLinuxVersion("3.1.3", "3.1.2-linux.9", false),
    "3.1.3-linux.1",
  );
  assert.equal(nextLinuxVersion("3.1.2", "not-a-version", false), "3.1.2-linux.1");
});

test("linux-version CLI next prints nothing when unchanged", async () => {
  const { stdout } = await execFileAsync(process.execPath, [
    script,
    "next",
    "3.1.2",
    "3.1.2-linux.4",
    "false",
  ]);
  assert.equal(stdout, "");
});
