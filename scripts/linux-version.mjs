#!/usr/bin/env node

import { pathToFileURL } from "node:url";

const UPSTREAM_RE = /^(\d+\.\d+\.\d+)$/;
const LINUX_RE = /^(\d+\.\d+\.\d+)-linux\.(\d+)$/;

export function parseLinuxVersion(version) {
  const linux = String(version ?? "").trim().match(LINUX_RE);
  if (linux) {
    return { upstream: linux[1], revision: Number(linux[2]), legacy: false };
  }
  const upstream = String(version ?? "").trim().match(UPSTREAM_RE);
  if (upstream) {
    return { upstream: upstream[1], revision: 0, legacy: true };
  }
  return null;
}

export function formatLinuxVersion(upstream, revision) {
  const upstreamVersion = String(upstream ?? "").trim();
  if (!UPSTREAM_RE.test(upstreamVersion)) {
    throw new Error(`invalid upstream version: ${upstream}`);
  }
  const rev = Number(revision);
  if (!Number.isInteger(rev) || rev < 1) {
    throw new Error(`invalid linux packaging revision: ${revision}`);
  }
  return `${upstreamVersion}-linux.${rev}`;
}

/**
 * Decide the next Linux packaging version to publish.
 * Returns null when no rebuild is needed.
 *
 * - New upstream → `upstream-linux.1`
 * - Legacy plain `x.y.z` in latest-linux.yml → migrate to `x.y.z-linux.1`
 * - force on an existing `x.y.z-linux.N` → `x.y.z-linux.(N+1)`
 */
export function nextLinuxVersion(upstream, previousPackaged, force = false) {
  const upstreamVersion = String(upstream ?? "").trim();
  if (!UPSTREAM_RE.test(upstreamVersion)) {
    throw new Error(`invalid upstream version: ${upstream}`);
  }

  const previous = parseLinuxVersion(previousPackaged);
  if (!previous || previous.upstream !== upstreamVersion) {
    return formatLinuxVersion(upstreamVersion, 1);
  }
  if (previous.legacy) {
    return formatLinuxVersion(upstreamVersion, 1);
  }
  if (force) {
    return formatLinuxVersion(upstreamVersion, previous.revision + 1);
  }
  return null;
}

function usage() {
  throw new Error(
    "usage: linux-version.mjs <parse|format|next> ...\n" +
      "  parse VERSION\n" +
      "  format UPSTREAM REVISION\n" +
      "  next UPSTREAM PREVIOUS_PACKAGED [true|false]",
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [command, ...args] = process.argv.slice(2);
  if (command === "parse") {
    const parsed = parseLinuxVersion(args[0]);
    if (!parsed) throw new Error(`invalid linux packaging version: ${args[0]}`);
    console.log(`${parsed.upstream}\t${parsed.revision}\t${parsed.legacy}`);
  } else if (command === "format") {
    console.log(formatLinuxVersion(args[0], args[1]));
  } else if (command === "next") {
    const force = args[2] === "true" || args[2] === "1";
    const next = nextLinuxVersion(args[0], args[1], force);
    if (next) console.log(next);
  } else {
    usage();
  }
}
