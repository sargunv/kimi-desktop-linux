import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";

/**
 * Parse `ss -lptn` output for listening process IDs.
 * Example line:
 *   LISTEN 0 128 127.0.0.1:10086 0.0.0.0:* users:(("kimi-webbridge",pid=1234,fd=3))
 */
export function parseSsListeningPids(output) {
  const pids = [];
  const seen = new Set();
  for (const line of String(output ?? "").split(/\r?\n/)) {
    for (const match of line.matchAll(/pid=(\d+)/g)) {
      const pid = Number(match[1]);
      if (Number.isFinite(pid) && pid > 0 && !seen.has(pid)) {
        seen.add(pid);
        pids.push(pid);
      }
    }
  }
  return pids;
}

/**
 * Find PIDs listening on a TCP port using `ss` (iproute2).
 * Prefer this over `lsof` on Linux: modern desktops ship `ss`, while `lsof`
 * is often a separate package and was a silent failure point for WebBridge
 * stale-port recovery.
 */
export function findLinuxListeningPidsOnPort(
  port,
  execFileSyncImpl = execFileSync,
) {
  const n = Number(port);
  if (!Number.isInteger(n) || n <= 0 || n > 65535) {
    return [];
  }
  try {
    const output = execFileSyncImpl("ss", ["-H", "-lptn", `sport = :${n}`], {
      encoding: "utf8",
      timeout: 3000,
      maxBuffer: 64 * 1024,
    });
    return parseSsListeningPids(output);
  } catch {
    return [];
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const port = Number(process.argv[2]);
  if (!Number.isInteger(port)) {
    console.error("usage: linux-port-pids.mjs PORT");
    process.exit(2);
  }
  console.log(JSON.stringify(findLinuxListeningPidsOnPort(port)));
}
