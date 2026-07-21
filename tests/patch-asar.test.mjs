import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("ASAR patcher contains fail-closed replacement counts", async () => {
  const source = await readFile(new URL("../scripts/patch-asar.mjs", import.meta.url), "utf8");
  assert.match(source, /expected: 2/);
  assert.match(source, /actual !== replacement\.expected/);
  assert.match(source, /Menu\.setApplicationMenu\(null\)/);
  assert.match(source, /process\.platform === \"linux\"/);
});
