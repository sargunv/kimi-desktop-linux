import { readFile, writeFile } from "node:fs/promises";

const [bundlePath, platform, pythonAsset, pythonSha256] = process.argv.slice(2);
if (!bundlePath || !platform || !pythonAsset || !pythonSha256) {
  throw new Error(
    "usage: patch-daimon-metadata.mjs BUNDLE_JSON PLATFORM PYTHON_ASSET PYTHON_SHA256",
  );
}
if (platform !== "linux-x64" && platform !== "linux-arm64") {
  throw new Error(`unsupported daimon platform: ${platform}`);
}

const bundle = JSON.parse(await readFile(bundlePath, "utf8"));
bundle.platform = platform;
bundle.runtimes.python.asset = pythonAsset;
bundle.runtimes.python.sha256 = pythonSha256;
await writeFile(bundlePath, `${JSON.stringify(bundle, null, 2)}\n`);
