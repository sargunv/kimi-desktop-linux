import { readFile, writeFile } from "node:fs/promises";

const [bundlePath, pythonAsset, pythonSha256] = process.argv.slice(2);
if (!bundlePath || !pythonAsset || !pythonSha256) {
  throw new Error(
    "usage: patch-daimon-metadata.mjs BUNDLE_JSON PYTHON_ASSET PYTHON_SHA256",
  );
}

const bundle = JSON.parse(await readFile(bundlePath, "utf8"));
bundle.platform = "linux-x64";
bundle.runtimes.python.asset = pythonAsset;
bundle.runtimes.python.sha256 = pythonSha256;
await writeFile(bundlePath, `${JSON.stringify(bundle, null, 2)}\n`);

