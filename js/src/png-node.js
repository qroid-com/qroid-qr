import { deflateSync } from "node:zlib";
import {
  eyeMask,
  parseHexColor,
  roundEyes,
  snapSize,
} from "./render-core.js";

/** CRC-32 (ISO 3309) — tiny table, no pngjs. */
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function encodePngRaw(size, raw) {
  const compressed = deflateSync(raw, { level: 0 });
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", compressed),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

function fillCircle(rgb, size, cx, cy, r, fr, fg, fb) {
  const r2 = r * r;
  const y0 = Math.max(0, Math.floor(cy - r));
  const y1 = Math.min(size - 1, Math.ceil(cy + r));
  const x0 = Math.max(0, Math.floor(cx - r));
  const x1 = Math.min(size - 1, Math.ceil(cx + r));
  for (let py = y0; py <= y1; py++) {
    const dy = py + 0.5 - cy;
    const dy2 = dy * dy;
    let o = (py * size + x0) * 3;
    for (let px = x0; px <= x1; px++, o += 3) {
      const dx = px + 0.5 - cx;
      if (dx * dx + dy2 <= r2) {
        rgb[o] = fr;
        rgb[o + 1] = fg;
        rgb[o + 2] = fb;
      }
    }
  }
}

/**
 * Node-only PNG (uses node:zlib + Buffer).
 * @param {{ size: number, data: boolean[][] }} qr
 * @param {{ size: number, color: string, background: string, shape: 'square'|'round', padding?: number }} opts
 */
export function matrixToPngBuffer(qr, opts) {
  const { size: reqSize, color, background, shape, padding = 2 } = opts;
  const [fr, fg, fb] = parseHexColor(color);
  const [br, bg, bb] = parseHexColor(background);
  const n = qr.size;
  const data = qr.data;
  const [outSize, m] = snapSize(reqSize, n);
  const module = m;

  if (shape !== "round") {
    const dark = Buffer.from([fr, fg, fb]);
    const light = Buffer.from([br, bg, bb]);
    const darkBlock = Buffer.allocUnsafe(m * 3);
    const lightBlock = Buffer.allocUnsafe(m * 3);
    for (let i = 0; i < m; i++) {
      dark.copy(darkBlock, i * 3);
      light.copy(lightBlock, i * 3);
    }
    const rowBytes = outSize * 3;
    const stride = 1 + rowBytes;
    const raw = Buffer.allocUnsafe(outSize * stride);
    const pixelRow = Buffer.allocUnsafe(rowBytes);
    for (let y = 0; y < n; y++) {
      const row = data[y];
      for (let x = 0; x < n; x++) {
        (row[x] ? darkBlock : lightBlock).copy(pixelRow, x * m * 3);
      }
      const base = y * m * stride;
      for (let dy = 0; dy < m; dy++) {
        const ri = base + dy * stride;
        raw[ri] = 0;
        pixelRow.copy(raw, ri + 1);
      }
    }
    return encodePngRaw(outSize, raw);
  }

  const rgb = Buffer.allocUnsafe(outSize * outSize * 3);
  rgb[0] = br;
  rgb[1] = bg;
  rgb[2] = bb;
  for (let len = 3; len < rgb.length; ) {
    const copy = Math.min(len, rgb.length - len);
    rgb.copy(rgb, len, 0, copy);
    len += copy;
  }
  const eyes = roundEyes(n, padding);
  const mask = eyeMask(n, eyes);
  for (const e of eyes) {
    const cx = e.cx * module;
    const cy = e.cy * module;
    const radii = e.kind === "align" ? [2.5, 1.5, 0.5] : [3.5, 2.5, 1.5];
    fillCircle(rgb, outSize, cx, cy, radii[0] * module, fr, fg, fb);
    fillCircle(rgb, outSize, cx, cy, radii[1] * module, br, bg, bb);
    fillCircle(rgb, outSize, cx, cy, radii[2] * module, fr, fg, fb);
  }
  const r = module * 0.4;
  for (let y = 0; y < n; y++) {
    const row = data[y];
    const yOff = y * n;
    for (let x = 0; x < n; x++) {
      if (!row[x] || mask[yOff + x]) continue;
      fillCircle(rgb, outSize, (x + 0.5) * module, (y + 0.5) * module, r, fr, fg, fb);
    }
  }
  const rowBytes = outSize * 3;
  const stride = 1 + rowBytes;
  const raw = Buffer.allocUnsafe(outSize * stride);
  for (let y = 0; y < outSize; y++) {
    const ri = y * stride;
    raw[ri] = 0;
    rgb.copy(raw, ri + 1, y * rowBytes, (y + 1) * rowBytes);
  }
  return encodePngRaw(outSize, raw);
}
