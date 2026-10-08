"""Genera las etiquetas (texturas) de las botellas de ejemplo. Genéricas, sin marcas reales.
La textura da la vuelta completa (2048 px ≈ 23,7 cm); el frente visible mide ~640 px, centrado (U=0,5)."""
import os, math
from PIL import Image, ImageDraw, ImageFont
HERE = os.path.dirname(os.path.abspath(__file__))
FONTS = os.path.join(HERE, "..", "_trabajo", "fonts")
OUT = os.path.join(HERE, "labels")
W, H = 2048, 840
CX = W // 2
PW = 660                      # ancho del panel frontal
PX0, PX1 = CX - PW // 2, CX + PW // 2
MONT, BARLOW_BLACK, BARLOW_XB = "Montserrat-VF.ttf", "BarlowCondensed-Black.ttf", "BarlowCondensed-ExtraBold.ttf"


def font(name, size, wght=None):
    f = ImageFont.truetype(os.path.join(FONTS, name), size)
    if wght: f.set_variation_by_axes([wght])
    return f


def T(d, y, s, fname, fill, max_w=PW - 90, max_size=200, wght=None, track=0.0, cx=CX):
    """Texto centrado que se achica hasta entrar en max_w. track = interletrado en fracción del tamaño."""
    size = max_size
    while size > 14:
        f = font(fname, size, wght)
        sp = track * size
        widths = [d.textlength(ch, font=f) for ch in s]
        total = sum(widths) + sp * (len(s) - 1)
        if total <= max_w: break
        size -= 2
    x = cx - total / 2
    for ch, w in zip(s, widths):
        d.text((x, y), ch, font=f, fill=fill, anchor="lm"); x += w + sp
    return size


def rr(d, box, r, fill=None, outline=None, width=1):
    d.rounded_rectangle(box, radius=r, fill=fill, outline=outline, width=width)


def star(d, cx, cy, r1, r2, n, fill):
    pts = []
    for i in range(n * 2):
        a = math.pi * i / n - math.pi / 2
        r = r1 if i % 2 == 0 else r2
        pts.append((cx + r * math.cos(a), cy + r * math.sin(a)))
    d.polygon(pts, fill=fill)


def new(bg):
    im = Image.new("RGB", (W, H), bg); return im, ImageDraw.Draw(im)


def save(im, name):
    im.save(os.path.join(OUT, name + ".png")); print("label", name)


# 1) Fernet: negro + dorado
gold = (214, 172, 80)
im, d = new((18, 12, 9))
rr(d, (PX0, 36, PX1, H - 36), 36, outline=gold, width=7)
rr(d, (PX0 + 18, 54, PX1 - 18, H - 54), 26, outline=gold, width=2)
star(d, CX, 150, 50, 22, 8, gold)
T(d, 345, "FERNET", BARLOW_BLACK, gold, max_size=300, track=0.02)
T(d, 505, "APERITIVO", MONT, (240, 228, 200), max_size=60, wght=700, track=0.16)
T(d, 565, "DE HIERBAS", MONT, (240, 228, 200), max_size=60, wght=700, track=0.16)
d.line((CX - 200, 640, CX + 200, 640), fill=gold, width=3)
T(d, 700, "750 ml", MONT, gold, max_size=46, wght=600, track=0.1)
save(im, "fernet")

# 2) Vodka azul saborizada
im, d = new((14, 30, 100))
rr(d, (PX0, 36, PX1, H - 36), 36, fill=(20, 44, 140))
d.ellipse((CX - 105, 70, CX + 105, 280), fill=(156, 64, 224)); d.ellipse((CX - 165, 140, CX + 165, 210), outline=(255, 214, 74), width=9)
d.ellipse((CX - 105, 70, CX + 105, 280), outline=(255, 255, 255), width=3)
T(d, 410, "VODKA", BARLOW_BLACK, (255, 255, 255), max_size=290, track=0.03)
T(d, 560, "SABORIZADA", MONT, (255, 214, 74), max_size=70, wght=800, track=0.1)
T(d, 690, "750 ml", MONT, (200, 212, 255), max_size=46, wght=600, track=0.1)
save(im, "vodka_azul")

# 3) Aperitivo verde
green = (0, 104, 58); red = (196, 30, 40); cream = (246, 241, 226)
im, d = new(cream)
d.rectangle((0, 0, W, 70), fill=green); d.rectangle((0, 580, W, H), fill=green)
d.ellipse((CX - 62, 100, CX + 62, 224), fill=red)
T(d, 163, "A", MONT, (255, 255, 255), max_w=80, max_size=90, wght=900)
T(d, 380, "AMERICANO", MONT, green, max_size=150, wght=900, track=0.01)
T(d, 490, "APERITIVO", MONT, (70, 70, 70), max_size=56, wght=600, track=0.22)
T(d, 700, "750 ml", MONT, (255, 255, 255), max_size=50, wght=700, track=0.1)
save(im, "aperitivo_verde")

# 4) Vodka frambuesa
im, d = new((250, 250, 250))
d.rectangle((0, 480, W, H), fill=(200, 22, 48))
T(d, 200, "VODKA", BARLOW_BLACK, (200, 22, 48), max_size=270, track=0.03)
T(d, 345, "SABOR", MONT, (90, 90, 90), max_size=52, wght=700, track=0.3)
T(d, 585, "FRAMBUESA", BARLOW_XB, (255, 255, 255), max_size=200, track=0.01)
for dx, dy in [(-34, 0), (0, -26), (34, 0), (-17, 28), (17, 28), (0, 4)]:
    d.ellipse((CX + dx - 24, 700 + dy - 24, CX + dx + 24, 700 + dy + 24), fill=(255, 255, 255))
save(im, "vodka_frambuesa")

# 5) Rosado frutos rojos
im, d = new((214, 44, 112))
rr(d, (PX0, 36, PX1, H - 36), 50, fill=(214, 44, 112), outline=(255, 214, 120), width=6)
for (x, y, r) in [(PX0 + 90, 120, 52), (PX1 - 80, 700, 58), (PX0 + 120, 720, 34), (PX1 - 100, 130, 36)]:
    d.ellipse((x - r, y - r, x + r, y + r), fill=(236, 92, 152))
T(d, 285, "ROSADO", MONT, (255, 255, 255), max_size=170, wght=900, track=0.01)
d.line((CX - 220, 385, CX + 220, 385), fill=(255, 214, 120), width=4)
T(d, 465, "FRUTOS", MONT, (255, 230, 150), max_size=90, wght=800, track=0.1)
T(d, 555, "ROJOS", MONT, (255, 230, 150), max_size=90, wght=800, track=0.1)
T(d, 680, "VINO", MONT, (255, 255, 255), max_size=52, wght=600, track=0.3)
save(im, "rosado_frutos")

# 6a) Tinto
gl = (224, 186, 102)
im, d = new((150, 18, 38))
rr(d, (PX0, 36, PX1, H - 36), 30, outline=gl, width=6)
T(d, 125, "VINO", MONT, (240, 220, 190), max_size=54, wght=600, track=0.32)
d.line((CX - 230, 205, CX + 230, 205), fill=gl, width=3)
T(d, 410, "TINTO", MONT, (250, 236, 210), max_size=200, wght=900, track=0.01)
d.line((CX - 230, 615, CX + 230, 615), fill=gl, width=3)
T(d, 700, "750 ml", MONT, gl, max_size=52, wght=600, track=0.12)
save(im, "tinto")

# 6b) Blanco
gr = (50, 110, 58)
im, d = new((246, 242, 222))
rr(d, (PX0, 36, PX1, H - 36), 30, outline=gr, width=6)
T(d, 125, "VINO", MONT, (60, 90, 60), max_size=54, wght=600, track=0.32)
d.line((CX - 230, 205, CX + 230, 205), fill=gr, width=3)
T(d, 410, "BLANCO", MONT, (40, 100, 52), max_size=190, wght=900, track=0.01)
d.line((CX - 230, 615, CX + 230, 615), fill=gr, width=3)
T(d, 700, "750 ml", MONT, (60, 90, 60), max_size=52, wght=600, track=0.12)
save(im, "blanco")

# 7) Tinto clásico
im, d = new((236, 226, 190))
rr(d, (PX0, 36, PX1, H - 36), 30, outline=(150, 18, 38), width=5)
d.ellipse((CX - 66, 90, CX + 66, 222), fill=(190, 150, 60)); star(d, CX, 156, 40, 17, 6, (150, 18, 38))
T(d, 395, "CLÁSICO", MONT, (150, 18, 38), max_size=150, wght=900, track=0.01)
d.line((CX - 220, 490, CX + 220, 490), fill=(190, 150, 60), width=4)
T(d, 575, "VINO TINTO", MONT, (70, 40, 30), max_size=62, wght=700, track=0.14)
T(d, 690, "750 ml", MONT, (150, 18, 38), max_size=46, wght=600, track=0.1)
save(im, "tinto_clasico")

# 8) Rosado negro
pk = (255, 122, 172)
im, d = new((10, 10, 12))
rr(d, (PX0, 36, PX1, H - 36), 30, outline=pk, width=5)
T(d, 140, "VINO", MONT, (255, 255, 255), max_size=54, wght=600, track=0.32)
T(d, 400, "ROSADO", BARLOW_BLACK, pk, max_size=290, track=0.03)
d.line((CX - 220, 545, CX + 220, 545), fill=pk, width=3)
T(d, 650, "750 ml", MONT, (255, 255, 255), max_size=50, wght=600, track=0.12)
save(im, "rosado_negro")


# 9) Espumante
gold = (214, 172, 80)
im, d = new((240, 230, 200))
rr(d, (PX0, 36, PX1, H - 36), 30, outline=gold, width=7)
rr(d, (PX0 + 16, 52, PX1 - 16, H - 52), 22, outline=gold, width=2)
star(d, CX, 150, 46, 20, 8, gold)
T(d, 330, "ESPUMANTE", MONT, (92, 26, 40), max_size=96, wght=900, track=0.02)
d.line((CX - 210, 410, CX + 210, 410), fill=gold, width=4)
T(d, 520, "BRUT", BARLOW_BLACK, (92, 26, 40), max_size=230, track=0.08)
T(d, 640, "ELABORADO", MONT, (110, 80, 50), max_size=34, wght=600, track=0.3)
T(d, 700, "750 ml", MONT, (92, 26, 40), max_size=44, wght=700, track=0.1)
save(im, "espumante")

# 10) Lata de cerveza (etiqueta de vuelta completa, otro tamaño)
W2, H2 = 2048, 1306
im = Image.new("RGB", (W2, H2), (250, 190, 20)); d = ImageDraw.Draw(im)
for i in range(-6, 14):                                  # rayas verticales
    d.rectangle((i * 190 + 40, 0, i * 190 + 120, H2), fill=(240, 170, 10))
d.rectangle((0, 0, W2, 150), fill=(120, 30, 20)); d.rectangle((0, H2 - 150, W2, H2), fill=(120, 30, 20))
d.rectangle((0, 150, W2, 162), fill=(255, 235, 150)); d.rectangle((0, H2 - 162, W2, H2 - 150), fill=(255, 235, 150))
def T2(y, s, fname, fill, max_w, max_size, wght=None, track=0.0):
    size = max_size
    while size > 14:
        f = font(fname, size, wght); sp = track * size
        widths = [d.textlength(ch, font=f) for ch in s]; total = sum(widths) + sp * (len(s) - 1)
        if total <= max_w: break
        size -= 2
    x = CX - total / 2
    for ch, w_ in zip(s, widths): d.text((x, y), ch, font=f, fill=fill, anchor="lm"); x += w_ + sp
T2(650, "CERVEZA", BARLOW_BLACK, (120, 30, 20), 600, 330, track=0.02)
T2(870, "RUBIA", MONT, (255, 255, 255), 520, 120, wght=900, track=0.2)
d.ellipse((CX - 95, 290, CX + 95, 480), fill=(120, 30, 20))
star(d, CX, 385, 64, 28, 8, (255, 214, 74))
T2(1100, "473 ml", MONT, (120, 30, 20), 300, 60, wght=800, track=0.1)
im.save(os.path.join(OUT, "cerveza.png")); print("label cerveza")
