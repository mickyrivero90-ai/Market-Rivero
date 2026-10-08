"""Rivero Market · construcción del logo (todo en vectores)."""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib_logo import *

# Paleta de marca
ORANGE = "#E64F12"      # naranja Rivero (un punto más profundo que el original #EA571B: mejor lectura del blanco)
ORANGE_D = "#BF3A06"    # naranja profundo (sombras / degradados)
YELLOW = "#FFC400"      # amarillo oferta
YELLOW_L = "#FFD84A"
BROWN = "#4A1500"       # marrón chocolate (texto sobre amarillo)
RED = "#D50F25"         # rojo precio
WHITE = "#FFFFFF"
CREAM = "#FFF6E5"

M800 = Face("static/Montserrat-800.ttf")
M900 = Face("static/Montserrat-900.ttf")


def defs(uid="a"):
    return f'''<defs>
<linearGradient id="gy{uid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{YELLOW_L}"/><stop offset="1" stop-color="#FFB400"/></linearGradient>
</defs>'''


def icon(ring=WHITE, disc=None, fg=BROWN, uid="a", ring_on=True):
    """Insignia 200×200: aro + disco amarillo + carrito con la R recortada."""
    disc = disc or f"url(#gy{uid})"
    rd, rw = M900.path("R", 60, 114, 88 + M900.cap * 60 / 2, anchor="middle")
    knock = YELLOW_L if disc.startswith("url") else disc
    ringsvg = f'<circle cx="100" cy="100" r="99" fill="{ring}"/>' if ring_on else ""
    return f'''{ringsvg}<circle cx="100" cy="100" r="{90 if ring_on else 99}" fill="{disc}"/>
<g fill="{fg}" stroke="{fg}" stroke-linecap="round" stroke-linejoin="round">
<path d="M30 52 H52 L71 136 H158" fill="none" stroke-width="13"/>
<path d="M58 58 H172 L155 114 H67 Z" stroke-width="12"/>
<circle cx="92" cy="160" r="11.5" stroke="none"/><circle cx="142" cy="160" r="11.5" stroke="none"/></g>
<path d="{rd}" fill="{knock}"/>'''


def tag_path(x, y, w, h, hole=True):
    """Etiqueta de precio: punta chaflanada a la izquierda con agujerito, esquinas redondeadas a la derecha."""
    c = h * 0.5; r = h * 0.2
    d = (f"M{x+c:.1f} {y:.1f} H{x+w-r:.1f} Q{x+w:.1f} {y:.1f} {x+w:.1f} {y+r:.1f} V{y+h-r:.1f} Q{x+w:.1f} {y+h:.1f} {x+w-r:.1f} {y+h:.1f} "
         f"H{x+c:.1f} L{x:.1f} {y+h/2:.1f} Z")
    if hole:
        hr = h * 0.105; hx = x + c * 0.92; hy = y + h / 2
        d += f" M{hx+hr:.1f} {hy:.1f} A{hr:.1f} {hr:.1f} 0 1 0 {hx-hr:.1f} {hy:.1f} A{hr:.1f} {hr:.1f} 0 1 0 {hx+hr:.1f} {hy:.1f} Z"
    return d


def lockup_h(scheme="orange", tag_align="left", uid="h"):
    """Logo horizontal. Devuelve (svg, w, h)."""
    S = {"orange": dict(word=WHITE, ring=WHITE, tag=f"url(#gy{uid})", tagtxt=BROWN),
         "light":  dict(word=ORANGE, ring=ORANGE, tag=f"url(#gy{uid})", tagtxt=BROWN),
         "dark":   dict(word=WHITE, ring=YELLOW, tag=f"url(#gy{uid})", tagtxt=BROWN),
         "mono":   dict(word=WHITE, ring=WHITE, tag=WHITE, tagtxt=ORANGE)}[scheme]
    size = 214; cap = M800.cap * size; track = -0.012
    wword = M800.width("RIVERO", size, track)
    bx, by, bs = 0, 14, 272                      # insignia
    tx = bs + 44                                 # inicio del texto
    block_h = cap + 28 + 72
    top = by + bs / 2 - block_h / 2
    base_y = top + cap
    dword, _ = M800.path("RIVERO", size, tx, base_y, track)
    # etiqueta MARKET
    tsz = 50; ttrack = 0.28
    tw = M800.width("MARKET", tsz, ttrack); th = 72; pad_l = th * 0.95; pad_r = th * 0.5
    tagw = tw + pad_l + pad_r
    tagy = base_y + 28
    lsb = M800.tt["hmtx"][M800.tt.getBestCmap()[ord("R")]][1] * size / M800.upm
    if tag_align == "left": tagx = tx + lsb
    elif tag_align == "center": tagx = tx + (wword - tagw) / 2
    else: tagx = tx + wword - tagw
    dmark, _ = M800.path("MARKET", tsz, tagx + pad_l, tagy + th / 2 + M800.cap * tsz / 2, ttrack)
    W = tx + wword + 6; H = by * 2 + bs
    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W:.0f} {H:.0f}" width="{W:.0f}" height="{H:.0f}">{defs(uid)}
<g transform="translate({bx} {by}) scale({bs/200})">{icon(S["ring"], uid=uid)}</g>
<path d="{dword}" fill="{S["word"]}"/>
<path d="{tag_path(tagx, tagy, tagw, th)}" fill="{S["tag"]}" fill-rule="evenodd"/>
<path d="{dmark}" fill="{S["tagtxt"]}"/></svg>'''
    return svg, W, H


if __name__ == "__main__" and "--prueba" in sys.argv:
    rows = []
    y = 0
    for i, al in enumerate(("left", "center", "right")):
        svg, W, H = lockup_h("orange", al, uid=f"t{i}")
        rows.append(f'<g transform="translate(40 {30 + i*340})">{svg.split(">",1)[1].rsplit("</svg>",1)[0]}</g>')
    Wt, Ht = 1340, 1060
    sheet = f'<svg xmlns="http://www.w3.org/2000/svg" width="{Wt}" height="{Ht}" viewBox="0 0 {Wt} {Ht}"><rect width="{Wt}" height="{Ht}" fill="{ORANGE}"/>{defs("t0")}{defs("t1")}{defs("t2")}{"".join(rows)}</svg>'
    out = os.path.join(ROOT, "_trabajo", "lockups.svg"); open(out, "w").write(sheet)
    shot(out, os.path.join(ROOT, "_trabajo", "lockups.png"), Wt, Ht); print("ok", W, H)


def lockup_v(scheme="orange", uid="v"):
    """Logo vertical (insignia arriba, RIVERO abajo, etiqueta centrada)."""
    S = {"orange": dict(word=WHITE, ring=WHITE), "light": dict(word=ORANGE, ring=ORANGE), "dark": dict(word=WHITE, ring=YELLOW), "mono": dict(word=WHITE, ring=WHITE)}[scheme]
    W = 760; bs = 300
    size = 170; cap = M800.cap * size; track = -0.012
    wword = M800.width("RIVERO", size, track)
    base_y = bs + 40 + 20 + cap
    dword, _ = M800.path("RIVERO", size, W / 2, base_y, track, anchor="middle")
    tsz = 44; ttrack = 0.28; tw = M800.width("MARKET", tsz, ttrack); th = 64; pad_l = th * 0.95; pad_r = th * 0.5
    tagw = tw + pad_l + pad_r; tagx = (W - tagw) / 2; tagy = base_y + 26
    dmark, _ = M800.path("MARKET", tsz, tagx + pad_l, tagy + th / 2 + M800.cap * tsz / 2, ttrack)
    H = tagy + th + 18
    tagfill = WHITE if scheme == "mono" else f"url(#gy{uid})"; tagtxt = ORANGE if scheme == "mono" else BROWN
    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H:.0f}" width="{W}" height="{H:.0f}">{defs(uid)}
<g transform="translate({(W-bs)/2} 12) scale({bs/200})">{icon(S["ring"], uid=uid)}</g>
<path d="{dword}" fill="{S["word"]}"/>
<path d="{tag_path(tagx, tagy, tagw, th)}" fill="{tagfill}" fill-rule="evenodd"/>
<path d="{dmark}" fill="{tagtxt}"/></svg>'''
    return svg, W, H


def icon_svg(size=1024, bg=ORANGE, rounded=True, uid="i"):
    """Ícono cuadrado para foto de perfil (Facebook / WhatsApp / Instagram)."""
    r = size * 0.22 if rounded else 0
    k = size * 0.80 / 200
    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {size} {size}" width="{size}" height="{size}">{defs(uid)}
<rect width="{size}" height="{size}" rx="{r}" fill="{bg}"/>
<g transform="translate({size*0.10} {size*0.10}) scale({k})">{icon(WHITE, uid=uid)}</g></svg>'''
    return svg


def write(name, svg, png_w=None):
    path = os.path.join(os.path.dirname(os.path.abspath(__file__)), name + ".svg"); open(path, "w").write(svg)
    if png_w:
        import re
        m = re.search(r'viewBox="0 0 ([\d.]+) ([\d.]+)"', svg); W, H = float(m.group(1)), float(m.group(2))
        pw = png_w; ph = round(png_w * H / W)
        scaled = re.sub(r'width="[\d.]+" height="[\d.]+"', f'width="{pw}" height="{ph}"', svg, count=1)
        svg_to_png_transparent(scaled, path[:-4] + ".png", pw, ph)
    return path


def export_all():
    for scheme, nm in (("orange", "sobre-naranja"), ("light", "sobre-claro"), ("dark", "sobre-oscuro"), ("mono", "blanco")):
        svg, W, H = lockup_h(scheme, "left", uid="h" + scheme); write(f"rivero-market_horizontal_{nm}", svg, 2400)
        svg, W, H = lockup_v(scheme, uid="v" + scheme); write(f"rivero-market_vertical_{nm}", svg, 1400)
    write("rivero-market_icono-perfil", icon_svg(1024), 1024)
    write("rivero-market_icono-insignia", f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">{defs("b")}{icon(WHITE, uid="b")}</svg>', 1024)


if __name__ == "__main__" and "--todo" in sys.argv:
    export_all(); print("exportado")
