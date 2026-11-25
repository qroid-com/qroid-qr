/** @deprecated Prefer `render-core.js` + `png-node.js`. Kept for compatibility. */
export {
  matrixToAscii,
  matrixToSvg,
  normalizeOptions,
  parseHexColor,
  snapSize,
  svgDataUrl,
  utf8ToBase64,
} from "./render-core.js";
export { matrixToPngBuffer } from "./png-node.js";
