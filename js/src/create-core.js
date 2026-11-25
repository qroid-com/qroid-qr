import { encode } from "./encode.js";
import {
  matrixToAscii,
  matrixToSvg,
  normalizeOptions,
  snapSize,
  svgDataUrl,
  utf8ToBase64,
} from "./render-core.js";

/**
 * Universal QR (browser / RN / Node) — SVG + ASCII, no Node zlib.
 *
 * @param {string} text
 * @param {object} [options]
 */
export function createQr(text, options = {}) {
  if (text == null || String(text).length === 0) {
    throw new Error("text is required");
  }
  const opts = normalizeOptions(options);
  const qr = encode(String(text), {
    ecc: opts.level,
    border: opts.padding,
    maskPattern: opts.mask,
    boostEcc: false,
  });
  opts.size = snapSize(opts.size, qr.size)[0];

  /** @type {{ svg?: string, ascii?: string, svgB64?: string, dataUrl?: string }} */
  const cache = {};

  const out = {
    size: opts.size,
    style: opts.style,
    shape: opts.style,
    level: opts.level,
    padding: opts.padding,
    /** @internal */
    _qr: qr,
    /** @internal */
    _opts: opts,
  };

  Object.defineProperties(out, {
    svg: {
      enumerable: true,
      get() {
        return (cache.svg ??= matrixToSvg(qr, opts));
      },
    },
    svgBase64: {
      enumerable: true,
      get() {
        return (cache.svgB64 ??= `data:image/svg+xml;base64,${utf8ToBase64(this.svg)}`);
      },
    },
    svgDataUrl: {
      enumerable: true,
      get() {
        return (cache.dataUrl ??= svgDataUrl(this.svg));
      },
    },
    ascii: {
      enumerable: true,
      get() {
        return (cache.ascii ??= matrixToAscii(qr));
      },
    },
  });

  return out;
}

export default createQr;
