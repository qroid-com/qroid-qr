import assert from "node:assert/strict";
import { test } from "node:test";
import { createQr } from "../src/browser.js";

test("browser createQr has svg + dataUrl, no png", () => {
  const out = createQr("https://qroid.com", { size: 128, style: "round" });
  assert.match(out.svg, /^<svg /);
  assert.match(out.svg, /<circle /);
  assert.match(out.svgDataUrl, /^data:image\/svg\+xml/);
  assert.ok(out.ascii.includes("██"));
  assert.equal(out.pngBuffer, undefined);
  assert.equal(out.pngBase64, undefined);
});
