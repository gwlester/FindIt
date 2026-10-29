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
        if getattr(self, "header_extra2", None):
            frame.append(
                f"<text x='{W-160}' y='69' {FONT} font-size='15' font-weight='bold' fill='{ACCENT}' text-anchor='end'>{escape(self.header_extra2)}</text>"
            )
        body = frame + self.parts + ["</svg>"]
        (OUT / f"{name}.svg").write_text("\n".join(body) + "\n")


def places():
    s = Screen("FindIt", header_right="Settings", back=False)
    s.header_extra = "Files"
    s.header_extra2 = "Map"
    s.text(W / 2, 112, "Tap a place to find it · long-press to edit", 11, MUTED, anchor="middle")
    s.checkbox(16, 122, "Hide found places", "2 found places hidden", False)
    rows = [
        ("Bridge micro", "30.44102° N, 91.18311° W", "From Alex", None, "1.42 km"),
        ("Creek crossing", "30.42011° N, 91.15550° W", None, "✓ Found 2026-10-29", "3.38 km"),
        ("Lakeside ammo can", "30.40911° N, 91.17208° W", "From Sam", "✓ Found by Sam 2026-10-20", "5.31 km"),
        ("Library bench", "30.41277° N, 91.17702° W", None, "✓ Found 3 times, last 2026-10-28", "4.80 km"),
        ("Old oak tree cache", "30.43520° N, 91.19030° W", None, None, "125 m"),
        ("Water tower", "30.45120° N, 91.20102° W", "From Alex", None, "1.77 km"),
        ("Zoo gate", "30.53120° N, 91.10102° W", None, None, "12.4 km"),
    ]
    y = 166
    s.clip_start("places", 0, 160, W, H - 86 - 160)
    for name, coords, src, found, dist in rows:
        extra = [x for x in (src, found) if x]
        h = 60 + 16 * len(extra)
        s.rect(16, y, W - 32, h, fill="#fff", r=12)
        s.text(30, y + 24, name, 16, weight="bold")
        s.text(30, y + 44, coords, 12, MUTED)
        for i, line in enumerate(extra):
            s.text(30, y + 62 + 16 * i, line, 12, ACCENT if line.startswith("✓") else MUTED, "bold" if line.startswith("✓") else "normal")
        s.text(W - 30, y + h / 2 + 5, dist, 15, ACCENT, "bold", "end")
        y += h + 10
    s.clip_end()
    s.scrollbar(W - 9, 166, H - 86 - 172, 0.7)
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


def compass_details(s, top):
    """The details box below the distance; clipped at the bottom of the screen."""
    s.clip_start(f"details-{top}", 0, top, W, 712 - top)
    s.rect(16, top, W - 32, 152, fill=FILL, r=12)
    lines = [
        ("Bearing 075° E", INK, 14),
        ("Heading 030° true", INK, 14),
        ("GPS accuracy ± 4 m · place recorded ± 5 m", INK, 14),
        ("Satellites: 14 used · 22 in view · 31 known", INK, 14),
        ("GPS 7 · Galileo 4 · GLONASS 2 · BeiDou 1", MUTED, 12),
        ("Full GNSS tracking on (High-accuracy GPS)", MUTED, 12),
    ]
    for i, (t, c, sz) in enumerate(lines):
        s.text(30, top + 26 + i * 24, t, sz, c, "bold" if i == 3 else "normal")
    s.clip_end()


def compass_close_svg(cx, cy, r_out, heading, bearing, distance_m, radius_m, you_m, scale_m, backdrop=None):
    """Close-range compass: the rose as usual, the inner circle becomes a top-down map with
    you at the centre and the search area (shaded) around the cache, heading-up."""
    parts = []
    r_in = r_out - 46
    px = r_in / scale_m
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
    # map disc + half-scale ring
    parts.append(f"<clipPath id='map-{distance_m}'><circle cx='{cx}' cy='{cy}' r='{r_in}'/></clipPath>")
    parts.append(f"<circle cx='{cx}' cy='{cy}' r='{r_in}' fill='#eef3ee' stroke='{LINE}' stroke-width='2'/>")
    if backdrop:
        # A heading-up map (streets or satellite) behind the search area, turning with the phone.
        m = [f"<g clip-path='url(#map-{distance_m})'><g transform='rotate({-heading} {cx} {cy})'>"]
        if backdrop == "satellite":
            m.append(f"<rect x='{cx-r_in}' y='{cy-r_in}' width='{2*r_in}' height='{2*r_in}' fill='#5d7046'/>")
            for i, (dx, dy, rr, col) in enumerate(((-40, -30, 38, '#46593a'), (30, 20, 30, '#6f8250'), (-10, 50, 26, '#3e5034'), (50, -45, 22, '#7d8a5e'))):
                m.append(f"<circle cx='{cx+dx}' cy='{cy+dy}' r='{rr}' fill='{col}'/>")
            m.append(f"<path d='M{cx-r_in} {cy+10} C {cx-30} {cy-10} {cx+20} {cy+30} {cx+r_in} {cy+5}' stroke='#b9ab8c' stroke-width='6' fill='none'/>")
        else:
            m.append(f"<rect x='{cx-r_in}' y='{cy-r_in}' width='{2*r_in}' height='{2*r_in}' fill='#eef1ea'/>")
            m.append(f"<rect x='{cx+12}' y='{cy-70}' width='60' height='44' fill='#d7e8cf'/>")
            m.append(f"<path d='M{cx-r_in} {cy+40} C {cx-20} {cy+20} {cx+30} {cy+70} {cx+r_in} {cy+40}' stroke='#b9d3ea' stroke-width='10' fill='none'/>")
            for x1, y1, x2, y2, w in ((-r_in, -10, r_in, -20, 7), (-30, -r_in, -20, r_in, 6)):
                m.append(f"<line x1='{cx+x1}' y1='{cy+y1}' x2='{cx+x2}' y2='{cy+y2}' stroke='#fff' stroke-width='{w}'/>")
        m.append("</g></g>")
        parts += m
    parts.append(f"<circle cx='{cx}' cy='{cy}' r='{r_in/2}' fill='none' stroke='{LINE}' stroke-dasharray='3 4'/>")
    rel = math.radians(bearing - heading)
    tx, ty = cx + distance_m * px * math.sin(rel), cy - distance_m * px * math.cos(rel)
    parts.append(f"<g clip-path='url(#map-{distance_m})'>")
    parts.append(f"<line x1='{cx}' y1='{cy}' x2='{tx:.1f}' y2='{ty:.1f}' stroke='{ACCENT}' stroke-width='2' stroke-dasharray='5 4'/>")
    parts.append(
        f"<circle cx='{tx:.1f}' cy='{ty:.1f}' r='{radius_m*px:.1f}' fill='{ACCENT}' fill-opacity='0.22' "
        f"stroke='{ACCENT}' stroke-width='2' stroke-dasharray='6 4'/>"
    )
    parts.append(f"<circle cx='{cx}' cy='{cy}' r='{you_m*px:.1f}' fill='#3a6ea5' fill-opacity='0.18'/>")
    parts.append("</g>")
    # cache marker (crosshair) and you
    parts.append(f"<circle cx='{tx:.1f}' cy='{ty:.1f}' r='7' fill='#fff' stroke='{INK}' stroke-width='2.5'/>")
    parts.append(f"<line x1='{tx-11:.1f}' y1='{ty:.1f}' x2='{tx+11:.1f}' y2='{ty:.1f}' stroke='{INK}' stroke-width='2'/>")
    parts.append(f"<line x1='{tx:.1f}' y1='{ty-11:.1f}' x2='{tx:.1f}' y2='{ty+11:.1f}' stroke='{INK}' stroke-width='2'/>")
    parts.append(f"<circle cx='{cx}' cy='{cy}' r='6' fill='#3a6ea5' stroke='#fff' stroke-width='2'/>")
    parts.append(f"<text x='{cx}' y='{cy + r_in/2 + 14}' {FONT} font-size='10' fill='{MUTED}' text-anchor='middle'>{scale_m//2} m</text>")
    parts.append(f"<text x='{cx}' y='{cy + r_in - 6}' {FONT} font-size='10' fill='{MUTED}' text-anchor='middle'>{scale_m} m</text>")
    return "\n".join(parts)


def compass_search_area():
    s = Screen("Old oak tree cache")
    s.text(W / 2, 112, "30.43520° N, 91.19030° W", 13, MUTED, anchor="middle")
    s.add(compass_close_svg(W / 2, 270, 140, heading=30, bearing=75, distance_m=14, radius_m=6, you_m=4, scale_m=20))
    s.text(W / 2, 466, "≈ 14 m", 40, INK, "bold", "middle")
    s.text(W / 2, 490, "uncertainty radius ± 6 m · search area shaded", 14, MUTED, anchor="middle")
    s.button(16, 502, W - 32, "Average my position", filled=False, h=40)
    compass_details(s, 554)
    s.note(8, 148, "● you (blue halo = your")
    s.note(8, 161, "  GPS uncertainty)")
    s.note(262, 148, "⊕ cache; shaded")
    s.note(262, 161, "  = search area")
    s.note(16, 730, "Within ~50 m the inner circle becomes a heading-up map; scale")
    s.note(16, 744, "adjusts (here inner ring = 20 m). Further away: the arrow, as now.")
    s.render("03c-compass-search-area")


def compass_in_search_area():
    s = Screen("Old oak tree cache")
    s.text(W / 2, 112, "30.43520° N, 91.19030° W", 13, MUTED, anchor="middle")
    s.add(compass_close_svg(W / 2, 270, 140, heading=30, bearing=75, distance_m=3, radius_m=4, you_m=2, scale_m=10))
    s.text(W / 2, 466, "≈ 3 m", 40, INK, "bold", "middle")
    s.text(W / 2, 490, "uncertainty radius ± 4 m · averaged over 96 fixes", 14, MUTED, anchor="middle")
    s.rect(16, 502, W - 32, 44, fill="#e7f3ec", stroke=ACCENT, r=10, sw=2)
    s.text(W / 2, 529, "You’re in the search area — look around!", 15, ACCENT, "bold", "middle")
    s.rect(16, 554, W - 32, 112, fill="#fff", stroke=ACCENT, r=10, sw=2)
    s.text(30, 578, "Averaging your position — stand still", 14, weight="bold")
    s.text(30, 600, "96 fixes · ± 2 m", 14, MUTED)
    s.button(30, 612, W - 60, "Stop averaging", filled=False, h=40)
    s.note(16, 700, "You’re inside the shaded circle: the cache is most likely within")
    s.note(16, 714, "the circle around you. Averaging shrinks your halo and the circle.")
    s.note(16, 730, "Map zooms in as you get closer (here inner ring = 10 m).")
    s.render("03d-compass-in-search-area")


def compass_map_behind():
    s = Screen("Old oak tree cache")
    s.text(W / 2, 112, "30.43520° N, 91.19030° W", 13, MUTED, anchor="middle")
    s.add(compass_close_svg(W / 2, 270, 140, heading=30, bearing=75, distance_m=14, radius_m=6, you_m=4, scale_m=20, backdrop="streets"))
    s.text(W / 2, 424, "Map © OpenStreetMap contributors, OpenFreeMap", 10, MUTED, anchor="middle")
    s.text(W / 2, 466, "≈ 14 m", 40, INK, "bold", "middle")
    s.text(W / 2, 490, "uncertainty radius ± 6 m · search area shaded", 14, MUTED, anchor="middle")
    s.button(16, 502, W - 32, "Average my position", filled=False, h=40)
    compass_details(s, 554)
    s.note(16, 738, "Settings → Behind the search area: Plain, Map or Satellite (US).")
    s.note(16, 751, "Heading-up, same scale as the rings; uses saved offline maps.")
    s.render("03f-compass-map-behind")


def compass():
    s = Screen("Old oak tree cache")
    s.text(W / 2, 112, "30.43520° N, 91.19030° W · ✓ Found 2026-10-20", 12, MUTED, anchor="middle")
    s.add(compass_svg(W / 2, 270, 140, heading=30, bearing=75))
    s.text(W / 2, 466, "≈ 125 m", 40, INK, "bold", "middle")
    s.text(W / 2, 490, "uncertainty radius ± 6 m", 15, MUTED, anchor="middle")
    s.button(16, 502, 160, "Average position", filled=False, h=40)
    s.button(184, 502, W - 200, "Mark found", h=40)
    compass_details(s, 554)
    s.note(16, 730, "Rose: N/E/S/W stay true; ▲ = phone heading; arrow → target.")
    s.note(16, 744, "Smoothed heading/position. Inside radius → “look around!”")
    s.render("03-compass")


def compass_mark_found():
    s = Screen("Old oak tree cache")
    s.text(W / 2, 112, "30.43520° N, 91.19030° W", 13, MUTED, anchor="middle")
    s.add(compass_svg(W / 2, 270, 140, heading=30, bearing=75))
    s.add(f"<rect x='0' y='88' width='{W}' height='{H-88}' fill='#000' fill-opacity='0.35'/>")
    s.rect(24, 300, W - 48, 236, fill="#fff", stroke=INK, r=14)
    s.text(40, 334, "Mark as found", 18, weight="bold")
    s.text(40, 362, "Comment", 12, MUTED, "bold")
    s.rect(40, 370, W - 80, 80, fill="#fff")
    s.text(52, 396, "Under the roots, dry log book", 14)
    s.button(40, 470, 132, "Cancel", filled=False)
    s.button(188, 470, 132, "Save find")
    s.note(16, 580, "Comment is optional. Setting “Once per place”: marking again")
    s.note(16, 594, "shows “Update find” and replaces the date and comment.")
    s.note(16, 608, "“Keep a log”: every find is kept. “Off”: no Mark found button.")
    s.note(16, 630, "Exporting or sharing found places asks:")
    s.note(16, 644, "“Include found information?” → Include / Leave out.")
    s.render("03e-compass-mark-found")


def compass_averaging():
    s = Screen("Old oak tree cache")
    s.text(W / 2, 112, "30.43520° N, 91.19030° W", 13, MUTED, anchor="middle")
    s.add(compass_svg(W / 2, 270, 140, heading=30, bearing=75))
    s.text(W / 2, 466, "≈ 121 m", 40, INK, "bold", "middle")
    s.text(W / 2, 490, "uncertainty radius ± 3 m · averaged over 96 fixes", 14, MUTED, anchor="middle")
    s.rect(16, 502, W - 32, 112, fill="#fff", stroke=ACCENT, r=10, sw=2)
    s.text(30, 526, "Averaging your position — stand still", 14, weight="bold")
    s.text(30, 548, "96 fixes · ± 2 m", 14, MUTED)
    s.button(30, 560, W - 60, "Stop averaging", filled=False, h=40)
    compass_details(s, 626)
    s.note(16, 730, "Distance, arrow and radius use your averaged position. Walking")
    s.note(16, 744, "away stops it: “Stopped averaging because you moved.”")
    s.render("03b-compass-averaging")


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
    list_top, list_bottom = top + 60, bottom - 88
    s.clip_start(scroll_id, 16, list_top, W - 32, list_bottom - list_top)
    for i, (n, c, ch) in enumerate(items):
        s.checkbox(30, list_top + 6 + i * 48, n, c, ch)
    s.clip_end()
    s.scrollbar(W - 26, list_top, list_bottom - list_top, 0.6)
    s.button(30, bottom - 82, W - 60, "Share 4 places")
    s.text(30, bottom - 14, "Sharing history (3)", 14, ACCENT, "bold")


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


def settings_more():
    s = Screen("Settings")
    s.text(W / 2, 108, "(scrolled down)", 11, MUTED, anchor="middle")
    s.rect(16, 118, W - 32, 330, fill=FILL, r=12)
    s.text(30, 144, "Search area", 17, weight="bold")
    s.checkbox(30, 156, "Always show the arrow", "Otherwise, close to the cache the compass", False)
    s.text(64, 199, "shows a map of the search area.", 12, MUTED)
    s.text(30, 224, "Show the search area within", 12, MUTED, "bold")
    for x, sym in ((44, "−"), (230, "+")):
        s.add(f"<circle cx='{x+22}' cy='248' r='16' fill='none' stroke='{ACCENT}' stroke-width='2'/>")
        s.text(x + 22, 255, sym, 20, ACCENT, "bold", "middle")
    s.text(156, 255, "50 m", 18, weight="bold", anchor="middle")
    s.text(30, 290, "Behind the search area", 12, MUTED, "bold")
    s.checkbox(30, 300, "Plain", "Just the rings and the search circle.", False)
    s.checkbox(30, 344, "Map", "A street map, turning with you.", True)
    s.checkbox(30, 388, "Satellite", "Aerial imagery (US only; the map elsewhere).", False)
    s.rect(16, 462, W - 32, 176, fill=FILL, r=12)
    s.text(30, 488, "Found places", 17, weight="bold")
    s.checkbox(30, 500, "Off", "Don’t track which places I’ve found.", False)
    s.checkbox(30, 544, "Once per place", "Marking found again updates the date and comment.", True)
    s.checkbox(30, 588, "Keep a log", "Every find is kept, with its date and comment.", False)
    s.note(16, 666, "Continues below: Sharing history, Save.")
    s.render("06b-settings-more")


def settings_end():
    s = Screen("Settings")
    s.text(W / 2, 108, "(scrolled to the end)", 11, MUTED, anchor="middle")
    s.rect(16, 118, W - 32, 214, fill=FILL, r=12)
    s.text(30, 144, "Sharing history", 17, weight="bold")
    s.text(30, 166, "Remember who downloaded my places for", 12, MUTED, "bold")
    for i, (label, ch) in enumerate((("7 days", False), ("30 days", False), ("90 days", True), ("1 year", False), ("Forever", False))):
        s.checkbox(30, 176 + i * 30, label, checked=ch)
    s.button(16, 346, W - 32, "Save")
    s.render("06c-settings-end")


def share_history():
    s = Screen("Sharing history")
    s.text(16, 116, "Kept for 90 days · change this in Settings.", 13, MUTED)
    rows = [("Alex", "3 places · 2026-10-28"), ("FindIt user", "1 place · 2026-10-21"), ("Sam's Pixel", "4 places · 2026-10-02")]
    for i, (n, d) in enumerate(rows):
        y = 132 + i * 58
        s.text(16, y + 22, n, 16, weight="bold")
        s.text(16, y + 42, d, 13, MUTED)
        s.add(f"<line x1='16' y1='{y + 56}' x2='{W - 16}' y2='{y + 56}' stroke='{LINE}'/>")
    s.note(16, 330, "One row each time someone downloads my places, recorded when")
    s.note(16, 344, "they disconnect (connecting without downloading isn’t recorded).")
    s.note(16, 358, "Older FindIt versions send no name: shown as “FindIt user”.")
    s.note(16, 380, "Entries older than the Settings retention are deleted when this or the")
    s.note(16, 394, "Share screen opens. Forever keeps everything.")
    s.button(16, 696, W - 32, "Clear history", filled=False)
    s.note(16, 684, "Asks “Clear sharing history?” first.")
    s.render("08-share-history")


def map_screen():
    s = Screen("Map", header_right="Offline maps")
    top, bottom = 89, H - 2
    s.clip_start("map", 2, top, W - 4, bottom - top - 24)
    s.add(f"<rect x='0' y='{top}' width='{W}' height='{bottom - top}' fill='#eef1ea'/>")
    # streets, a river and a park
    s.add(f"<path d='M-10 520 C 80 470 140 560 380 470' stroke='#b9d3ea' stroke-width='18' fill='none'/>")
    s.add(f"<rect x='210' y='170' width='120' height='90' rx='6' fill='#d7e8cf'/>")
    for x1, y1, x2, y2, w in ((0, 300, 360, 260, 10), (120, 89, 160, 760, 8), (0, 640, 360, 600, 6), (260, 89, 300, 760, 6), (0, 200, 360, 210, 5)):
        s.add(f"<line x1='{x1}' y1='{y1}' x2='{x2}' y2='{y2}' stroke='#fff' stroke-width='{w}'/>")
    markers = [(90, 250, "Bridge micro", False), (230, 330, "Old oak tree cache", True), (200, 470, "Creek crossing ✓", False), (300, 180, "Water tower", False)]
    for x, y, label, sel in markers:
        s.rect(x - len(label) * 3.4, y - 34, len(label) * 6.8, 18, fill="#fff", stroke="none", r=4)
        s.text(x, y - 21, label, 11, INK, "bold", "middle")
        s.add(f"<circle cx='{x}' cy='{y - 7}' r='7' fill='{'#c62828' if sel else ACCENT}' stroke='#fff' stroke-width='2'/>")
    s.add("<circle cx='160' cy='400' r='26' fill='#2f6db5' opacity='0.15'/><circle cx='160' cy='400' r='8' fill='#2f6db5' stroke='#fff' stroke-width='3'/>")
    s.clip_end()
    # layer switch
    s.rect(14, 102, 160, 36, fill="#fff", stroke=LINE, r=8)
    s.rect(14, 102, 60, 36, fill=ACCENT, stroke=ACCENT, r=8)
    s.text(44, 125, "Map", 14, "#fff", "bold", "middle")
    s.text(124, 125, "Satellite", 14, INK, "bold", "middle")
    s.rect(184, 102, 110, 36, fill="#fff", stroke=LINE, r=8)
    s.text(239, 125, "⤓ Download", 14, ACCENT, "bold", "middle")
    s.rect(14, 148, W - 28, 30, fill="#fff", stroke="none", r=8)
    s.text(W / 2, 168, "Downloading for offline use… 42%", 13, INK, anchor="middle")
    s.add(f"<circle cx='{W - 36}' cy='120' r='16' fill='#fff' stroke='{LINE}'/>")
    s.text(W - 36, 125, "N", 13, INK, "bold", "middle")
    # selected place card
    s.rect(14, 588, W - 28, 130, fill="#fff", stroke=LINE, r=12)
    s.text(28, 616, "Old oak tree cache", 18, weight="bold")
    s.text(28, 638, "125 m away", 13, MUTED)
    s.button(28, 656, 146, "Close", filled=False)
    s.button(186, 656, 146, "Find it")
    s.text(W - 14, H - 12, "© OpenFreeMap © OpenStreetMap ⓘ", 9, MUTED, anchor="end")
    s.note(14, 578, "Satellite: USGS imagery, US only (a note says so outside it).")
    s.render("09-map")


def offline_maps():
    s = Screen("Offline maps")
    s.text(16, 114, "Saved areas work with no connection, even in airplane", 12, MUTED)
    s.text(16, 130, "mode. To add one, open the map, show the area and tap", 12, MUTED)
    s.text(16, 146, "Download (once for Map, once for Satellite).", 12, MUTED)
    s.text(16, 174, "3 areas · 48.6 MB", 14, weight="bold")
    rows = [("Near Old oak tree cache", "Satellite · 31.2 MB · downloading 42% · 2026-10-29"),
            ("Near Old oak tree cache", "Map · 6.1 MB · ready · 2026-10-29"),
            ("Near Zoo gate", "Map · 11.3 MB · ready · 2026-10-12")]
    for i, (n, d) in enumerate(rows):
        y = 186 + i * 60
        s.text(16, y + 24, n, 16, weight="bold")
        s.text(16, y + 44, d, 12, MUTED)
        s.text(W - 16, y + 32, "Delete", 14, "#c62828", "bold", "end")
        s.add(f"<line x1='16' y1='{y + 58}' x2='{W - 16}' y2='{y + 58}' stroke='{LINE}'/>")
    s.note(16, 400, "Map → Download saves the area on screen for the current layer")
    s.note(16, 414, "(Map: zooms 10–14; Satellite: 10–16, US only). Areas over ~6,000")
    s.note(16, 428, "tiles are refused: zoom in first. Delete asks to confirm.")
    s.render("10-offline-maps")


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
    s.rect(16, 470, W - 32, 150, fill=FILL, r=12)
    s.text(30, 496, "Search area", 17, weight="bold")
    s.checkbox(30, 508, "Always show the arrow", "Otherwise, close to the cache the compass", False)
    s.text(64, 551, "shows a map of the search area.", 12, MUTED)
    s.text(30, 576, "Show the search area within", 12, MUTED, "bold")
    for x, sym in ((44, "−"), (230, "+")):
        s.add(f"<circle cx='{x+22}' cy='600' r='16' fill='none' stroke='{ACCENT}' stroke-width='2'/>")
        s.text(x + 22, 607, sym, 20, ACCENT, "bold", "middle")
    s.text(156, 607, "50 m", 18, weight="bold", anchor="middle")
    s.button(16, 634, W - 32, "Save")
    s.note(16, 700, "Stored in metres; shown in the current units, rounded to")
    s.note(16, 714, "5 m / 10 ft (50 m ↔ 160 ft). Stored in SQLite (settings).")
    s.render("06-settings")


if __name__ == "__main__":
    for fn in (places, place, averaging, compass, compass_averaging, compass_search_area, compass_in_search_area, compass_mark_found, share, receive, share_history, map_screen, offline_maps, compass_map_behind, settings_end, settings, settings_more, files, files_import):
        fn()
    print("wrote", sorted(p.name for p in OUT.glob("*.svg")))
