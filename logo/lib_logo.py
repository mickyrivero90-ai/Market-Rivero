"""Utilidades para construir el logo de Rivero Market como vectores (texto convertido a curvas)."""
import os, subprocess, tempfile
import numpy as np
from PIL import Image
import uharfbuzz as hb
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FONTS = os.path.join(ROOT, "_trabajo", "fonts")
PROFILE = os.path.join(ROOT, "_trabajo", "ffprofile")


class Face:
    def __init__(self, fname):
        path = fname if os.path.isabs(fname) else os.path.join(FONTS, fname)
        self.tt = TTFont(path); self.gs = self.tt.getGlyphSet(); self.order = self.tt.getGlyphOrder()
        self.upm = self.tt["head"].unitsPerEm
        self.cap = getattr(self.tt["OS/2"], "sCapHeight", 700) / self.upm
        self.hbfont = hb.Font(hb.Face(hb.Blob.from_file_path(path)))

    def _shape(self, text):
        buf = hb.Buffer(); buf.add_str(text); buf.guess_segment_properties()
        hb.shape(self.hbfont, buf, {"kern": True, "liga": False})
        return buf.glyph_infos, buf.glyph_positions

    def width(self, text, size, tracking=0.0):
        infos, pos = self._shape(text)
        adv = sum(p.x_advance for p in pos) + tracking * self.upm * (len(pos) - 1)
        return adv * size / self.upm

    def path(self, text, size, x=0.0, y=0.0, tracking=0.0, anchor="start"):
        """Devuelve (d, ancho). Línea base en y. tracking en em. anchor: start|middle|end."""
        infos, pos = self._shape(text)
        sc = size / self.upm
        w = self.width(text, size, tracking)
        x0 = x - (w / 2 if anchor == "middle" else w if anchor == "end" else 0)
        pen_x = 0.0; parts = []
        for info, p in zip(infos, pos):
            pen = SVGPathPen(self.gs, ntos=lambda v: ("%.2f" % v).rstrip("0").rstrip("."))
            tp = TransformPen(pen, (sc, 0, 0, -sc, x0 + (pen_x + p.x_offset) * sc, y - p.y_offset * sc))
            self.gs[self.order[info.codepoint]].draw(tp)
            parts.append(pen.getCommands())
            pen_x += p.x_advance + tracking * self.upm
        return " ".join(parts), w


def shot(src, out, w, h, timeout=120):
    """Captura con Firefox headless (perfil aparte para no chocar con el Firefox abierto)."""
    os.makedirs(PROFILE, exist_ok=True)
    subprocess.run(["firefox", "--headless", "--no-remote", "--profile", PROFILE, "--screenshot", out,
                    f"--window-size={w},{h}", "file://" + os.path.abspath(src)], capture_output=True, timeout=timeout)
    return out


def svg_to_png_transparent(svg_text, out_png, w, h):
    """Renderiza un SVG con fondo transparente: dos pasadas (negro/blanco) y se despeja el alfa exacto."""
    tmp = tempfile.mkdtemp(prefix="logo_", dir=os.path.join(ROOT, "_trabajo"))
    res = {}
    for name, bg in (("k", "#000"), ("w", "#fff")):
        html = f'<!doctype html><meta charset="utf-8"><body style="margin:0;background:{bg}"><div style="width:{w}px;height:{h}px;overflow:hidden">{svg_text}</div></body>'
        hp = os.path.join(tmp, name + ".html"); open(hp, "w").write(html)
        png = os.path.join(tmp, name + ".png"); shot(hp, png, w, h)
        res[name] = np.asarray(Image.open(png).convert("RGB").crop((0, 0, w, h)), dtype=np.float32)
    K, W = res["k"], res["w"]
    a = 1.0 - (W - K).mean(axis=2) / 255.0
    a = np.clip(a, 0, 1)
    rgb = np.where(a[..., None] > 1e-3, K / np.maximum(a[..., None], 1e-3), 0)
    out = np.dstack([np.clip(rgb, 0, 255), a * 255]).astype(np.uint8)
    Image.fromarray(out, "RGBA").save(out_png)
    return out_png
