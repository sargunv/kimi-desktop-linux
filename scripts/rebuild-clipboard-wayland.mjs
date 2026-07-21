import { spawnSync } from "node:child_process";
import { access, copyFile, readFile, readdir } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const rootDir = join(dirname(fileURLToPath(import.meta.url)), "..");

export function linuxClipboardPackageName(arch = process.arch) {
  if (arch === "x64") return "@mariozechner/clipboard-linux-x64-gnu";
  if (arch === "arm64") return "@mariozechner/clipboard-linux-arm64-gnu";
  throw new Error(`unsupported clipboard arch: ${arch}`);
}

export function linuxClipboardNodeFileName(arch = process.arch) {
  if (arch === "x64") return "clipboard.linux-x64-gnu.node";
  if (arch === "arm64") return "clipboard.linux-arm64-gnu.node";
  throw new Error(`unsupported clipboard arch: ${arch}`);
}

export function binaryHasWaylandSupport(buffer) {
  return buffer.includes(Buffer.from("WAYLAND_DISPLAY")) &&
    buffer.includes(Buffer.from("Wayland clipboard init failed"));
}

async function pathExists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

function requireCommand(name) {
  const result = spawnSync(name, ["--version"], { encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error(
      `missing ${name}; install a current Rust toolchain (rustc/cargo) to rebuild clipboard with Wayland support`,
    );
  }
}

function resolveNapiCli() {
  const require = createRequire(join(rootDir, "package.json"));
  let packageJsonPath;
  try {
    packageJsonPath = require.resolve("@napi-rs/cli/package.json");
  } catch {
    throw new Error(
      "missing @napi-rs/cli; run pnpm install in the repository root",
    );
  }
  const packageJson = require(packageJsonPath);
  const bin = packageJson.bin?.napi ?? packageJson.bin;
  if (typeof bin !== "string") {
    throw new Error("@napi-rs/cli package.json is missing a napi bin entry");
  }
  return join(dirname(packageJsonPath), bin);
}

async function findClipboardPackage(gatewayDir) {
  const direct = join(
    gatewayDir,
    "node_modules",
    "@mariozechner",
    "clipboard",
  );
  if (await pathExists(join(direct, "Cargo.toml"))) return direct;

  // npm may nest optional natives under openclaw/pi-coding-agent.
  const stack = [join(gatewayDir, "node_modules")];
  while (stack.length > 0) {
    const dir = stack.pop();
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const path = join(dir, entry.name);
      if (entry.name === "clipboard" && dir.endsWith("@mariozechner")) {
        if (await pathExists(join(path, "Cargo.toml"))) return path;
      }
      if (entry.name === "node_modules" || entry.name.startsWith("@")) {
        stack.push(path);
      } else if (!entry.name.startsWith(".")) {
        const nested = join(path, "node_modules");
        if (await pathExists(nested)) stack.push(nested);
      }
    }
  }
  throw new Error(`gateway has no @mariozechner/clipboard under ${gatewayDir}`);
}

export async function rebuildClipboardWayland(gatewayDir, arch = process.arch) {
  requireCommand("rustc");
  requireCommand("cargo");

  const clipboardDir = await findClipboardPackage(gatewayDir);
  const nodeFileName = linuxClipboardNodeFileName(arch);
  const platformPackage = linuxClipboardPackageName(arch);
  const napiCli = resolveNapiCli();

  const build = spawnSync(
    process.execPath,
    [napiCli, "build", "--platform", "--release", "--features", "wayland"],
    {
      cwd: clipboardDir,
      encoding: "utf8",
      env: process.env,
    },
  );
  if (build.status !== 0) {
    throw new Error(
      `napi clipboard rebuild failed:\n${build.stdout}\n${build.stderr}`,
    );
  }

  const builtNode = join(clipboardDir, nodeFileName);
  if (!(await pathExists(builtNode))) {
    throw new Error(`clipboard rebuild did not produce ${nodeFileName}`);
  }

  const binary = await readFile(builtNode);
  if (!binaryHasWaylandSupport(binary)) {
    throw new Error(
      "rebuilt clipboard binary is missing Wayland support markers",
    );
  }

  // Prefer the optional platform package used by index.js, and keep a copy next
  // to the main package for the same loader's relative require.
  const platformDir = join(
    gatewayDir,
    "node_modules",
    ...platformPackage.split("/"),
  );
  if (await pathExists(platformDir)) {
    await copyFile(builtNode, join(platformDir, nodeFileName));
  }

  return { clipboardDir, builtNode, platformPackage, nodeFileName };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [gatewayDir] = process.argv.slice(2);
  if (!gatewayDir) {
    throw new Error("usage: rebuild-clipboard-wayland.mjs GATEWAY_DIR");
  }
  const result = await rebuildClipboardWayland(gatewayDir);
  console.log(
    `Rebuilt ${result.platformPackage} with Wayland support at ${result.builtNode}`,
  );
}
