import { createElement, useMemo } from "react";
import { SvgXml } from "react-native-svg";
import { createQr } from "./create-core.js";

/**
 * React Native QR — SVG via `react-native-svg` (peer dependency).
 *
 * Use `shape` / `qrStyle` for square|round (not `style` — that is RN layout).
 *
 * @param {{
 *   value: string,
 *   size?: number,
 *   shape?: 'square'|'round',
 *   qrStyle?: 'square'|'round',
 *   color?: string,
 *   foreground?: string,
 *   background?: string,
 *   padding?: number,
 *   level?: 'L'|'M'|'Q'|'H',
 *   mask?: number,
 *   style?: object,
 *   [key: string]: unknown,
 * }} props
 */
export function QrCode(props) {
  const {
    value,
    size = 256,
    shape,
    qrStyle,
    color,
    foreground,
    background,
    padding,
    level,
    mask,
    style,
    ...rest
  } = props;

  const moduleStyle = shape || qrStyle || "square";

  const qr = useMemo(
    () =>
      createQr(value, {
        size,
        style: moduleStyle,
        color,
        foreground,
        background,
        padding,
        level,
        mask,
      }),
    [
      value,
      size,
      moduleStyle,
      color,
      foreground,
      background,
      padding,
      level,
      mask,
    ]
  );

  return createElement(SvgXml, {
    xml: qr.svg,
    width: qr.size,
    height: qr.size,
    style,
    ...rest,
  });
}

/**
 * Hook — memoized QR outputs for custom RN rendering.
 * @param {string} value
 * @param {object} [options]
 */
export function useQr(value, options = {}) {
  return useMemo(() => createQr(value, options), [
    value,
    options.size,
    options.style,
    options.shape,
    options.qrStyle,
    options.color,
    options.foreground,
    options.background,
    options.padding,
    options.level,
    options.mask,
    options.maskPattern,
  ]);
}

export { createQr } from "./create-core.js";
export default QrCode;
