import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";

/** Same sanitised PATH daimon uses on Linux (see upstream sanitisedPath). */
export const LINUX_DAIMON_PATH = "/usr/bin:/bin:/usr/sbin:/sbin:/usr/local/bin";

/**
 * Check that host `git` is reachable the way daimon will see it.
 * Windows bundles git; macOS assumes Xcode CLT; Linux AppImages expect distro git.
 */
export function checkLinuxGit(
  {
    path = LINUX_DAIMON_PATH,
    env = process.env,
    execFileSyncImpl = execFileSync,
  } = {},
) {
  try {
    const stdout = execFileSyncImpl("git", ["--version"], {
      encoding: "utf8",
      timeout: 3000,
      env: { ...env, PATH: path },
    });
    return { id: "git", ok: true, version: String(stdout ?? "").trim() };
  } catch {
    return {
      id: "git",
      ok: false,
      hint: "Install git from your distro packages (e.g. sudo apt install git).",
    };
  }
}

export function checkLinuxRuntimeDeps(opts = {}) {
  const git = checkLinuxGit(opts);
  return {
    checkedAt: Date.now(),
    deps: [git],
    missingRequired: git.ok ? [] : ["git"],
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  console.log(JSON.stringify(checkLinuxRuntimeDeps(), null, 2));
}
