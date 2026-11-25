import { createElement, useMemo } from "react";
import { createQr } from "./create-core.js";

/**
 * @typedef {object} QrCodeProps
 * @property {string} value
 * @property {number} [size]
 * @property {'square'|'round'} [style]
 * @property {'square'|'round'} [shape]
 * @property {string} [color]
 * @property {string} [foreground]
 * @property {string} [background]
 * @property {number} [padding]
 * @property {'L'|'M'|'Q'|'H'} [level]
 * @property {number} [mask]
 * @property {string} [alt]
 * @property {string} [className]
 * @property {import('react').CSSProperties} [styleProp]  // use `imgStyle` instead
 * @property {import('react').CSSProperties} [imgStyle]
 * @property {import('react').ImgHTMLAttributes<HTMLImageElement>} [imgProps]
 */

/**
 * React (web) QR — renders as <img> with SVG data-URL (no Node deps).
 *
 * @param {QrCodeProps & Record<string, unknown>} props
 */
export function QrCode(props) {
  const {
    value,
    size = 256,
    style = "square",
    shape,
    color,
    foreground,
    background,
    padding,
    level,
    mask,
    alt = "",
    className,
    imgStyle,
    imgProps,
    ...rest
  } = props;

  const qr = useMemo(
    () =>
      createQr(value, {
        size,
        style: shape || style,
        color,
        foreground,
        background,
        padding,
        level,
        mask,
      }),
    [value, size, style, shape, color, foreground, background, padding, level, mask]
  );

  return createElement("img", {
    src: qr.svgDataUrl,
    width: qr.size,
    height: qr.size,
    alt,
    className,
    style: { display: "inline-block", ...imgStyle },
    ...imgProps,
    ...rest,
  });
}

/**
 * Hook — memoized QR outputs for custom rendering.
 * @param {string} value
 * @param {object} [options]
 */
export function useQr(value, options = {}) {
  return useMemo(() => createQr(value, options), [
    value,
    options.size,
    options.style,
    options.shape,
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
