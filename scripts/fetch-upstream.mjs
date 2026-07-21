import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { mkdir, rename, rm, stat } from "node:fs/promises";
import { basename, join, resolve } from "node:path";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";

const manifestUrl = new URL(
  process.env.KIMI_UPSTREAM_MANIFEST_URL ??
    "https://kimi-img.moonshot.cn/app/upgrade/latest-mac.yml",
);
const cacheDir = resolve(process.argv[3] ?? ".cache/downloads");
const command = process.argv[2] ?? "fetch";

function scalar(yaml, pattern, name) {
  const match = yaml.match(pattern);
  if (!match) throw new Error(`upstream manifest has no ${name}`);
  return match[1].trim().replace(/^(['"])(.*)\1$/, "$2");
}

function parseManifest(yaml) {
  const version = scalar(yaml, /^version:\s*(.+)$/m, "version");
  const file = scalar(yaml, /^\s+- url:\s*(.+)$/m, "file URL");
  const sha512 = scalar(yaml, /^\s+sha512:\s*(.+)$/m, "SHA-512");
  const size = Number(scalar(yaml, /^\s+size:\s*(\d+)$/m, "file size"));

  if (!/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(version)) {
    throw new Error(`invalid upstream version: ${version}`);
  }
  if (Buffer.from(sha512, "base64").length !== 64) {
    throw new Error("invalid upstream SHA-512");
  }

  const url = new URL(file, manifestUrl);
  if (url.protocol !== "https:" || url.origin !== manifestUrl.origin) {
    throw new Error(`refusing cross-origin upstream archive: ${url}`);
  }
  return { version, url, sha512, size };
}

async function sha512(file) {
  const hash = createHash("sha512");
  for await (const chunk of createReadStream(file)) hash.update(chunk);
  return hash.digest("base64");
}

async function verify(file, release) {
  const fileStat = await stat(file);
  if (fileStat.size !== release.size) {
    throw new Error(
      `${basename(file)} has size ${fileStat.size}, expected ${release.size}`,
    );
  }
  const actual = await sha512(file);
  if (actual !== release.sha512) {
    throw new Error(`SHA-512 mismatch for ${basename(file)}`);
  }
}

const response = await fetch(manifestUrl, { cache: "no-store" });
if (!response.ok) {
  throw new Error(`failed to fetch ${manifestUrl}: HTTP ${response.status}`);
}
const release = parseManifest(await response.text());

if (command === "version") {
  console.log(release.version);
} else if (command === "fetch") {
  await mkdir(cacheDir, { recursive: true });
  const output = join(cacheDir, basename(release.url.pathname));
  let valid = false;
  try {
    await verify(output, release);
    valid = true;
  } catch (error) {
    if (error?.code !== "ENOENT") console.error(`Discarding cache: ${error.message}`);
  }

  if (!valid) {
    const temporary = `${output}.part`;
    await rm(temporary, { force: true });
    const archive = await fetch(release.url);
    if (!archive.ok || !archive.body) {
      throw new Error(`failed to fetch ${release.url}: HTTP ${archive.status}`);
    }
    await pipeline(Readable.fromWeb(archive.body), temporary);
    try {
      await verify(temporary, release);
      await rename(temporary, output);
    } catch (error) {
      await rm(temporary, { force: true });
      throw error;
    }
  }
  console.log(output);
} else {
  throw new Error("usage: fetch-upstream.mjs <version|fetch> [CACHE_DIR]");
}
