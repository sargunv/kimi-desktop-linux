import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  binaryHasWaylandSupport,
  linuxClipboardNodeFileName,
  linuxClipboardPackageName,
} from "../scripts/rebuild-clipboard-wayland.mjs";

test("linux clipboard package names follow napi-rs triples", () => {
  assert.equal(
    linuxClipboardPackageName("x64"),
    "@mariozechner/clipboard-linux-x64-gnu",
  );
  assert.equal(
    linuxClipboardPackageName("arm64"),
    "@mariozechner/clipboard-linux-arm64-gnu",
  );
  assert.equal(linuxClipboardNodeFileName("x64"), "clipboard.linux-x64-gnu.node");
  assert.equal(
    linuxClipboardNodeFileName("arm64"),
    "clipboard.linux-arm64-gnu.node",
  );
  assert.throws(() => linuxClipboardPackageName("ppc64"));
});

test("binaryHasWaylandSupport detects Wayland rebuild markers", () => {
  assert.equal(binaryHasWaylandSupport(Buffer.from("x11 only")), false);
  assert.equal(
    binaryHasWaylandSupport(
      Buffer.from(
        "WAYLAND_DISPLAY and Wayland clipboard init failed, falling back to X11",
      ),
    ),
    true,
  );
});

test("rebuild script enables the wayland cargo feature", async () => {
  const source = await readFile(
    new URL("../scripts/rebuild-clipboard-wayland.mjs", import.meta.url),
  );
  assert.match(source.toString("utf8"), /--features", "wayland"/);
  assert.match(source.toString("utf8"), /binaryHasWaylandSupport/);
});
