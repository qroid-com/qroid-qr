#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { gzipSync } from "node:zlib";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, "..");
const repoDir = resolve(rootDir, "..");

const ORDER = [
  "src/encode.js",
  "src/render-core.js",
  "src/create-core.js",
  "src/standalone.js",
];

function stripModuleSyntax(code) {
  return (
    code
      // remove multiline & single-line import statements
      .replace(/^\s*import\s+[\s\S]*?from\s+["'][^"']+["'];?\s*$/gm, "")
      // remove `export default ...`
      .replace(/^\s*export\s+default\s+[^;\n]+;?\s*$/gm, "")
      // remove `export { ... }`
      .replace(/^\s*export\s*\{[\s\S]*?\};?\s*$/gm, "")
      // `export function` / `export const` -> `function` / `const`
      .replace(/^\s*export\s+(?=(?:async\s+)?function\b|const\b|let\b|class\b)/gm, "")
  );
}

function compactSafe(code) {
  return (
    code
      // strip standalone block comments (JSDoc / license blocks inside body)
      .replace(/^\s*\/\*[\s\S]*?\*\/\s*$/gm, "")
      // strip full-line `//` comments
      .replace(/^\s*\/\/.*$/gm, "")
      // trim leading/trailing horizontal whitespace per line
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .join("\n")
  );
}

const chunks = ORDER.map((rel) =>
  stripModuleSyntax(readFileSync(resolve(rootDir, rel), "utf8"))
);

const banner = `/*! qroid-qr v0.1.0 | MIT (c) Qroid (https://qroid.com) | Includes Nayuki QR (MIT) */\n`;

const bundleReadable = `${banner}(function () {\n"use strict";\n${chunks.join("\n\n")}\n})();\n`;
const bundleMin = `${banner}(function(){"use strict";\n${compactSafe(chunks.join("\n"))}\n})();\n`;

// Smoke-test the minified IIFE in an isolated VM context before writing
const sandbox = {
  window: {},
  document: { readyState: "complete", querySelectorAll: () => [] },
  TextEncoder,
  btoa: (s) => Buffer.from(s, "binary").toString("base64"),
  Uint8Array,
  Uint32Array,
  Math,
  Number,
  String,
  Array,
  Object,
  Set,
  Map,
  RegExp,
  Error,
  RangeError,
};
vm.runInNewContext(bundleMin, sandbox);
const testQr = sandbox.window.QroidQr.createQr("https://qroid.com", {
  style: "round",
  size: 180,
});
if (!testQr.svg.startsWith("<svg") || !testQr.svg.includes("<circle")) {
  throw new Error("Standalone bundle smoke test failed");
}

mkdirSync(resolve(rootDir, "dist"), { recursive: true });
mkdirSync(resolve(repoDir, "docs"), { recursive: true });

writeFileSync(resolve(rootDir, "dist/qroid-qr.js"), bundleReadable, "utf8");
writeFileSync(resolve(rootDir, "dist/qroid-qr.min.js"), bundleMin, "utf8");
writeFileSync(resolve(repoDir, "docs/qroid-qr.min.js"), bundleMin, "utf8");

const gz = gzipSync(Buffer.from(bundleMin, "utf8"));
console.log(
  `built standalone: raw=${(bundleMin.length / 1024).toFixed(1)} KB, gzip=${(gz.length / 1024).toFixed(1)} KB`
);
