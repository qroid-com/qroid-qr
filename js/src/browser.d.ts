import type { QrCoreResult, QrOptions } from "./index.js";

export type { QrCoreResult, QrErrorLevel, QrMatrix, QrOptions, QrStyle } from "./index.js";
export {
  encode,
  matrixToAscii,
  matrixToSvg,
  normalizeOptions,
  parseHexColor,
  snapSize,
  svgDataUrl,
} from "./index.js";

export function createQr(text: string, options?: QrOptions): QrCoreResult;
export default createQr;
