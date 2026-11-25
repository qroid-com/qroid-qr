import type { CSSProperties, ImgHTMLAttributes, ReactElement } from "react";
import type { QrCoreResult, QrErrorLevel, QrOptions, QrStyle } from "./index.js";

export interface QrCodeProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, "style" | "src" | "width" | "height"> {
  value: string;
  size?: number;
  style?: QrStyle;
  shape?: QrStyle;
  color?: string;
  foreground?: string;
  background?: string;
  padding?: number;
  level?: QrErrorLevel;
  mask?: number;
  alt?: string;
  className?: string;
  imgStyle?: CSSProperties;
  imgProps?: ImgHTMLAttributes<HTMLImageElement>;
}

export function QrCode(props: QrCodeProps): ReactElement;
export function useQr(value: string, options?: QrOptions): QrCoreResult;
export function createQr(text: string, options?: QrOptions): QrCoreResult;
export default QrCode;
