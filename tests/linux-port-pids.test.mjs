import assert from "node:assert/strict";
import test from "node:test";
import {
  findLinuxListeningPidsOnPort,
  parseSsListeningPids,
} from "../scripts/linux-port-pids.mjs";

test("parseSsListeningPids extracts unique pids", () => {
  const sample = `LISTEN 0 128 127.0.0.1:10086 0.0.0.0:* users:(("kimi-webbridge",pid=1234,fd=3))
LISTEN 0 128 [::1]:10086 [::]:* users:(("kimi-webbridge",pid=1234,fd=4))
LISTEN 0 128 0.0.0.0:8080 0.0.0.0:* users:(("node",pid=99,fd=1),("node",pid=100,fd=2))
`;
  assert.deepEqual(parseSsListeningPids(sample), [1234, 99, 100]);
  assert.deepEqual(parseSsListeningPids(""), []);
});

test("findLinuxListeningPidsOnPort uses ss and rejects bad ports", () => {
  const calls = [];
  const exec = (cmd, args) => {
    calls.push({ cmd, args });
    return 'LISTEN 0 128 127.0.0.1:10086 0.0.0.0:* users:(("wb",pid=4242,fd=3))\n';
  };
  assert.deepEqual(findLinuxListeningPidsOnPort(10086, exec), [4242]);
  assert.equal(calls[0].cmd, "ss");
  assert.deepEqual(calls[0].args, ["-H", "-lptn", "sport = :10086"]);
  assert.deepEqual(findLinuxListeningPidsOnPort(0, exec), []);
  assert.deepEqual(findLinuxListeningPidsOnPort("nope", exec), []);
});

test("findLinuxListeningPidsOnPort returns [] when ss fails", () => {
  assert.deepEqual(
    findLinuxListeningPidsOnPort(10086, () => {
      throw new Error("ENOENT");
    }),
    [],
  );
});
