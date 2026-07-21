import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { stat, writeFile } from "node:fs/promises";
import { basename } from "node:path";

const [appImage, version, output] = process.argv.slice(2);
if (!appImage || !version || !output) {
  throw new Error(
    "usage: write-update-manifest.mjs APPIMAGE VERSION OUTPUT_YML",
  );
}

const hash = createHash("sha512");
for await (const chunk of createReadStream(appImage)) hash.update(chunk);
const sha512 = hash.digest("base64");
const size = (await stat(appImage)).size;
const filename = basename(appImage);
const releaseDate = new Date().toISOString();

await writeFile(
  output,
  `version: ${version}\nfiles:\n  - url: ${filename}\n    sha512: ${sha512}\n    size: ${size}\npath: ${filename}\nsha512: ${sha512}\nreleaseDate: '${releaseDate}'\n`,
);
