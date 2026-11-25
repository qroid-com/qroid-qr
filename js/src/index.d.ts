export type QrStyle = "square" | "round";
export type QrErrorLevel = "L" | "M" | "Q" | "H";

export interface QrOptions {
  size?: number;
  style?: QrStyle;
  shape?: QrStyle;
  color?: string;
  foreground?: string;
  dark?: string;
  background?: string;
  light?: string;
  padding?: number;
  border?: number;
  level?: QrErrorLevel;
  ecc?: QrErrorLevel;
  mask?: number;
  maskPattern?: number;
}

export interface QrCoreResult {
  readonly size: number;
  readonly style: QrStyle;
  readonly shape: QrStyle;
  readonly level: QrErrorLevel;
  readonly padding: number;
  readonly svg: string;
  readonly svgBase64: string;
  readonly svgDataUrl: string;
  readonly ascii: string;
}

export interface QrNodeResult extends QrCoreResult {
  readonly pngBuffer: Buffer;
  readonly pngBase64: string;
}

export interface QrMatrix {
  version: number;
  maskPattern: number;
  size: number;
  data: boolean[][];
  types: number[][];
}

export function createQr(text: string, options?: QrOptions): QrNodeResult;
export default createQr;

export function encode(
  data: string | number[],
  options?: {
    ecc?: QrErrorLevel;
    boostEcc?: boolean;
    minVersion?: number;
    maxVersion?: number;
    maskPattern?: number;
    border?: number;
    invert?: boolean;
  }
): QrMatrix;

export function matrixToSvg(
  qr: { size: number; data: boolean[][] },
  opts: { size: number; color: string; background: string; shape: QrStyle; padding?: number }
): string;
export function matrixToAscii(qr: { data: boolean[][] }): string;
export function matrixToPngBuffer(
  qr: { size: number; data: boolean[][] },
  opts: { size: number; color: string; background: string; shape: QrStyle; padding?: number }
): Buffer;
export function normalizeOptions(options?: QrOptions): Required<
  Pick<QrOptions, "size" | "color" | "background" | "style" | "shape" | "padding" | "border" | "level" | "mask">
>;
export function parseHexColor(hex: string): [number, number, number];
export function snapSize(size: number, moduleCount: number): [number, number];
export function svgDataUrl(svg: string): string;
