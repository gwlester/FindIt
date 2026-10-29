#!/usr/bin/env python3
"""Generates the app icon / splash concepts in this folder (for review; not used by the app yet).

Run from anywhere:  python3 docs/branding/generate_concepts.py

Each concept is an Android adaptive icon: a full-bleed background plus a foreground kept
inside the 66% safe zone (launchers crop the 1024 square to a circle, squircle, etc.).
Writes <concept>-background.svg, <concept>-foreground.svg, <concept>-icon.svg (both layers)
and <concept>-monochrome.svg (themed icons, Android 13+).
"""
import math
from pathlib import Path

OUT = Path(__file__).resolve().parent
S = 1024
C = S / 2
# Palette: Girl Scout green plus blues. Only the colours are borrowed; no Girl Scouts marks.
GREEN = "#00AE58"
DEEP_GREEN = "#00703C"
BLUE = "#1F6FB2"
NAVY = "#0B3D6B"
SKY = "#BFE3F7"
WHITE = "#FFFFFF"


def svg(body, defs=""):
    return (
        f"<svg xmlns='http://www.w3.org/2000/svg' width='{S}' height='{S}' viewBox='0 0 {S} {S}'>"
        f"<defs>{defs}</defs>{body}</svg>\n"
    )


def pt(r, deg):
    """Point at radius r and compass bearing deg (0 = up) from the centre."""
    a = math.radians(deg)
    return C + r * math.sin(a), C - r * math.cos(a)


def poly(points, fill, extra=""):
    d = " ".join(f"{x:.1f},{y:.1f}" for x, y in points)
    return f"<polygon points='{d}' fill='{fill}' {extra}/>"


# --- A: Compass ------------------------------------------------------------
def compass_fg(mono=False):
    ring = WHITE if not mono else "#000"
    north = NAVY if not mono else "#000"
    south = WHITE if not mono else "#000"
    ticks = "".join(
        f"<line x1='{pt(232, d)[0]:.1f}' y1='{pt(232, d)[1]:.1f}' x2='{pt(262 if d % 90 else 196, d)[0]:.1f}' "
        f"y2='{pt(262 if d % 90 else 196, d)[1]:.1f}' stroke='{ring}' stroke-width='{22 if d % 90 == 0 else 12}' stroke-linecap='round'/>"
        for d in range(0, 360, 45)
    )
    bearing = 40
    needle = poly([pt(250, bearing), pt(46, bearing + 90), pt(0, 0), pt(46, bearing - 90)], north)
    tail = poly([pt(170, bearing + 180), pt(46, bearing + 90), pt(0, 0), pt(46, bearing - 90)], south,
                "" if mono else f"stroke='{NAVY}' stroke-width='10' stroke-linejoin='round'")
    return (
        f"<circle cx='{C}' cy='{C}' r='300' fill='none' stroke='{ring}' stroke-width='36'/>"
        + ticks + needle + tail
        + f"<circle cx='{C}' cy='{C}' r='26' fill='{ring if mono else BLUE}' stroke='{ring}' stroke-width='10'/>"
    )


def compass_bg():
    return (
        f"<rect width='{S}' height='{S}' fill='url(#g)'/>",
        f"<linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='{GREEN}'/>"
        f"<stop offset='1' stop-color='{DEEP_GREEN}'/></linearGradient>",
    )


# --- B: Pin ------------------------------------------------------------------
def pin_fg(mono=False):
    body = GREEN if not mono else "#000"
    star = WHITE if not mono else "#fff"
    # Teardrop: circle head centred above, point at the bottom of the safe zone.
    hx, hy, r = C, C - 60, 210
    tip = (C, C + 300)
    a = math.radians(38)
    left = (hx - r * math.cos(a), hy + r * math.sin(a))
    right = (hx + r * math.cos(a), hy + r * math.sin(a))
    path = (
        f"<path d='M{tip[0]},{tip[1]} L{left[0]:.1f},{left[1]:.1f} A{r},{r} 0 1 1 {right[0]:.1f},{right[1]:.1f} Z' "
        f"fill='{body}'/>"
    )
    def spt(rr, deg):
        t = math.radians(deg)
        return hx + rr * math.sin(t), hy - rr * math.cos(t)
    pts = []
    for i in range(8):
        pts.append(spt(150 if i % 2 == 0 else 34, i * 45))
    star_poly = poly(pts, star)
    north = poly([spt(150, 0), spt(34, 45), (hx, hy), spt(34, -45)], NAVY if not mono else "#000")
    return path + star_poly + north + f"<circle cx='{hx}' cy='{hy}' r='18' fill='{NAVY if not mono else '#000'}'/>"


def pin_bg():
    return (
        f"<rect width='{S}' height='{S}' fill='url(#g)'/>",
        f"<linearGradient id='g' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='{BLUE}'/>"
        f"<stop offset='1' stop-color='{NAVY}'/></linearGradient>",
    )


# --- C: Search area ------------------------------------------------------------
def search_fg(mono=False):
    ring = BLUE if not mono else "#000"
    green = GREEN if not mono else "#000"
    rings = (
        f"<circle cx='{C}' cy='{C}' r='290' fill='none' stroke='{ring}' stroke-width='18' stroke-dasharray='46 30' opacity='{1 if mono else 0.55}'/>"
        f"<circle cx='{C}' cy='{C}' r='200' fill='none' stroke='{ring}' stroke-width='22' opacity='{1 if mono else 0.8}'/>"
        f"<circle cx='{C}' cy='{C}' r='110' fill='{'none' if mono else SKY}' stroke='{ring}' stroke-width='26'/>"
    )
    check = (
        f"<path d='M{C-52},{C+4} L{C-12},{C+44} L{C+60},{C-40}' fill='none' stroke='{green}' "
        f"stroke-width='34' stroke-linecap='round' stroke-linejoin='round'/>"
    )
    return rings + check


def search_bg():
    return (f"<rect width='{S}' height='{S}' fill='{WHITE}'/>", "")


CONCEPTS = {
    "a-compass": (compass_fg, compass_bg),
    "b-pin": (pin_fg, pin_bg),
    "c-search-area": (search_fg, search_bg),
}

if __name__ == "__main__":
    for name, (fg, bg) in CONCEPTS.items():
        body, defs = bg()
        (OUT / f"{name}-background.svg").write_text(svg(body, defs))
        (OUT / f"{name}-foreground.svg").write_text(svg(fg()))
        (OUT / f"{name}-monochrome.svg").write_text(svg(fg(mono=True)))
        (OUT / f"{name}-icon.svg").write_text(svg(body + fg(), defs))
    print("wrote", sorted(p.name for p in OUT.glob("*.svg")))
