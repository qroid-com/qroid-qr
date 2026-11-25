import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const __dirname = dirname(fileURLToPath(import.meta.url));

test("standalone CDN bundle exposes QroidQr & renders data-qroid-qr elements", () => {
  const code = readFileSync(
    resolve(__dirname, "../dist/qroid-qr.min.js"),
    "utf8"
  );
  const el = {
    innerHTML: "",
    getAttribute(k) {
      const attrs = {
        "data-qroid-qr": "https://qroid.com",
        "data-style": "round",
        "data-color": "#173DA6",
        "data-size": "200",
      };
      return attrs[k] ?? null;
    },
  };
  const sandbox = {
    window: {},
    document: {
      readyState: "complete",
      querySelectorAll: () => [el],
    },
    TextEncoder,
    btoa: (s) => Buffer.from(s, "binary").toString("base64"),
  };
  vm.runInNewContext(code, sandbox);

  assert.ok(sandbox.window.QroidQr);
  assert.match(el.innerHTML, /^<svg /);
  assert.match(el.innerHTML, /<circle /);
  assert.match(el.innerHTML, /#173DA6/);
});
