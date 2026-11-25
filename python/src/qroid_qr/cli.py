from __future__ import annotations

import argparse
import sys
from pathlib import Path

from .core import create_qr


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(
        prog="qroid-qr",
        description="Tiny QR generator (square | round) — from Qroid",
    )
    p.add_argument("text", nargs="+", help="Text or URL to encode")
    p.add_argument(
        "--style",
        "--shape",
        dest="style",
        choices=("square", "round"),
        default="square",
    )
    p.add_argument("--size", type=int, default=256)
    p.add_argument("--color", "--foreground", dest="color", default="#111111")
    p.add_argument("--background", default="#ffffff")
    p.add_argument("--padding", "--border", dest="padding", type=int, default=2)
    p.add_argument(
        "--level",
        "--ecc",
        dest="level",
        choices=("L", "M", "Q", "H", "l", "m", "q", "h"),
        default="M",
    )
    p.add_argument("--ascii", action="store_true", help="Print ASCII QR")
    p.add_argument(
        "--base64",
        nargs="?",
        const="png",
        choices=("png", "svg"),
        help="Print data-URL base64 (default png)",
    )
    p.add_argument("--svg", type=Path, help="Write SVG file")
    p.add_argument("--png", type=Path, help="Write PNG file")
    return p


def main(argv: list[str] | None = None) -> None:
    args = build_parser().parse_args(argv)
    text = " ".join(args.text)
    out = create_qr(
        text,
        style=args.style,
        size=args.size,
        color=args.color,
        background=args.background,
        padding=args.padding,
        level=str(args.level).upper(),
    )
    wrote_file = args.svg is not None or args.png is not None
    if args.ascii or (not wrote_file and args.base64 is None):
        print(out.ascii)
    if args.base64 is not None:
        print(out.svg_base64 if args.base64 == "svg" else out.png_base64)
    if args.svg is not None:
        args.svg.write_text(out.svg, encoding="utf-8")
        print(f"wrote {args.svg}", file=sys.stderr)
    if args.png is not None:
        args.png.write_bytes(out.png_bytes)
        print(f"wrote {args.png}", file=sys.stderr)


if __name__ == "__main__":
    main()
