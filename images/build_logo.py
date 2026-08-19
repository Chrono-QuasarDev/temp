#!/usr/bin/env python3
import math
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen

OUT = Path("/home/user/temp/images")
SERIF = "/home/user/temp/fonts/Cinzel.ttf"
SANS = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"

CX, CY, R = 400, 318, 178


def smooth_wave(y, amp, phase, x0, x1, steps=18, freq=1.18):
    def pt(t):
        x = x0 + (x1 - x0) * t
        # slight droop toward the right, like the original
        droop = 6 * t * t
        yy = y + droop + math.sin((t * freq * math.pi * 2) + phase) * amp
        return x, yy

    ts = [i / steps for i in range(steps + 1)]
    pts = [pt(t) for t in ts]
    d = f"M{pts[0][0]:.2f},{pts[0][1]:.2f}"
    for i in range(steps):
        t0, t1 = ts[i], ts[i + 1]
        p1 = pts[i + 1]
        c1 = pt(t0 + (t1 - t0) / 3)
        c2 = pt(t1 - (t1 - t0) / 3)
        d += f" C{c1[0]:.2f},{c1[1]:.2f} {c2[0]:.2f},{c2[1]:.2f} {p1[0]:.2f},{p1[1]:.2f}"
    return d


def ring():
    # Larger gap on the left. y-down: 0 east, 90 south, 180 west, 270 north.
    # Open from ~10:30 through the whole left side to ~8:00
    a0, span, steps = 255, 258, 90
    pts = []
    for i in range(steps + 1):
        a = math.radians(a0 + span * i / steps)
        x = CX + R * math.cos(a)
        y = CY + R * math.sin(a)
        pts.append((x, y))
    d = f"M{pts[0][0]:.2f},{pts[0][1]:.2f}"
    for p in pts[1:]:
        d += f" L{p[0]:.2f},{p[1]:.2f}"
    return d


def text_to_path(font_path, text, x, y, size_px, tracking=0, anchor="middle"):
    font = TTFont(font_path)
    cmap = font.getBestCmap()
    gs = font.getGlyphSet()
    hmtx = font["hmtx"]
    upem = font["head"].unitsPerEm
    scale = size_px / upem
    widths = []
    for ch in text:
        name = cmap.get(ord(ch))
        adv = hmtx[name][0] if name else upem
        widths.append(adv * scale + tracking)
    total = sum(widths) - tracking
    pen_x = x - total / 2 if anchor == "middle" else x
    parts = []
    for ch, w in zip(text, widths):
        name = cmap.get(ord(ch))
        if name:
            svgpen = SVGPathPen(gs)
            tp = TransformPen(svgpen, (scale, 0, 0, -scale, pen_x, y))
            gs[name].draw(tp)
            d = svgpen.getCommands()
            if d:
                parts.append(d)
        pen_x += w
    return parts


SW = 15.5
# Waves sit inside the bowl; left tips just clear the opening.
# Original: 4 strong lines + a short fifth.
specs = [
    (-62, 7.8, 0.35, CX - 148, CX + 108),
    (-32, 7.4, 0.95, CX - 150, CX + 104),
    (-2, 7.0, 0.40, CX - 138, CX + 96),
    (28, 6.2, 1.05, CX - 112, CX + 78),
    (56, 5.0, 0.55, CX - 78, CX + 48),
]

wave_ds = [(smooth_wave(CY + y, amp, ph, x0, x1), SW) for y, amp, ph, x0, x1 in specs]
word = text_to_path(SERIF, "ZENALA", CX, 652, 70, tracking=16)
sub = text_to_path(SANS, "LAKE EVENT CENTRE", CX, 698, 15.5, tracking=8.2)

svg = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 900" role="img" aria-label="Zenala Lake Event Centre">',
    '<rect width="800" height="900" fill="#000"/>',
    f'<g fill="none" stroke="#ffffff" stroke-width="{SW}" stroke-linecap="round" stroke-linejoin="round">',
    f'<path d="{ring()}"/>',
]
for d, _ in wave_ds:
    svg.append(f'<path d="{d}"/>')
svg += ["</g>", '<g fill="#ffffff">']
for d in word:
    svg.append(f'<path d="{d}"/>')
for d in sub:
    svg.append(f'<path d="{d}"/>')
svg += ["</g>", "</svg>"]
(OUT / "logo.svg").write_text("\n".join(svg))

# Transparent mark for the site header
mark = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="200 120 400 400" role="img" aria-label="Zenala">',
    f'<g fill="none" stroke="#ffffff" stroke-width="{SW}" stroke-linecap="round" stroke-linejoin="round">',
    f'<path d="{ring()}"/>',
]
for d, _ in wave_ds:
    mark.append(f'<path d="{d}"/>')
mark += ["</g>", "</svg>"]
(OUT / "logo-mark.svg").write_text("\n".join(mark))

# Dark-on-light mark
mark2 = (OUT / "logo-mark.svg").read_text().replace('stroke="#ffffff"', 'stroke="#1a1914"')
(OUT / "logo-mark-ink.svg").write_text(mark2)

print("ok")
