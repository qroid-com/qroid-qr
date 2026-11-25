from __future__ import annotations

import base64
import struct
import zlib
from functools import cached_property
from typing import List, Sequence, Tuple

from .encode import QrCode, QrSegment

DEFAULT_SIZE = 256
DEFAULT_COLOR = "#111111"
DEFAULT_BACKGROUND = "#ffffff"
LEVELS = {"L", "M", "Q", "H"}
_ECC = {
    "L": QrCode.Ecc.LOW,
    "M": QrCode.Ecc.MEDIUM,
    "Q": QrCode.Ecc.QUARTILE,
    "H": QrCode.Ecc.HIGH,
}


def parse_hex_color(hex_color: str) -> Tuple[int, int, int]:
    h = str(hex_color or "").strip().lstrip("#")
    if len(h) == 3:
        h = "".join(c * 2 for c in h)
    if len(h) != 6 or any(c not in "0123456789abcdefABCDEF" for c in h):
        raise ValueError(f"Invalid color: {hex_color}")
    n = int(h, 16)
    return (n >> 16) & 255, (n >> 8) & 255, n & 255


def _matrix_from_text(
    text: str, border: int, error: str, mask: int = 0
) -> List[List[bool]]:
    # Fixed mask (default 0) skips 8-way penalty search — ~4–5× faster, still valid QR.
    # Pass mask=-1 for classic auto-select.
    ecl = _ECC.get(error.upper(), QrCode.Ecc.MEDIUM)
    segs = QrSegment.make_segments(str(text))
    qr = QrCode.encode_segments(
        segs, ecl, mask=mask, boostecl=False
    )
    core: List[List[bool]] = qr._modules  # noqa: SLF001 — avoid per-cell get_module
    n = qr.get_size()
    b = max(0, int(border))
    if b == 0:
        return [row[:] for row in core]
    out_n = n + 2 * b
    blank = [False] * out_n
    out: List[List[bool]] = [blank[:] for _ in range(b)]
    pad = [False] * b
    for row in core:
        out.append(pad + row[:] + pad)
    out.extend(blank[:] for _ in range(b))
    return out


def _snap_size(size: int, n: int) -> tuple[int, int]:
    """Integer module pixels → size is multiple of n (faster + sharper)."""
    m = max(1, int(round(size / n)))
    return m * n, m


def _finder_origins(n: int, padding: int) -> list[tuple[int, int]]:
    p = max(0, int(padding))
    if n < p * 2 + 7:
        return []
    return [(p, p), (n - p - 7, p), (p, n - p - 7)]


def _round_eyes(n: int, padding: int) -> list[dict]:
    p = max(0, int(padding))
    eyes = [
        {
            "minX": ox,
            "maxX": ox + 6,
            "minY": oy,
            "maxY": oy + 6,
            "cx": ox + 3.5,
            "cy": oy + 3.5,
            "kind": "finder",
        }
        for ox, oy in _finder_origins(n, padding)
    ]
    core = n - 2 * p
    if core >= 25:
        ac = p + (core - 7)
        eyes.append(
            {
                "minX": ac - 2,
                "maxX": ac + 2,
                "minY": ac - 2,
                "maxY": ac + 2,
                "cx": ac + 0.5,
                "cy": ac + 0.5,
                "kind": "align",
            }
        )
    return eyes


def _eye_mask(n: int, eyes: list[dict]) -> bytearray:
    mask = bytearray(n * n)
    for e in eyes:
        for y in range(e["minY"], e["maxY"] + 1):
            base = y * n
            for x in range(e["minX"], e["maxX"] + 1):
                if 0 <= x < n and 0 <= y < n:
                    mask[base + x] = 1
    return mask


def matrix_to_svg(
    matrix: Sequence[Sequence[bool]],
    *,
    size: int,
    color: str,
    background: str,
    shape: str,
    padding: int = 2,
) -> str:
    n = len(matrix)
    size, m = _snap_size(size, n)
    module = float(m)
    head = (
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{size}" height="{size}" '
        f'viewBox="0 0 {size} {size}">'
        f'<rect width="100%" height="100%" fill="{background}"/>'
    )

    if shape == "round":
        eyes = _round_eyes(n, padding)
        mask = _eye_mask(n, eyes)
        parts = [head]
        for e in eyes:
            cx = e["cx"] * module
            cy = e["cy"] * module
            radii = (2.5, 1.5, 0.5) if e["kind"] == "align" else (3.5, 2.5, 1.5)
            parts.append(
                f'<circle cx="{cx}" cy="{cy}" r="{radii[0] * module}" fill="{color}"/>'
                f'<circle cx="{cx}" cy="{cy}" r="{radii[1] * module}" fill="{background}"/>'
                f'<circle cx="{cx}" cy="{cy}" r="{radii[2] * module}" fill="{color}"/>'
            )
        r = module * 0.4
        d_parts: list[str] = []
        for y, row in enumerate(matrix):
            yoff = y * n
            for x, dark in enumerate(row):
                if not dark or mask[yoff + x]:
                    continue
                cx = (x + 0.5) * module
                cy = (y + 0.5) * module
                d_parts.append(
                    f"M{cx - r},{cy}a{r},{r} 0 1,0 {r * 2},0a{r},{r} 0 1,0 {-r * 2},0"
                )
        if d_parts:
            parts.append(f'<path fill="{color}" d="{"".join(d_parts)}"/>')
        parts.append("</svg>")
        return "".join(parts)

    d_parts = []
    for y, row in enumerate(matrix):
        y0 = y * module
        for x, dark in enumerate(row):
            if not dark:
                continue
            x0 = x * module
            d_parts.append(f"M{x0},{y0}h{module}v{module}h{-module}z")
    body = f'<path fill="{color}" d="{"".join(d_parts)}"/>' if d_parts else ""
    return head + body + "</svg>"


def matrix_to_ascii(matrix: Sequence[Sequence[bool]]) -> str:
    """Compact half-block Unicode QR (true 1:1 square aspect ratio, scannable on dark bg)."""
    n = len(matrix)
    lines: list[str] = []
    for y in range(0, n, 2):
        top_row = matrix[y]
        bot_row = matrix[y + 1] if y + 1 < n else None
        chars: list[str] = []
        for x in range(n):
            t = top_row[x]
            b = bot_row[x] if bot_row is not None else False
            if not t and not b:
                chars.append("█")
            elif not t and b:
                chars.append("▀")
            elif t and not b:
                chars.append("▄")
            else:
                chars.append(" ")
        lines.append("".join(chars))
    return "\n".join(lines)


def _png_chunk(tag: bytes, data: bytes) -> bytes:
    return (
        struct.pack(">I", len(data))
        + tag
        + data
        + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)
    )


def matrix_to_png_bytes(
    matrix: Sequence[Sequence[bool]],
    *,
    size: int,
    color: str,
    background: str,
    shape: str,
    padding: int = 2,
) -> bytes:
    fr, f_g, fb = parse_hex_color(color)
    br, b_g, bb = parse_hex_color(background)
    n = len(matrix)
    out_size, m = _snap_size(size, n)
    module = float(m)

    if shape != "round":
        # Fast square path: build filtered PNG rows by module strips
        dark_block = bytes((fr, f_g, fb)) * m
        light_block = bytes((br, b_g, bb)) * m
        row_bytes = out_size * 3
        stride = 1 + row_bytes
        raw = bytearray(out_size * stride)
        pixel_row = bytearray(row_bytes)
        for y in range(n):
            row = matrix[y]
            for x in range(n):
                pixel_row[x * m * 3 : (x + 1) * m * 3] = (
                    dark_block if row[x] else light_block
                )
            base = y * m * stride
            for dy in range(m):
                ri = base + dy * stride
                raw[ri] = 0
                raw[ri + 1 : ri + 1 + row_bytes] = pixel_row
        compressed = zlib.compress(raw, 0)
        ihdr = struct.pack(">IIBBBBB", out_size, out_size, 8, 2, 0, 0, 0)
        return (
            b"\x89PNG\r\n\x1a\n"
            + _png_chunk(b"IHDR", ihdr)
            + _png_chunk(b"IDAT", compressed)
            + _png_chunk(b"IEND", b"")
        )

    # Round style — pixel buffer + circles
    buf = bytearray(bytes((br, b_g, bb)) * (out_size * out_size))

    def fill_circle(cx: float, cy: float, r: float, rgb: Tuple[int, int, int]) -> None:
        r2 = r * r
        y0 = max(0, int(cy - r))
        y1 = min(out_size - 1, int(cy + r) + 1)
        x0 = max(0, int(cx - r))
        x1 = min(out_size - 1, int(cx + r) + 1)
        cr, cg, cb = rgb
        for py in range(y0, y1 + 1):
            dy = py + 0.5 - cy
            dy2 = dy * dy
            o = (py * out_size + x0) * 3
            for px in range(x0, x1 + 1):
                dx = px + 0.5 - cx
                if dx * dx + dy2 <= r2:
                    buf[o] = cr
                    buf[o + 1] = cg
                    buf[o + 2] = cb
                o += 3

    fore = (fr, f_g, fb)
    back = (br, b_g, bb)
    eyes = _round_eyes(n, padding)
    mask = _eye_mask(n, eyes)
    for e in eyes:
        cx = e["cx"] * module
        cy = e["cy"] * module
        radii = (2.5, 1.5, 0.5) if e["kind"] == "align" else (3.5, 2.5, 1.5)
        fill_circle(cx, cy, radii[0] * module, fore)
        fill_circle(cx, cy, radii[1] * module, back)
        fill_circle(cx, cy, radii[2] * module, fore)
    r = module * 0.4
    for y, row in enumerate(matrix):
        yoff = y * n
        for x, dark in enumerate(row):
            if not dark or mask[yoff + x]:
                continue
            fill_circle((x + 0.5) * module, (y + 0.5) * module, r, fore)

    row_bytes = out_size * 3
    stride = 1 + row_bytes
    raw = bytearray(out_size * stride)
    for y in range(out_size):
        ri = y * stride
        raw[ri] = 0
        start = y * row_bytes
        raw[ri + 1 : ri + 1 + row_bytes] = buf[start : start + row_bytes]
    compressed = zlib.compress(raw, 0)
    ihdr = struct.pack(">IIBBBBB", out_size, out_size, 8, 2, 0, 0, 0)
    return (
        b"\x89PNG\r\n\x1a\n"
        + _png_chunk(b"IHDR", ihdr)
        + _png_chunk(b"IDAT", compressed)
        + _png_chunk(b"IEND", b"")
    )


class QrResult:
    """Lazy SVG / PNG / ASCII — computed on first access."""

    __slots__ = (
        "_matrix",
        "size",
        "style",
        "shape",
        "level",
        "padding",
        "_color",
        "_background",
        "__dict__",
    )

    def __init__(
        self,
        matrix: List[List[bool]],
        *,
        size: int,
        style: str,
        level: str,
        padding: int,
        color: str,
        background: str,
    ) -> None:
        self._matrix = matrix
        self.size = size
        self.style = style
        self.shape = style
        self.level = level
        self.padding = padding
        self._color = color
        self._background = background

    @cached_property
    def svg(self) -> str:
        return matrix_to_svg(
            self._matrix,
            size=self.size,
            color=self._color,
            background=self._background,
            shape=self.style,
            padding=self.padding,
        )

    @cached_property
    def svg_base64(self) -> str:
        return "data:image/svg+xml;base64," + base64.b64encode(
            self.svg.encode("utf-8")
        ).decode("ascii")

    @cached_property
    def png_bytes(self) -> bytes:
        return matrix_to_png_bytes(
            self._matrix,
            size=self.size,
            color=self._color,
            background=self._background,
            shape=self.style,
            padding=self.padding,
        )

    @cached_property
    def png_base64(self) -> str:
        return "data:image/png;base64," + base64.b64encode(self.png_bytes).decode(
            "ascii"
        )

    @cached_property
    def ascii(self) -> str:
        return matrix_to_ascii(self._matrix)


def create_qr(
    text: str,
    *,
    size: int = DEFAULT_SIZE,
    color: str = DEFAULT_COLOR,
    foreground: str | None = None,
    dark: str | None = None,
    background: str = DEFAULT_BACKGROUND,
    light: str | None = None,
    style: str | None = None,
    shape: str | None = None,
    padding: int | None = None,
    border: int | None = None,
    level: str | None = None,
    ecc: str | None = None,
    mask: int | None = None,
) -> QrResult:
    if text is None or str(text) == "":
        raise ValueError("text is required")

    style_raw = style if style is not None else (shape or "square")
    style_norm = "round" if style_raw == "round" else "square"
    size_n = max(64, min(2048, int(size or DEFAULT_SIZE)))
    color_n = foreground or dark or color or DEFAULT_COLOR
    bg_n = light or background or DEFAULT_BACKGROUND
    pad_raw = (
        2
        if padding is None and border is None
        else (padding if padding is not None else border)
    )
    padding_n = max(0, min(16, int(pad_raw if pad_raw is not None else 2)))
    level_raw = str(level or ecc or "M").upper()
    level_n = level_raw if level_raw in LEVELS else "M"
    # 0–7 fixed (fast), -1 = auto mask (slower)
    mask_n = 0 if mask is None else int(mask)
    if mask_n < -1 or mask_n > 7:
        mask_n = 0

    parse_hex_color(color_n)
    parse_hex_color(bg_n)

    matrix = _matrix_from_text(
        str(text), border=padding_n, error=level_n, mask=mask_n
    )
    size_n, _ = _snap_size(size_n, len(matrix))
    return QrResult(
        matrix,
        size=size_n,
        style=style_norm,
        level=level_n,
        padding=padding_n,
        color=color_n,
        background=bg_n,
    )
