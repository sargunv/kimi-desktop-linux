import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const [gatewayDir] = process.argv.slice(2);
if (!gatewayDir) throw new Error("usage: prepare-gateway.mjs GATEWAY_DIR");

const packagePath = join(gatewayDir, "package.json");
const lockPath = join(gatewayDir, "package-lock.json");
const packageJson = JSON.parse(await readFile(packagePath, "utf8"));
const lock = JSON.parse(await readFile(lockPath, "utf8"));

for (const name of ["openclaw", "clawhub"]) {
  const version = lock.packages?.[`node_modules/${name}`]?.version;
  if (!version) throw new Error(`bundled lockfile has no version for ${name}`);
  packageJson.dependencies[name] = version;
}

await writeFile(packagePath, `${JSON.stringify(packageJson, null, 2)}\n`);

