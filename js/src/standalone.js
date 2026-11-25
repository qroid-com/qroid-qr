import { createQr } from "./create-core.js";
import { svgDataUrl } from "./render-core.js";

function readAttr(el, ...names) {
  for (const name of names) {
    const v = el.getAttribute(name);
    if (v != null && v !== "") return v;
  }
  return undefined;
}

function readQrOptions(el) {
  const rawStyleAttr = el.getAttribute("style");
  const shorthandStyle =
    rawStyleAttr === "round" || rawStyleAttr === "square"
      ? rawStyleAttr
      : undefined;

  const shape =
    readAttr(el, "shape", "qr-style", "data-style", "data-shape") ||
    shorthandStyle ||
    "square";
  const sizeAttr = readAttr(el, "size", "data-size");
  const padAttr = readAttr(el, "padding", "border", "data-padding");

  return {
    style: shape,
    size: sizeAttr != null ? Number(sizeAttr) : 256,
    color: readAttr(el, "color", "foreground", "data-color", "data-foreground"),
    background: readAttr(el, "background", "data-background"),
    padding: padAttr != null ? Number(padAttr) : undefined,
    level: readAttr(el, "level", "ecc", "data-level"),
  };
}

/**
 * Render a QR SVG into any DOM element (`<div data-qroid-qr="...">` etc.).
 * @param {Element} el
 */
export function renderElement(el) {
  const value = readAttr(el, "value", "data-qroid-qr", "data-value");
  if (!value) return null;
  const qr = createQr(value, readQrOptions(el));
  el.innerHTML = qr.svg;
  return qr;
}

/**
 * Auto-render all `[data-qroid-qr]` elements inside `root`.
 * @param {ParentNode} [root]
 */
export function renderAll(root) {
  if (typeof document === "undefined") return;
  const scope = root || document;
  const nodes = scope.querySelectorAll("[data-qroid-qr]");
  for (let i = 0; i < nodes.length; i++) renderElement(nodes[i]);
}

/**
 * Browser helper: rasterize SVG QR to a PNG `data:image/png;base64,...` via Canvas.
 * @param {string} text
 * @param {object} [options]
 * @returns {Promise<string>}
 */
export function toPngDataUrl(text, options = {}) {
  const qr = createQr(text, options);
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = qr.size;
      canvas.height = qr.size;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, qr.size, qr.size);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = reject;
    img.src = qr.svgDataUrl;
  });
}

// Register `<qroid-qr>` Web Component when running in a browser
if (
  typeof window !== "undefined" &&
  typeof HTMLElement !== "undefined" &&
  typeof customElements !== "undefined" &&
  !customElements.get("qroid-qr")
) {
  class QroidQrElement extends HTMLElement {
    static get observedAttributes() {
      return [
        "value",
        "shape",
        "qr-style",
        "size",
        "color",
        "foreground",
        "background",
        "padding",
        "border",
        "level",
        "ecc",
      ];
    }

    constructor() {
      super();
      this._root = this.attachShadow({ mode: "open" });
    }

    connectedCallback() {
      this._render();
    }

    attributeChangedCallback() {
      if (this.isConnected) this._render();
    }

    _render() {
      const value =
        readAttr(this, "value", "data-value") ||
        (this.textContent || "").trim();
      if (!value) {
        this._root.innerHTML = "";
        return;
      }
      try {
        const qr = createQr(value, readQrOptions(this));
        this._root.innerHTML = `<style>:host{display:inline-block;line-height:0}svg{display:block;max-width:100%;height:auto}</style>${qr.svg}`;
      } catch {
        this._root.innerHTML = "";
      }
    }
  }

  customElements.define("qroid-qr", QroidQrElement);
}

const QroidQr = {
  createQr,
  svgDataUrl,
  renderElement,
  renderAll,
  toPngDataUrl,
};

if (typeof window !== "undefined") {
  window.QroidQr = QroidQr;
  if (typeof document !== "undefined") {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => renderAll(), {
        once: true,
      });
    } else {
      renderAll();
    }
  }
}

export { createQr, svgDataUrl };
export default QroidQr;
