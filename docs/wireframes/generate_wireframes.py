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

    def clip_start(self, cid, x, y, w, h):
        """Everything until clip_end() is clipped to this box (a scrolling region)."""
        self.add(f"<clipPath id='{cid}'><rect x='{x}' y='{y}' width='{w}' height='{h}'/></clipPath>")
        self.add(f"<g clip-path='url(#{cid})'>")

    def clip_end(self):
        self.add("</g>")

    def scrollbar(self, x, y, h, thumb_frac=0.45):
        """Scroll indicator: a track with a thumb at the top."""
        self.add(f"<rect x='{x}' y='{y}' width='4' height='{h}' rx='2' fill='#e2e2e2'/>")
        self.add(f"<rect x='{x}' y='{y}' width='4' height='{h * thumb_frac:.0f}' rx='2' fill='{MUTED}'/>")

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
        if getattr(self, "header_extra", None):
            frame.append(
                f"<text x='{W-100}' y='69' {FONT} font-size='15' font-weight='bold' fill='{ACCENT}' text-anchor='end'>{escape(self.header_extra)}</text>"
            )
        body = frame + self.parts + ["</svg>"]
        (OUT / f"{name}.svg").write_text("\n".join(body) + "\n")


def places():
    s = Screen("FindIt", header_right="Settings", back=False)
    s.header_extra = "Files"
    s.text(W / 2, 112, "Tap a place to find it · long-press to edit", 11, MUTED, anchor="middle")
    rows = [
        ("Bridge micro", "30.44102° N, 91.18311° W", "From Alex", "1.42 km"),
        ("Creek crossing", "30.42011° N, 91.15550° W", None, "3.38 km"),
        ("Lakeside ammo can", "30.40911° N, 91.17208° W", "From Sam", "5.31 km"),
        ("Library bench", "30.41277° N, 91.17702° W", None, "4.80 km"),
        ("Old oak tree cache", "30.43520° N, 91.19030° W", None, "125 m"),
        ("Water tower", "30.45120° N, 91.20102° W", "From Alex", "1.77 km"),
        ("Zoo gate", "30.53120° N, 91.10102° W", None, "12.4 km"),
        ("Zydeco park", "30.52011° N, 91.12550° W", None, "13.0 km"),
    ]
    y = 126
    s.clip_start("places", 0, 120, W, H - 86 - 120)
    for name, coords, src, dist in rows:
        h = 76 if src else 60
        s.rect(16, y, W - 32, h, fill="#fff", r=12)
        s.text(30, y + 24, name, 16, weight="bold")
        s.text(30, y + 44, coords, 12, MUTED)
        if src:
            s.text(30, y + 62, src, 12, MUTED)
        s.text(W - 30, y + h / 2 + 5, dist, 15, ACCENT, "bold", "end")
        y += h + 10
    s.clip_end()
    s.scrollbar(W - 9, 126, H - 86 - 132, 0.7)
    s.add(f"<line x1='0' y1='{H-86}' x2='{W}' y2='{H-86}' stroke='{LINE}'/>")
    s.button(16, H - 72, 156, "Add place")
    s.button(188, H - 72, 156, "Share nearby", filled=False)
    s.render("01-places")


def place():
    s = Screen("Add place")
    s.field(116, "Name", "e.g. Old oak tree cache")
    s.rect(16, 180, W - 32, 330, fill=FILL, r=12)
    s.text(30, 206, "Coordinates", 17, weight="bold")
    s.button(30, 218, 142, "Use current", filled=False)
    s.button(188, 218, 142, "Average position", filled=False)
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


def averaging():
    s = Screen("Add place")
    s.field(116, "Name", "Old oak tree cache")
    s.rect(16, 180, W - 32, 400, fill=FILL, r=12)
    s.text(30, 206, "Coordinates", 17, weight="bold")
    s.rect(30, 218, W - 60, 262, fill="#fff", stroke=ACCENT, r=10, sw=2)
    s.add(f"<circle cx='52' cy='244' r='9' fill='none' stroke='{ACCENT}' stroke-width='3' stroke-dasharray='14 6'/>")
    s.text(70, 249, "Averaging — keep the phone still", 15, weight="bold")
    s.text(44, 276, "84 fixes · 1:24 (2 poor fixes ignored)", 13)
    s.text(44, 316, "± 2.1 m", 30, ACCENT, "bold")
    s.text(44, 338, "estimated accuracy · fixes wander ± 3.4 m", 12, MUTED)
    s.text(44, 362, "Satellites: 18 used · 27 in view · full tracking", 12, MUTED)
    s.text(44, 384, "Longer is better: aim for 1–2 minutes with a", 11, MUTED)
    s.text(44, 398, "clear view of the sky.", 11, MUTED)
    s.button(44, 414, 128, "Cancel", filled=False)
    s.button(184, 414, 132, "Use average")
    s.text(30, 504, "Latitude / Longitude fields (filled on “Use average”)", 12, MUTED)
    s.text(30, 528, "Recorded accuracy ± 2.1 m", 13, MUTED)
    s.note(16, 606, "Averages many fixes (better fixes weigh more; fixes worse than")
    s.note(16, 620, "30 m are ignored). Accuracy is conservative because GPS errors")
    s.note(16, 634, "drift slowly; see docs/architecture.md.")
    s.render("02b-averaging")


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
    s.rect(16, 512, W - 32, 152, fill=FILL, r=12)
    lines = [
        ("Bearing 075° E", INK, 14),
        ("Heading 030° true", INK, 14),
        ("GPS accuracy ± 4 m · place recorded ± 5 m", INK, 14),
        ("Satellites: 14 used · 22 in view · 31 known", INK, 14),
        ("GPS 7 · Galileo 4 · GLONASS 2 · BeiDou 1", MUTED, 12),
        ("Full GNSS tracking on (High-accuracy GPS)", MUTED, 12),
    ]
    for i, (t, c, sz) in enumerate(lines):
        s.text(30, 538 + i * 24, t, sz, c, "bold" if i == 3 else "normal")
    s.text(16, 686, "Under the roots on the north side.", 13, MUTED)
    s.note(16, 706, "Rose: N/E/S/W stay true; ▲ = phone heading; arrow → target.")
    s.note(16, 720, "Heading/position smoothed. Inside radius → “look around!”")
    s.note(16, 734, "Low compass calibration → figure-8 prompt.")
    s.render("03-compass")


def share_section(s, top, bottom, scroll_id):
    """'Share my places': fixed title and button, scrolling checklist between them."""
    s.rect(16, top, W - 32, bottom - top, fill=FILL, r=12)
    s.text(30, top + 26, "Share my places", 17, weight="bold")
    s.text(30, top + 48, "Nearby FindIt users will see you as “Gerald”.", 12, MUTED)
    items = [
        ("Bridge micro", "30.44102° N, 91.18311° W", True),
        ("Creek crossing", "30.42011° N, 91.15550° W", True),
        ("Lakeside ammo can", "30.40911° N, 91.17208° W", False),
        ("Library bench", "30.41277° N, 91.17702° W", True),
        ("Old oak tree cache", "30.43520° N, 91.19030° W", True),
    ]
    list_top, list_bottom = top + 60, bottom - 62
    s.clip_start(scroll_id, 16, list_top, W - 32, list_bottom - list_top)
    for i, (n, c, ch) in enumerate(items):
        s.checkbox(30, list_top + 6 + i * 48, n, c, ch)
    s.clip_end()
    s.scrollbar(W - 26, list_top, list_bottom - list_top, 0.6)
    s.button(30, bottom - 56, W - 60, "Share 4 places")


def share():
    s = Screen("Share nearby")
    s.rect(16, 104, W - 32, 300, fill=FILL, r=12)
    s.text(30, 130, "Receive from nearby", 17, weight="bold")
    s.button(30, 142, W - 60, "Stop looking", filled=False)
    s.clip_start("nearby", 16, 194, W - 32, 198)
    users = [("Alex", "very close"), ("Sam's Pixel", "close"), ("Jo", "farther away"), ("Pat", "farther away")]
    for i, (n, d) in enumerate(users):
        y = 198 + i * 56
        s.rect(30, y, W - 66, 48, fill="#fff", r=10)
        s.text(42, y + 20, n, 15, weight="bold")
        s.text(42, y + 38, f"{d} · tap to download", 12, MUTED)
    s.clip_end()
    s.scrollbar(W - 26, 194, 198, 0.75)
    share_section(s, 416, 744, "share-list")
    s.render("04-share")


def receive():
    s = Screen("Share nearby")
    s.rect(16, 104, W - 32, 300, fill=FILL, r=12)
    s.text(30, 130, "From Alex", 17, weight="bold")
    items = [
        ("Creek crossing", "30.42011° N, 91.15550° W", True),
        ("Water tower", "30.45120° N, 91.20102° W", True),
        ("Old oak tree cache", "30.43520° N, 91.19030° W", False),
        ("Picnic table", "30.43001° N, 91.18002° W", True),
        ("Zoo gate", "30.53120° N, 91.10102° W", True),
    ]
    s.clip_start("received", 16, 142, W - 32, 198)
    for i, (n, c, ch) in enumerate(items):
        s.checkbox(30, 146 + i * 48, n, c, ch)
    s.clip_end()
    s.scrollbar(W - 26, 142, 198, 0.65)
    s.button(30, 350, 142, "Cancel", filled=False)
    s.button(188, 350, 142, "Import selected")
    share_section(s, 416, 744, "share-list-2")
    s.render("05-share-import")


def files():
    s = Screen("Import / Export")
    s.rect(16, 104, W - 32, 124, fill=FILL, r=12)
    s.text(30, 130, "Import", 17, weight="bold")
    s.text(30, 152, "GPX (geocaching.com, GPS units, other apps) or", 12, MUTED)
    s.text(30, 167, "GeoJSON. The format is detected from the file.", 12, MUTED)
    s.button(30, 176, W - 60, "Choose a file…")
    s.rect(16, 240, W - 32, 400, fill=FILL, r=12)
    s.text(30, 266, "Export", 17, weight="bold")
    items = [
        ("Bridge micro", "30.44102° N, 91.18311° W", True),
        ("Creek crossing", "30.42011° N, 91.15550° W", True),
        ("Lakeside ammo can", "30.40911° N, 91.17208° W", False),
        ("Library bench", "30.41277° N, 91.17702° W", True),
        ("Old oak tree cache", "30.43520° N, 91.19030° W", True),
        ("Water tower", "30.45120° N, 91.20102° W", True),
    ]
    s.clip_start("export-list", 16, 278, W - 32, 290)
    for i, (n, c, ch) in enumerate(items):
        s.checkbox(30, 284 + i * 48, n, c, ch)
    s.clip_end()
    s.scrollbar(W - 26, 278, 290, 0.8)
    s.button(30, 580, W - 60, "Export 5 places…")
    s.rect(40, 660, W - 80, 84, fill="#fff", stroke=INK, r=6)
    s.text(56, 682, "Export 5 places — Which format?", 13, weight="bold")
    s.text(56, 704, "GPX: GPS units and geocaching apps", 12, ACCENT, "bold")
    s.text(56, 722, "GeoJSON: mapping tools", 12, ACCENT, "bold")
    s.text(56, 738, "Cancel", 11, MUTED)
    s.note(16, 654, "Asked on every export, then the Android share sheet opens:")
    s.render("07-files")


def files_import():
    s = Screen("Import / Export")
    s.rect(16, 104, W - 32, 330, fill=FILL, r=12)
    s.text(30, 130, "Import from caches.gpx", 17, weight="bold")
    s.text(30, 152, "GPX · 4 places · 1 other item skipped", 12, MUTED)
    items = [
        ("Old Oak (GC12345)", "30.43520° N, 91.19030° W", True),
        ("Bridge micro (GC2B3C4)", "30.44102° N, 91.18311° W", True),
        ("Water tower (GC9ZZ01)", "30.45120° N, 91.20102° W", False),
        ("Zoo gate (GC7Q2W1)", "30.53120° N, 91.10102° W", True),
    ]
    s.clip_start("import-list", 16, 162, W - 32, 210)
    for i, (n, c, ch) in enumerate(items):
        s.checkbox(30, 168 + i * 48, n, c, ch)
    s.clip_end()
    s.scrollbar(W - 26, 162, 210, 0.75)
    s.button(30, 380, 142, "Cancel", filled=False)
    s.button(188, 380, 142, "Import selected")
    s.rect(16, 448, W - 32, 140, fill=FILL, r=12, dash=True)
    s.text(30, 474, "Export", 17, MUTED, "bold")
    s.text(30, 500, "(checklist + Export button, unchanged)", 13, MUTED)
    s.note(16, 612, "Format chosen automatically: .gpx / .geojson / .json, then MIME type,")
    s.note(16, 626, "then content. geocaching.com files: cache name + code, hint in notes.")
    s.note(16, 640, "Places you already have (same name and position) are skipped.")
    s.render("07b-files-import")


def settings():
    s = Screen("Settings")
    s.field(116, "Your name for sharing", "Gerald", hint="Nearby users see the first dozen or so characters.")
    s.rect(16, 204, W - 32, 128, fill=FILL, r=12)
    s.text(30, 230, "Distance units", 17, weight="bold")
    s.checkbox(30, 244, "Metric", "metres / kilometres", True)
    s.checkbox(30, 290, "Imperial", "feet / miles", False)
    s.rect(16, 346, W - 32, 112, fill=FILL, r=12)
    s.text(30, 372, "GPS", 17, weight="bold")
    s.checkbox(30, 386, "High-accuracy GPS", "Keep tracking every satellite while finding", True)
    s.text(64, 429, "or averaging a place (Android 12+). More battery.", 12, MUTED)
    s.button(16, 476, W - 32, "Save")
    s.note(16, 546, "Stored in the local SQLite database (settings table).")
    s.render("06-settings")


if __name__ == "__main__":
    for fn in (places, place, averaging, compass, share, receive, settings, files, files_import):
        fn()
    print("wrote", sorted(p.name for p in OUT.glob("*.svg")))
