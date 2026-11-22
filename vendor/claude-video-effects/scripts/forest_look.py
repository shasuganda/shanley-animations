"""The Shanley forest look for the effects in fx.py.

Added by Shanley AI; not part of the original pack. The effects themselves are untouched: this file
changes what they draw WITH. Type becomes Instrument Serif and Geist Mono, every colour is moved onto the
forest palette (forest green blocks, cream type, one gold accent), glass and glow become flat blocks
with a hairline edge, and large shapes get nearly square corners.

fx.py calls apply(globals()) unless it is run with --style original.
"""
import colorsys, os
import numpy as np
from PIL import Image as _Image, ImageColor, ImageDraw as _ImageDraw, ImageFont

FOREST, DEEP, BAR = (32, 48, 40), (26, 40, 33), (20, 32, 26)
HAIR, CREAM, SECOND, KHAKI, GOLD = (60, 82, 70), (240, 232, 224), (208, 208, 192), (184, 176, 136), (212, 175, 55)
K = 1.0   # output width / 1080, set by fx.py once the size is known
ON = False   # True once apply() has run


def _parse(col):
    """A colour as (r, g, b, a), or None if it is not one this look should touch."""
    if isinstance(col, str):
        try: col = ImageColor.getrgb(col)
        except ValueError: return None
    if isinstance(col, (tuple, list)) and len(col) in (3, 4):
        try: c = [int(v) for v in col]
        except (TypeError, ValueError): return None
        return (c[0], c[1], c[2], c[3] if len(c) == 4 else 255)
    return None


def _kind(r, g, b):
    h, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
    if v < 0.16: return 'dark'
    if s >= 0.26: return 'accent'
    return 'light' if v >= 0.78 else 'dark' if v < 0.36 else 'mid'


def _light(px):
    """True when a pixel that is already drawn is pale enough to need dark type on top."""
    return px is not None and px[3] > 150 and (0.299 * px[0] + 0.587 * px[1] + 0.114 * px[2]) > 150


def ink(col, under=None):
    """Type and strokes: cream, khaki for the quiet lines, gold for the accent; dark ink on anything pale."""
    p = _parse(col)
    if p is None: return col
    k = _kind(*p[:3])
    if _light(under): out = BAR
    else: out = {'light': CREAM, 'dark': CREAM, 'mid': KHAKI, 'accent': GOLD}[k]
    return out + (p[3],)


def stroke(col, under=None):
    """Lines and outlines: like type, but dark stays dark and grey becomes the hairline green."""
    p = _parse(col)
    if p is None: return col
    k = _kind(*p[:3])
    if _light(under) and k != 'dark': out = BAR
    else: out = {'light': CREAM, 'dark': BAR, 'mid': HAIR, 'accent': GOLD}[k]
    return out + (p[3],)


def area(col, w, h, round_=False):
    """A filled shape. Returns (fill, outline or None). Big shapes become flat green blocks with a thin edge;
    small ones (dots, knobs, ticks, underlines) carry the cream or the gold."""
    p = _parse(col)
    if p is None: return col, None
    k = _kind(*p[:3])
    lo, floor = (80, 9000) if round_ else (36, 3200)   # a round shape has to be bigger before it counts as a block
    big = min(w, h) >= lo * K and w * h >= floor * K * K
    if big:
        fill = BAR if k in ('dark', 'accent') else DEEP
        edge = (GOLD if k == 'accent' else HAIR) if p[3] >= 200 else None
    else:
        fill = {'light': CREAM, 'dark': BAR, 'mid': HAIR, 'accent': GOLD}[k]; edge = None
    return fill + (p[3],), (edge + (p[3],) if edge else None)


def _box(xy):
    pts = np.asarray(xy, dtype=np.float64).reshape(-1, 2)
    return float(pts[:, 0].max() - pts[:, 0].min()), float(pts[:, 1].max() - pts[:, 1].min())


class ForestDraw(_ImageDraw.ImageDraw):
    """ImageDraw that recolours everything drawn through it."""
    def _colour(self): return self.im.mode in ('RGB', 'RGBA')

    def _under(self, x, y):
        try:
            x, y = int(x), int(y)
            if 0 <= x < self._image.width and 0 <= y < self._image.height:
                px = self._image.getpixel((x, y)); return px if len(px) == 4 else px + (255,)
        except Exception: pass
        return None

    def _shape(self, xy, fill, outline, width, round_=False):
        if not self._colour(): return fill, outline, width
        w, h = _box(xy); edge = None
        if fill is not None: fill, edge = area(fill, w, h, round_)
        if outline is not None: outline = stroke(outline)
        elif edge is not None: outline, width = edge, max(1, int(round((2 if edge[:3] == GOLD else 1) * K)))
        return fill, outline, width

    def rectangle(self, xy, fill=None, outline=None, width=1):
        fill, outline, width = self._shape(xy, fill, outline, width)
        super().rectangle(xy, fill, outline, width)

    def rounded_rectangle(self, xy, radius=0, fill=None, outline=None, width=1, **kw):
        w, h = _box(xy); pill = radius >= min(w, h) / 2 - 1 and min(w, h) < 70 * K
        if min(w, h) >= 70 * K: radius = min(radius, 4 * K)   # large blocks: nearly square corners
        fill, outline, width = self._shape(xy, fill, outline, width, pill and max(w, h) < 1.3 * min(w, h))
        super().rounded_rectangle(xy, radius, fill, outline, width, **kw)

    def ellipse(self, xy, fill=None, outline=None, width=1):
        fill, outline, width = self._shape(xy, fill, outline, width, True)
        super().ellipse(xy, fill, outline, width)

    def polygon(self, xy, fill=None, outline=None, width=1):
        fill, outline, width = self._shape(xy, fill, outline, width)
        super().polygon(xy, fill, outline, width)

    def pieslice(self, xy, start, end, fill=None, outline=None, width=1):
        fill, outline, width = self._shape(xy, fill, outline, width)
        super().pieslice(xy, start, end, fill, outline, width)

    def chord(self, xy, start, end, fill=None, outline=None, width=1):
        fill, outline, width = self._shape(xy, fill, outline, width)
        super().chord(xy, start, end, fill, outline, width)

    def line(self, xy, fill=None, width=0, joint=None):
        if self._colour() and fill is not None:
            pts = np.asarray(xy, dtype=np.float64).reshape(-1, 2); mid = pts[len(pts) // 2]
            fill = stroke(fill, self._under(mid[0], mid[1]))
        super().line(xy, fill, width, joint)

    def arc(self, xy, start, end, fill=None, width=1):
        if self._colour() and fill is not None: fill = stroke(fill)
        super().arc(xy, start, end, fill, width)

    def text(self, xy, text, fill=None, font=None, anchor=None, *args, **kw):
        if font is not None: font = _with_glyphs(font, text)
        if self._colour():
            under = None
            try:
                bb = self.textbbox(xy, text, font=font, anchor=anchor)
                under = self._under((bb[0] + bb[2]) / 2, (bb[1] + bb[3]) / 2)
            except Exception: pass
            if fill is not None: fill = ink(fill, under)
            if kw.get('stroke_fill') is not None: kw['stroke_fill'] = stroke(kw['stroke_fill'])
        super().text(xy, text, fill, font, anchor, *args, **kw)


_cmaps, _fallback = {}, {}
def _covers(path, s):
    if path not in _cmaps:
        try:
            from fontTools.ttLib import TTFont
            _cmaps[path] = set(TTFont(path, lazy=True).getBestCmap())
        except Exception: _cmaps[path] = None
    return _cmaps[path] is None or all(ord(ch) in _cmaps[path] or ch.isspace() for ch in s)


def _with_glyphs(font, text):
    """The same font, or the interface font at the same size when this one lacks a letter (arrows, ticks)."""
    path = getattr(font, 'path', None)
    if not path or not isinstance(text, str) or _covers(path, text): return font
    key = int(font.size)
    if key not in _fallback:
        f = ImageFont.truetype(os.path.join(os.path.dirname(path), 'Inter.ttf'), key)
        try: f.set_variation_by_axes([24, 540])
        except Exception: pass
        _fallback[key] = f
    return _fallback[key]


class _Proxy:
    """Stands in for a PIL module inside fx.py, with a few functions swapped."""
    def __init__(self, mod, **swap): self.__dict__['_mod'] = mod; self.__dict__.update(swap)
    def __getattr__(self, name): return getattr(self._mod, name)


def _new(mode, size, color=0):
    # A solid opaque canvas is a card or a panel: make it a green block.
    if mode in ('RGB', 'RGBA'):
        p = _parse(color)
        if p is not None and p[3] == 255 and not (mode == 'RGBA' and len(color) == 3 and False):
            color = area(color, 1e6, 1e6)[0][:len(color) if not isinstance(color, str) else 4]
    return _Image.new(mode, size, color)


def block(w, h, r=0, alpha=245, edge=HAIR, fill=DEEP):
    """The flat block that replaces every glass and glow panel."""
    w, h = max(2, int(w)), max(2, int(h))
    im = _Image.new('RGBA', (w, h), (0, 0, 0, 0))
    rad = int(min(r, h / 2)) if min(w, h) < 70 * K else int(4 * K)
    _ImageDraw.Draw(im).rounded_rectangle([0, 0, w - 1, h - 1], rad, fill=fill + (alpha,), outline=edge + (255,), width=max(1, int(round(1.5 * K))))
    return im


def apply(g):
    """Switch fx.py (its globals, g) over to the forest look."""
    global ON
    ON = True
    fonts = os.path.join(g['ROOT'], 'fonts')
    serif, italic, mono = (os.path.join(fonts, f) for f in ('InstrumentSerif-Regular.ttf', 'InstrumentSerif-Italic.ttf', 'GeistMono-Medium.ttf'))
    original = dict(g['FONT'])
    for k in ('bold', 'anton', 'mont', 'monts', 'montb', 'didone', 'didoneb'): g['FONT'][k] = serif
    for k in ('serif', 'didonei', 'hand'): g['FONT'][k] = italic
    g['FONT']['mono'] = mono
    for k in ('mont', 'monts', 'montb', 'didone', 'didoneb', 'didonei'): g['WGHT'].pop(k, None)
    g['CREAM'], g['INK'], g['PEACH'], g['YELLOW'], g['GREEN'] = CREAM, BAR, GOLD, GOLD, GOLD

    g['ImageDraw'] = _Proxy(_ImageDraw, Draw=lambda im, mode=None: ForestDraw(im, mode))
    g['Image'] = _Proxy(_Image, new=_new)

    def safe(kind, s): return kind if _covers(g['FONT'][kind], s) else 'uim'   # letters the look's fonts lack fall back

    # Big interface-font lines are titles: they take the serif. Small ones stay as interface text.
    font = g['font']
    g['font'] = lambda kind, size: font('bold' if kind in ('ui', 'uim', 'uib') and size >= 58 * K else kind, size)

    text_img, fit_text = g['text_img'], g['fit_text']
    def text_img2(s, size, kind='bold', fill=(255, 255, 255), stroke=0, stroke_fill=BAR, shadow=0, glow=None):
        return text_img(s, size, safe(kind, s), fill, stroke, stroke_fill, shadow, None)   # no glow in this look
    def fit_text2(s, max_w, kind='bold', start=400, **kw):
        kw.pop('glow', None); return fit_text(s, max_w, safe(kind, s), start, **kw)
    g['text_img'], g['fit_text'] = text_img2, fit_text2

    rgb = g['rgb']
    g['rgb'] = lambda v, default: rgb(v, default) if v is not None else stroke(default)[:3]

    def shadowed(im, blur=18, dy=10, alpha=120):   # same size as before, so layouts hold; no shadow
        pad = blur * 2 + abs(dy)
        out = _Image.new('RGBA', (im.width + 2 * pad, im.height + 2 * pad), (0, 0, 0, 0)); out.alpha_composite(im, (pad, pad))
        return out
    g['shadowed'] = shadowed

    def glass(c, w, h, r, cx, cy, amt=0.22, tint=(255, 255, 255), blur=None, alpha=240, dark=0.0, liquid=True):
        return block(w, h, r)
    g['glass'] = glass

    def liquid_glass(c, box, r=None, blur=None):
        x0, y0, x1, y1 = [int(round(v)) for v in box]
        if x1 - x0 < 8 or y1 - y0 < 8: return
        g['comp'](c, block(x1 - x0, y1 - y0, r or 0), x0, y0)
    g['liquid_glass'] = liquid_glass

    def glow_panel(w, h, r, top, bot, line, glow, gblur):
        pad = int(gblur * 2.2); body = block(w, h, r)
        out = _Image.new('RGBA', (body.width + 2 * pad, body.height + 2 * pad), (0, 0, 0, 0)); out.alpha_composite(body, (pad, pad))
        return out, pad
    g['glow_panel'] = glow_panel

    def gradient_text(s, size, kind, top, bot, glow=None):
        return text_img2(s, size, kind, fill=CREAM, shadow=max(2, int(size * 0.03)))
    g['gradient_text'] = gradient_text
