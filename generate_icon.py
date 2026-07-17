#!/usr/bin/env python3
"""Generate icon.ico — open book + floating letters on blue gradient, for 语海求索."""

from PIL import Image, ImageDraw, ImageFont
import os


def make_icon(size):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # ── Blue gradient background ──
    for y in range(size):
        t = y / size
        r = int(37 + (30 - 37) * t)
        g = int(99 + (64 - 99) * t)
        b = int(235 + (175 - 235) * t)
        draw.line([(0, y), (size, y)], fill=(r, g, b))

    # Rounded corners mask
    cr = size // 5
    mask = Image.new("L", (size, size), 0)
    md = ImageDraw.Draw(mask)
    md.rounded_rectangle([(0, 0), (size - 1, size - 1)], radius=max(1, cr), fill=255)
    img.putalpha(mask)

    # ── Layout (relative coords 0..1) ──
    cx, cy_book = 0.50, 0.58          # book center
    book_w = 0.48                     # half-book width
    book_top = 0.38
    book_bot = 0.78

    def sx(x): return int(x * size)
    def sy(y): return int(y * size)

    cx_px = sx(cx)
    top_px = sy(book_top)
    bot_px = sy(book_bot)
    hw = sx(book_w)

    # ── Open book ──
    page_fill = (255, 255, 255, 240)
    shadow = (0, 0, 0, 38)
    line_clr = (0, 0, 0, 30)
    spine_clr = (0, 0, 0, 38)

    # Left page
    l_mid_y = sy(0.55)
    draw.polygon([
        cx_px, top_px,
        cx_px - hw, top_px + sy(0.04),
        cx_px - hw, bot_px,
        cx_px, bot_px - sy(0.01),
    ], fill=page_fill)

    # Right page
    draw.polygon([
        cx_px, top_px,
        cx_px + hw, top_px + sy(0.04),
        cx_px + hw, bot_px,
        cx_px, bot_px - sy(0.01),
    ], fill=page_fill)

    # Spine
    spine_lw = max(1, size // 120)
    draw.line([cx_px, top_px, cx_px, bot_px], fill=spine_clr, width=spine_lw)

    # Page text lines (left)
    lw = max(1, size // 100)
    l_x = cx_px - hw + sx(0.03)
    for i, y_frac in enumerate([0.43, 0.50, 0.57, 0.64, 0.71]):
        y_px = sy(y_frac)
        end_x = cx_px - sx(0.04) if i != 2 else cx_px - sx(0.10)
        draw.line([l_x, y_px, end_x, y_px], fill=line_clr, width=lw)

    # Page text lines (right)
    r_x = cx_px + sx(0.04)
    for i, y_frac in enumerate([0.43, 0.50, 0.57, 0.64, 0.71]):
        y_px = sy(y_frac)
        start_x = r_x if i != 2 else cx_px + sx(0.10)
        draw.line([start_x, y_px, cx_px + hw - sx(0.03), y_px], fill=line_clr, width=lw)

    # ── Floating letters ──
    # Use a simple approach: draw circles/shapes for small sizes, try font for large
    letters = [
        ("a", sx(0.30), sy(0.12), -12, (255, 255, 255, 230)),
        ("B", sx(0.66), sy(0.08), 8, (255, 255, 255, 191)),
        ("c", sx(0.39), sy(0.03), -5, (255, 255, 255, 140)),
    ]

    # Try to load a serif font, fall back to default
    font = None
    font_size = max(8, size // 9)
    for fp in ["C:/Windows/Fonts/georgia.ttf", "C:/Windows/Fonts/times.ttf",
               "C:/Windows/Fonts/segoeui.ttf", "C:/Windows/Fonts/arial.ttf"]:
        try:
            font = ImageFont.truetype(fp, font_size)
            break
        except (OSError, IOError):
            continue

    for char, lx, ly, angle, color in letters:
        if font and size >= 32:
            # Render on temp image, rotate, paste
            tmp = Image.new("RGBA", (font_size * 2, font_size * 2), (0, 0, 0, 0))
            td = ImageDraw.Draw(tmp)
            bbox = td.textbbox((0, 0), char, font=font)
            tw = bbox[2] - bbox[0]
            th = bbox[3] - bbox[1]
            tx = font_size - tw // 2
            ty = font_size - th // 2
            td.text((tx, ty), char, fill=color, font=font)
            tmp = tmp.rotate(angle, expand=True, resample=Image.BILINEAR)
            img.paste(tmp, (lx - tmp.width // 2, ly - tmp.height // 2), tmp)
        else:
            # Small size: just a dot
            r = max(2, size // 20)
            draw.ellipse([lx - r, ly - r, lx + r, ly + r], fill=color)

    return img


def main():
    os.chdir(os.path.dirname(os.path.abspath(__file__)))

    # ICO (256x256, multi-resolution for Windows taskbar)
    img = make_icon(256)
    img.save("public/icon.ico", format="ICO")
    sz = os.path.getsize("public/icon.ico")
    print(f"[OK] icon.ico generated — {sz} bytes (256x256)")

    # PNG icons for PWA manifest (Chrome requires 192x192 + 512x512)
    for s in [192, 512]:
        png = make_icon(s)
        out = f"public/icon-{s}x{s}.png"
        png.save(out, format="PNG")
        sz = os.path.getsize(out)
        print(f"[OK] {out} generated — {sz} bytes")


if __name__ == "__main__":
    main()
