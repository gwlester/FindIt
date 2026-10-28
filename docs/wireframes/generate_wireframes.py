#!/usr/bin/env python3
"""Generates the low-fidelity SVG wireframes in this folder.

Run from anywhere:  python3 docs/wireframes/generate_wireframes.py
"""
import math
from pathlib import Path
from xml.sax.saxutils import escape

OUT = Path(__file__).resolve().parent
W, H = 360, 760
INK = "#333"
MUTED = "#888"
LINE = "#bbb"
FILL = "#f2f2f2"
ACCENT = "#555"
FONT = "font-family='Helvetica, Arial, sans-serif'"


class Screen:
    def __init__(self, title, header_right=None, back=True):
        self.parts = []
        self.title = title
        self.header_right = header_right
        self.back = back

    def add(self, svg):
        self.parts.append(svg)

    # --- primitives -------------------------------------------------------
    def text(self, x, y, s, size=14, color=INK, weight="normal", anchor="start"):
        self.add(
            f"<text x='{x}' y='{y}' {FONT} font-size='{size}' fill='{color}' "
            f"font-weight='{weight}' text-anchor='{anchor}'>{escape(s)}</text>"
        )

    def rect(self, x, y, w, h, fill="none", stroke=LINE, r=8, dash=False, sw=1.5):
        d = " stroke-dasharray='5 4'" if dash else ""
        self.add(
            f"<rect x='{x}' y='{y}' width='{w}' height='{h}' rx='{r}' fill='{fill}' "
            f"stroke='{stroke}' stroke-width='{sw}'{d}/>"
        )

    def button(self, x, y, w, label, filled=True, h=44):
        self.rect(x, y, w, h, fill=ACCENT if filled else "none", stroke=ACCENT, r=10, sw=2)
        self.text(x + w / 2, y + h / 2 + 5, label, 15, "#fff" if filled else ACCENT, "bold", "middle")

    def field(self, y, label, value, hint=None, h=40):
        self.text(16, y, label, 12, MUTED, "bold")
        self.rect(16, y + 6, W - 32, h, fill="#fff")
        self.text(28, y + 6 + h / 2 + 5, value, 15, INK if not value.startswith("e.g.") else MUTED)
        if hint:
            self.text(16, y + h + 22, hint, 11, MUTED)

    def checkbox(self, x, y, label, sub=None, checked=True):
        self.rect(x, y, 22, 22, fill=ACCENT if checked else "none", stroke=ACCENT, r=5, sw=2)
        if checked:
            self.add(f"<path d='M{x+5} {y+11} l5 5 l8 -10' stroke='#fff' stroke-width='2.5' fill='none'/>")
        self.text(x + 34, y + 11 if sub else y + 16, label, 15)
        if sub:
            self.text(x + 34, y + 27, sub, 12, MUTED)

    def note(self, x, y, s):
        """Annotation (callout) outside normal UI, drawn in a hand-note style."""
        self.text(x, y, s, 11, "#b04a00", "normal")

    # --- frame ------------------------------------------------------------
    def render(self, name):
        frame = [
            f"<svg xmlns='http://www.w3.org/2000/svg' width='{W}' height='{H}' viewBox='0 0 {W} {H}'>",
            f"<rect width='{W}' height='{H}' rx='28' fill='#fff' stroke='{INK}' stroke-width='3'/>",
            # status bar
            f"<text x='24' y='26' {FONT} font-size='12' fill='{MUTED}'>12:00</text>",
            f"<text x='{W-24}' y='26' {FONT} font-size='12' fill='{MUTED}' text-anchor='end'>▲ ✱ ▮</text>",
            # header
            f"<line x1='0' y1='88' x2='{W}' y2='88' stroke='{LINE}'/>",
            f"<text x='{56 if self.back else 20}' y='70' {FONT} font-size='20' font-weight='bold' fill='{INK}'>{escape(self.title)}</text>",
        ]
        if self.back:
            frame.append(f"<text x='20' y='70' {FONT} font-size='22' fill='{INK}'>←</text>")
        if self.header_right:
            frame.append(
                f"<text x='{W-20}' y='69' {FONT} font-size='15' font-weight='bold' fill='{ACCENT}' text-anchor='end'>{escape(self.header_right)}</text>"
            )
        body = frame + self.parts + ["</svg>"]
        (OUT / f"{name}.svg").write_text("\n".join(body) + "\n")


def places():
    s = Screen("FindIt", header_right="Settings", back=False)
    s.text(W / 2, 112, "Tap a place to find it · long-press to edit", 11, MUTED, anchor="middle")
    rows = [
        ("Old oak tree cache", "30.43520° N, 91.19030° W", None, "125 m"),
        ("Bridge micro", "30.44102° N, 91.18311° W", "From Alex", "1.42 km"),
        ("Library bench", "30.41277° N, 91.17702° W", None, "4.80 km"),
        ("Lakeside ammo can", "30.40911° N, 91.17208° W", "From Sam", "5.31 km"),
    ]
    y = 126
    for name, coords, src, dist in rows:
        h = 76 if src else 60
        s.rect(16, y, W - 32, h, fill="#fff", r=12)
        s.text(30, y + 24, name, 16, weight="bold")
        s.text(30, y + 44, coords, 12, MUTED)
        if src:
            s.text(30, y + 62, src, 12, MUTED)
        s.text(W - 30, y + h / 2 + 5, dist, 15, ACCENT, "bold", "end")
        y += h + 10
    s.note(30, y + 16, "Distance from current GPS fix; list sorted by name.")
    s.add(f"<line x1='0' y1='{H-86}' x2='{W}' y2='{H-86}' stroke='{LINE}'/>")
    s.button(16, H - 72, 156, "Add place")
    s.button(188, H - 72, 156, "Share nearby", filled=False)
    s.render("01-places")


def place():
    s = Screen("Add place")
    s.field(116, "Name", "e.g. Old oak tree cache")
    s.rect(16, 180, W - 32, 330, fill=FILL, r=12)
    s.text(30, 206, "Coordinates", 17, weight="bold")
    s.button(30, 218, W - 60, "Use my current position", filled=False)
    s.text(30, 280, "GPS accuracy now ± 4 m", 12, MUTED)
    for i, (label, value) in enumerate([("Latitude", "N 30° 26.112"), ("Longitude", "W 091° 11.418")]):
        y = 304 + i * 70
        s.text(30, y, label, 12, MUTED, "bold")
        s.rect(30, y + 6, W - 60, 40, fill="#fff")
        s.text(42, y + 31, value, 15)
    s.text(30, 440, "Decimal degrees, degrees + minutes, or D/M/S.", 11, MUTED)
    s.text(30, 470, "Recorded accuracy ± 4 m", 13, MUTED)
    s.note(30, 494, "Shown when position came from GPS; cleared on manual edit.")
    s.text(16, 538, "Notes", 12, MUTED, "bold")
    s.rect(16, 544, W - 32, 90, fill="#fff")
    s.text(28, 570, "Hints, description…", 15, MUTED)
    s.button(16, 654, W - 32, "Save")
    s.render("02-add-edit-place")


def compass_svg(cx, cy, r_out, heading, bearing):
    parts = []
    r_in = r_out - 46
    # lubber mark (fixed): direction the phone points
    parts.append(f"<polygon points='{cx-8},{cy-r_out-14} {cx+8},{cy-r_out-14} {cx},{cy-r_out-2}' fill='{ACCENT}'/>")
    rose = [f"<g transform='rotate({-heading} {cx} {cy})'>"]
    rose.append(f"<circle cx='{cx}' cy='{cy}' r='{r_out}' fill='#fff' stroke='{INK}' stroke-width='3'/>")
    for deg in range(0, 360, 5):
        ln = 14 if deg % 90 == 0 else 10 if deg % 30 == 0 else 5
        sw = 2 if deg % 30 == 0 else 1
        rose.append(
            f"<line x1='{cx}' y1='{cy-r_out}' x2='{cx}' y2='{cy-r_out+ln}' stroke='{INK}' stroke-width='{sw}' "
            f"transform='rotate({deg} {cx} {cy})'/>"
        )
    for label, deg in (("N", 0), ("E", 90), ("S", 180), ("W", 270)):
        rose.append(
            f"<text x='{cx}' y='{cy-r_out+36}' {FONT} font-size='{20 if label=='N' else 17}' font-weight='bold' "
            f"fill='{'#c00' if label=='N' else INK}' text-anchor='middle' transform='rotate({deg} {cx} {cy})'>{label}</text>"
        )
    rose.append("</g>")
    parts += rose
    parts.append(f"<circle cx='{cx}' cy='{cy}' r='{r_in}' fill='none' stroke='{LINE}' stroke-width='2'/>")
    tip, base, tail = cy - r_in + 10, cy - r_in + 54, cy + r_in - 22
    parts.append(
        f"<polygon transform='rotate({bearing-heading} {cx} {cy})' fill='{ACCENT}' points='"
        f"{cx},{tip} {cx+24},{base} {cx+8},{base} {cx+8},{tail} {cx-8},{tail} {cx-8},{base} {cx-24},{base}'/>"
    )
    parts.append(f"<circle cx='{cx}' cy='{cy}' r='5' fill='{INK}'/>")
    return "\n".join(parts)


def compass():
    s = Screen("Old oak tree cache")
    s.text(W / 2, 112, "30.43520° N, 91.19030° W", 13, MUTED, anchor="middle")
    s.add(compass_svg(W / 2, 270, 140, heading=30, bearing=75))
    s.text(W / 2, 470, "≈ 125 m", 40, INK, "bold", "middle")
    s.text(W / 2, 494, "uncertainty radius ± 6 m", 15, MUTED, anchor="middle")
    s.rect(16, 512, W - 32, 136, fill=FILL, r=12)
    lines = [
        ("Bearing 075° E", INK, 14),
        ("Heading 030° true", INK, 14),
        ("GPS accuracy ± 4 m · place recorded ± 5 m", INK, 14),
        ("Satellites: 14 used · 22 in view · 31 known", INK, 14),
        ("GPS 7 · Galileo 4 · GLONASS 2 · BeiDou 1", MUTED, 12),
    ]
    for i, (t, c, sz) in enumerate(lines):
        s.text(30, 538 + i * 24, t, sz, c, "bold" if i == 3 else "normal")
    s.text(16, 676, "Under the roots on the north side.", 13, MUTED)
    s.note(16, 698, "Rose rotates so N/E/S/W match real directions; ▲ = phone heading;")
    s.note(16, 712, "arrow points at the target. Inside the radius → “look around!”")
    s.note(16, 726, "Low compass calibration → figure-8 prompt.")
    s.render("03-compass")


def share():
    s = Screen("Share nearby")
    s.rect(16, 104, W - 32, 210, fill=FILL, r=12)
    s.text(30, 130, "Receive from nearby", 17, weight="bold")
    s.button(30, 142, W - 60, "Stop looking", filled=False)
    for i, (n, d) in enumerate([("Alex", "very close"), ("Sam's Pixel", "farther away")]):
        y = 196 + i * 56
        s.rect(30, y, W - 60, 48, fill="#fff", r=10)
        s.text(42, y + 20, n, 15, weight="bold")
        s.text(42, y + 38, f"{d} · tap to download", 12, MUTED)
    s.rect(16, 328, W - 32, 330, fill=FILL, r=12)
    s.text(30, 354, "Share my places", 17, weight="bold")
    s.text(30, 376, "Nearby FindIt users will see you as “Gerald”.", 12, MUTED)
    items = [
        ("Old oak tree cache", "30.43520° N, 91.19030° W", True),
        ("Bridge micro", "30.44102° N, 91.18311° W", True),
        ("Library bench", "30.41277° N, 91.17702° W", False),
        ("Lakeside ammo can", "30.40911° N, 91.17208° W", True),
    ]
    for i, (n, c, ch) in enumerate(items):
        s.checkbox(30, 392 + i * 48, n, c, ch)
    s.button(30, 590, W - 60, "Share 3 places")
    s.note(16, 684, "Sharing advertises over Bluetooth LE while this screen is open.")
    s.note(16, 700, "Both phones can share and look at the same time.")
    s.render("04-share")


def receive():
    s = Screen("Share nearby")
    s.rect(16, 104, W - 32, 290, fill=FILL, r=12)
    s.text(30, 130, "From Alex", 17, weight="bold")
    items = [
        ("Creek crossing", "30.42011° N, 91.15550° W", True),
        ("Water tower", "30.45120° N, 91.20102° W", True),
        ("Old oak tree cache", "30.43520° N, 91.19030° W", False),
    ]
    for i, (n, c, ch) in enumerate(items):
        s.checkbox(30, 148 + i * 48, n, c, ch)
    s.note(30, 306, "Places you already have are skipped on import.")
    s.button(30, 326, 142, "Cancel", filled=False)
    s.button(188, 326, 142, "Import selected")
    s.rect(16, 408, W - 32, 96, fill=FILL, r=12, dash=True)
    s.text(30, 434, "Receive from nearby", 17, MUTED, "bold")
    s.text(30, 460, "(list of nearby users)", 13, MUTED)
    s.rect(16, 518, W - 32, 96, fill=FILL, r=12, dash=True)
    s.text(30, 544, "Share my places", 17, MUTED, "bold")
    s.text(30, 570, "(checklist + Share button)", 13, MUTED)
    s.note(16, 640, "After tapping a nearby user: connect → download →")
    s.note(16, 654, "pick what to keep.")
    s.render("05-share-import")


def settings():
    s = Screen("Settings")
    s.field(116, "Your name for sharing", "Gerald", hint="Nearby users see the first dozen or so characters.")
    s.rect(16, 204, W - 32, 128, fill=FILL, r=12)
    s.text(30, 230, "Distance units", 17, weight="bold")
    s.checkbox(30, 244, "Metric", "metres / kilometres", True)
    s.checkbox(30, 290, "Imperial", "feet / miles", False)
    s.button(16, 350, W - 32, "Save")
    s.note(16, 420, "Stored in the local SQLite database (settings table).")
    s.render("06-settings")


if __name__ == "__main__":
    for fn in (places, place, compass, share, receive, settings):
        fn()
    print("wrote", sorted(p.name for p in OUT.glob("*.svg")))
