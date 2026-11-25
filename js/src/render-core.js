const DEFAULTS = {
  size: 256,
  color: "#111111",
  background: "#ffffff",
  shape: "square",
  border: 2,
};

/**
 * @param {string} hex
 * @returns {[number, number, number]}
 */
export function parseHexColor(hex) {
  const h = String(hex || "")
    .trim()
    .replace(/^#/, "");
  const full =
    h.length === 3
      ? h
          .split("")
          .map((c) => c + c)
          .join("")
      : h;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) {
    throw new Error(`Invalid color: ${hex}`);
  }
  const n = parseInt(full, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/**
 * @param {number} n
 * @param {number} padding
 */
function finderOrigins(n, padding) {
  const p = Math.max(0, padding | 0);
  if (n < p * 2 + 7) return [];
  return [
    [p, p],
    [n - p - 7, p],
    [p, n - p - 7],
  ];
}

/** @param {number} n @param {number} padding */
export function roundEyes(n, padding) {
  const p = Math.max(0, padding | 0);
  const eyes = finderOrigins(n, padding).map(([ox, oy]) => ({
    minX: ox,
    maxX: ox + 6,
    minY: oy,
    maxY: oy + 6,
    cx: ox + 3.5,
    cy: oy + 3.5,
    kind: "finder",
  }));
  const core = n - 2 * p;
  if (core >= 25) {
    const cx = p + (core - 7) + 0.5;
    const cy = p + (core - 7) + 0.5;
    eyes.push({
      minX: Math.floor(cx - 2.5),
      maxX: Math.floor(cx + 2.5),
      minY: Math.floor(cy - 2.5),
      maxY: Math.floor(cy + 2.5),
      cx,
      cy,
      kind: "align",
    });
  }
  return eyes;
}

/** @param {number} n @param {ReturnType<typeof roundEyes>} eyes */
export function eyeMask(n, eyes) {
  const mask = new Uint8Array(n * n);
  for (const e of eyes) {
    for (let y = e.minY; y <= e.maxY; y++) {
      for (let x = e.minX; x <= e.maxX; x++) {
        if (x >= 0 && y >= 0 && x < n && y < n) mask[y * n + x] = 1;
      }
    }
  }
  return mask;
}

/** Snap to integer module size (faster + sharper). @returns {[outSize, modulePx]} */
export function snapSize(size, n) {
  const m = Math.max(1, Math.round(size / n));
  return [m * n, m];
}

/**
 * @param {{ size: number, data: boolean[][] }} qr
 * @param {{ size: number, color: string, background: string, shape: 'square'|'round', padding?: number }} opts
 */
export function matrixToSvg(qr, opts) {
  const { size: reqSize, color, background, shape, padding = 2 } = opts;
  const n = qr.size;
  const [pixelSize, module] = snapSize(reqSize, n);
  const data = qr.data;

  if (shape === "round") {
    const eyes = roundEyes(n, padding);
    const mask = eyeMask(n, eyes);
    const parts = [
      `<svg xmlns="http://www.w3.org/2000/svg" width="${pixelSize}" height="${pixelSize}" viewBox="0 0 ${pixelSize} ${pixelSize}">`,
      `<rect width="100%" height="100%" fill="${background}"/>`,
    ];
    for (const e of eyes) {
      const cx = e.cx * module;
      const cy = e.cy * module;
      const radii =
        e.kind === "align" ? [2.5, 1.5, 0.5] : [3.5, 2.5, 1.5];
      parts.push(
        `<circle cx="${cx}" cy="${cy}" r="${radii[0] * module}" fill="${color}"/>`,
        `<circle cx="${cx}" cy="${cy}" r="${radii[1] * module}" fill="${background}"/>`,
        `<circle cx="${cx}" cy="${cy}" r="${radii[2] * module}" fill="${color}"/>`
      );
    }
    const r = module * 0.4;
    let d = "";
    for (let y = 0; y < n; y++) {
      const row = data[y];
      const yOff = y * n;
      for (let x = 0; x < n; x++) {
        if (!row[x] || mask[yOff + x]) continue;
        const cx = (x + 0.5) * module;
        const cy = (y + 0.5) * module;
        d += `M${cx - r},${cy}a${r},${r} 0 1,0 ${r * 2},0a${r},${r} 0 1,0 ${-r * 2},0`;
      }
    }
    if (d) parts.push(`<path fill="${color}" d="${d}"/>`);
    parts.push("</svg>");
    return parts.join("");
  }

  let d = "";
  for (let y = 0; y < n; y++) {
    const row = data[y];
    const y0 = y * module;
    for (let x = 0; x < n; x++) {
      if (!row[x]) continue;
      const x0 = x * module;
      d += `M${x0},${y0}h${module}v${module}h${-module}z`;
    }
  }
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${pixelSize}" height="${pixelSize}" viewBox="0 0 ${pixelSize} ${pixelSize}">` +
    `<rect width="100%" height="100%" fill="${background}"/>` +
    (d ? `<path fill="${color}" d="${d}"/>` : "") +
    `</svg>`
  );
}

/**
 * ASCII is always square blocks (style only affects SVG/PNG).
 * @param {{ data: boolean[][] }} qr
 */
export function matrixToAscii(qr) {
  const data = qr.data;
  const lines = new Array(data.length);
  for (let y = 0; y < data.length; y++) {
    const row = data[y];
    let s = "";
    for (let x = 0; x < row.length; x++) s += row[x] ? "██" : "  ";
    lines[y] = s;
  }
  return lines.join("\n");
}

const LEVELS = new Set(["L", "M", "Q", "H"]);

export function normalizeOptions(options = {}) {
  const styleRaw = options.style ?? options.shape;
  const style = styleRaw === "round" ? "round" : "square";
  const size = Math.max(64, Math.min(2048, Number(options.size) || DEFAULTS.size));
  const color =
    options.foreground ||
    options.color ||
    options.dark ||
    DEFAULTS.color;
  const background =
    options.background || options.light || DEFAULTS.background;
  const paddingRaw =
    options.padding ?? options.border ?? DEFAULTS.border;
  const padding = Math.max(0, Math.min(16, Number(paddingRaw)));
  const levelRaw = String(options.level || options.ecc || "M").toUpperCase();
  const level = LEVELS.has(levelRaw) ? levelRaw : "M";
  let mask = options.maskPattern ?? options.mask;
  mask = mask == null ? 0 : Number(mask);
  if (!Number.isFinite(mask) || mask < -1 || mask > 7) mask = 0;
  parseHexColor(color);
  parseHexColor(background);
  return {
    size,
    color,
    background,
    style,
    shape: style,
    padding,
    border: padding,
    level,
    mask,
  };
}

/** UTF-8 → base64 without Node Buffer (browser / RN). */
export function utf8ToBase64(str) {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(str, "utf8").toString("base64");
  }
  const bytes = new TextEncoder().encode(str);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

export function svgDataUrl(svg) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
