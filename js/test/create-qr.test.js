import assert from "node:assert/strict";
import { test } from "node:test";
import { createQr } from "../src/index.js";

test("square svg + png + ascii + level", () => {
  const out = createQr("https://qroid.com", {
    size: 128,
    style: "square",
    color: "#111111",
    background: "#ffffff",
    padding: 3,
    level: "H",
  });
  assert.match(out.svg, /^<svg /);
  assert.match(out.pngBase64, /^data:image\/png;base64,/);
  assert.match(out.svgBase64, /^data:image\/svg\+xml;base64,/);
  assert.ok(out.pngBuffer.length > 100);
  assert.ok(out.ascii.includes("██"));
  assert.equal(out.style, "square");
  assert.equal(out.level, "H");
  assert.equal(out.padding, 3);
});

test("round style + foreground alias", () => {
  const out = createQr("hello", {
    size: 128,
    style: "round",
    foreground: "#173DA6",
  });
  assert.match(out.svg, /<circle /);
  assert.equal(out.style, "round");
  assert.ok(out.ascii.includes("██"));
});

test("rejects empty text", () => {
  assert.throws(() => createQr(""), /required/);
});
