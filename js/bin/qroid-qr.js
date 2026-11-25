#!/usr/bin/env node
import { writeFileSync } from "node:fs";
import { createQr } from "../src/index.js";

function usage() {
  console.log(`qroid-qr — tiny QR generator (square | round)

Usage:
  qroid-qr <text> [options]

Options:
  --style square|round   Module style (default: square)
  --size <n>             Pixel size (default: 256)
  --color <#hex>         Foreground / module color (default: #111111)
  --foreground <#hex>    Alias of --color
  --background <#hex>    Background color (default: #ffffff)
  --padding <n>          Quiet-zone modules (default: 2)
  --level L|M|Q|H        Error correction (default: M)
  --ascii                Print ASCII
  --base64 [png|svg]     Print data-URL base64 (default: png)
  --svg <file>           Write SVG file
  --png <file>           Write PNG file
  --help                 Show help

Examples:
  qroid-qr "https://qroid.com" --ascii
  qroid-qr "hello" --style round --color "#173DA6" --level H --padding 4 --base64
  qroid-qr "hello" --svg out.svg --png out.png
`);
}

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--help" || a === "-h") args.help = true;
    else if (a === "--ascii") args.ascii = true;
    else if (a === "--base64") {
      const next = argv[i + 1];
      if (next && !next.startsWith("-") && (next === "png" || next === "svg")) {
        args.base64 = next;
        i++;
      } else {
        args.base64 = "png";
      }
    } else if (a === "--style" || a === "--shape") args.style = argv[++i];
    else if (a === "--size") args.size = Number(argv[++i]);
    else if (a === "--color" || a === "--foreground") args.color = argv[++i];
    else if (a === "--background") args.background = argv[++i];
    else if (a === "--padding" || a === "--border") args.padding = Number(argv[++i]);
    else if (a === "--level" || a === "--ecc") args.level = argv[++i];
    else if (a === "--svg") args.svg = argv[++i];
    else if (a === "--png") args.png = argv[++i];
    else if (a.startsWith("-")) throw new Error(`Unknown option: ${a}`);
    else args._.push(a);
  }
  return args;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || args._.length === 0) {
    usage();
    process.exit(args.help ? 0 : 1);
  }

  const text = args._.join(" ");
  const out = createQr(text, {
    style: args.style,
    size: args.size,
    color: args.color,
    background: args.background,
    padding: args.padding,
    level: args.level,
  });

  const wroteFile = Boolean(args.svg || args.png);
  const printed =
    args.ascii || args.base64 || (!wroteFile && !args.ascii && !args.base64);

  if (args.ascii || (!wroteFile && !args.base64)) {
    console.log(out.ascii);
  }
  if (args.base64) {
    console.log(args.base64 === "svg" ? out.svgBase64 : out.pngBase64);
  }
  if (args.svg) {
    writeFileSync(args.svg, out.svg, "utf8");
    console.error(`wrote ${args.svg}`);
  }
  if (args.png) {
    writeFileSync(args.png, out.pngBuffer);
    console.error(`wrote ${args.png}`);
  }
  void printed;
}

try {
  main();
} catch (err) {
  console.error(err.message || err);
  process.exit(1);
}
