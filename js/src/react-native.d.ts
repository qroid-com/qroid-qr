import type { ReactElement } from "react";
import type { QrCoreResult, QrErrorLevel, QrOptions, QrStyle } from "./index.js";

export interface QrCodeNativeProps {
  value: string;
  size?: number;
  shape?: QrStyle;
  qrStyle?: QrStyle;
  color?: string;
  foreground?: string;
  background?: string;
  padding?: number;
  level?: QrErrorLevel;
  mask?: number;
  style?: Record<string, unknown>;
  [key: string]: unknown;
}

export function QrCode(props: QrCodeNativeProps): ReactElement;
export function useQr(value: string, options?: QrOptions & { qrStyle?: QrStyle }): QrCoreResult;
export function createQr(text: string, options?: QrOptions): QrCoreResult;
export default QrCode;
