import { createQr as createQrCore } from "./create-core.js";
import { matrixToPngBuffer } from "./png-node.js";
export {
  matrixToAscii,
  matrixToSvg,
  normalizeOptions,
  parseHexColor,
  snapSize,
  svgDataUrl,
} from "./render-core.js";
export { matrixToPngBuffer } from "./png-node.js";
export { encode } from "./encode.js";

/**
 * Node entry — SVG / PNG / ASCII (lazy).
 * For React / RN / browser use `qroid-qr/react`, `qroid-qr/react-native`, or `qroid-qr/browser`.
 */
export function createQr(text, options = {}) {
  const out = createQrCore(text, options);
  /** @type {{ png?: Buffer, pngB64?: string }} */
  const cache = {};

  Object.defineProperties(out, {
    pngBuffer: {
      enumerable: true,
      get() {
        return (cache.png ??= matrixToPngBuffer(out._qr, out._opts));
      },
    },
    pngBase64: {
      enumerable: true,
      get() {
        return (cache.pngB64 ??= `data:image/png;base64,${this.pngBuffer.toString("base64")}`);
      },
    },
  });

  return out;
}

export default createQr;
