/**
 * Browser / bundler entry — SVG + ASCII (no Node zlib).
 * @example
 * import { createQr, QrCode } from 'qroid-qr/browser'
 */
export { createQr, createQr as default } from "./create-core.js";
export {
  matrixToAscii,
  matrixToSvg,
  normalizeOptions,
  parseHexColor,
  snapSize,
  svgDataUrl,
} from "./render-core.js";
export { encode } from "./encode.js";
