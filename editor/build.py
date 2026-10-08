#!/usr/bin/env python3
"""Arma el generador de ofertas de Rivero Market.

Genera:
  - ofertas_rivero_market.html  → archivo único, funciona sin internet (abrilo con doble clic)
  - _publicar.html              → mismo contenido sin <html>/<head>/<body> (para publicar como página)
  - _prueba.html                → banco de pruebas para capturar el folleto con Firefox headless

Uso: ../_trabajo/venv/bin/python build.py [--solo-prueba]
"""
import base64, json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
SRC = os.path.join(HERE, "src")


def b64(path):
    with open(path, "rb") as f:
        return base64.b64encode(f.read()).decode()


def datauri(path, mime):
    return f"data:{mime};base64,{b64(path)}"


def read(path):
    with open(path, encoding="utf-8") as f:
        return f.read()


# ── fuentes (CSS @font-face con datos incrustados) ──
FS = os.path.join(HERE, "fonts_sub")
face = lambda fam, f, w, st: ('@font-face{font-family:"%s";src:url(%s) format("woff2");font-weight:%s;font-style:%s;font-display:block}'
                              % (fam, datauri(os.path.join(FS, f), "font/woff2"), w, st))
fonts_css = "\n".join([
    face("RM Mont", "Mont-VF.woff2", "500 900", "normal"),
    face("RM Barlow", "Barlow-SemiBold.woff2", "600", "normal"),
    face("RM Barlow", "Barlow-Bold.woff2", "700", "normal"),
    face("RM Barlow", "Barlow-ExtraBold.woff2", "800", "normal"),
    face("RM Barlow", "Barlow-Black.woff2", "900", "normal"),
    face("RM Barlow", "Barlow-BoldItalic.woff2", "700", "italic"),
    face("RM Barlow", "Barlow-ExtraBoldItalic.woff2", "800", "italic"),
    face("RM Barlow", "Barlow-BlackItalic.woff2", "900", "italic"),
])

# ── recursos de marca y productos de ejemplo ──
LG = os.path.join(ROOT, "logo")
assets = {
    "logos": {
        "horizontal": datauri(os.path.join(LG, "rivero-market_horizontal_sobre-naranja.svg"), "image/svg+xml"),
        "vertical": datauri(os.path.join(LG, "rivero-market_vertical_sobre-naranja.svg"), "image/svg+xml"),
        "insignia": datauri(os.path.join(LG, "rivero-market_icono-insignia.svg"), "image/svg+xml"),
        "claro": datauri(os.path.join(LG, "rivero-market_horizontal_sobre-claro.svg"), "image/svg+xml"),
    },
    "productos": {},
    "colecciones": {},
}
PD = os.path.join(ROOT, "assets", "productos")
for fn in sorted(os.listdir(PD)):
    if fn.endswith(".webp"):
        assets["productos"][fn[:-5]] = datauri(os.path.join(PD, fn), "image/webp")
CD = os.path.join(ROOT, "assets", "colecciones")
if os.path.isdir(CD):
    for fn in sorted(os.listdir(CD)):
        if fn.endswith(".webp"):
            assets["colecciones"][fn[:-5]] = datauri(os.path.join(CD, fn), "image/webp")
assets_js = "const ASSETS=" + json.dumps(assets, separators=(",", ":")) + ";"
# ── versión: editor/VERSION + CAMBIOS.txt (se ve arriba a la izquierda del programa) ──
import time
VERSION = read(os.path.join(HERE, "VERSION")).strip()
CAMBIOS = read(os.path.join(ROOT, "CAMBIOS.txt")) if os.path.exists(os.path.join(ROOT, "CAMBIOS.txt")) else ""
version_js = "const APP_VERSION=" + json.dumps({"v": VERSION, "fecha": time.strftime("%d/%m/%Y %H:%M"), "cambios": CAMBIOS}, ensure_ascii=False) + ";"
with open(os.path.join(ROOT, "programa", "VERSION.txt"), "w", encoding="utf-8") as f:
    f.write(VERSION + "\n")
assets_js = version_js + "\n" + assets_js

modules = ["01_util.js", "03_draw.js", "04_flyer.js", "04b_temas.js", "04c_formatos.js", "04d_coleccion.js", "05_images.js", "06_state.js", "08_programa.js"]
if os.path.exists(os.path.join(SRC, "07_app.js")) and "--solo-prueba" not in sys.argv:
    modules.append("07_app.js")
qr = read(os.path.join(HERE, "vendor", "qrcode.min.js"))
code = "\n".join(read(os.path.join(SRC, m)) for m in modules)

# ── banco de pruebas (captura con Firefox headless) ──
harness_boot = r"""
(async () => {
  const q = new URLSearchParams(location.search);
  await cargarRecursos();
  const S = estadoDemo();
  S.formato = q.get('f') || 'a4_8'; S.tema = q.get('t') || 'naranja';
  if (q.get('n') === '0') S.productos.forEach(p => { p.img = null; });
  if (q.get('j')) Object.assign(S, JSON.parse(decodeURIComponent(q.get('j'))));
  if (q.get('o')) { const i = +q.get('o'); S.productos.unshift(...S.productos.splice(i, 1)); }
  if (q.get('p0')) Object.assign(S.productos[0], JSON.parse(decodeURIComponent(q.get('p0'))));
  await prepararImagenes(S);
  const c = document.createElement('canvas'); c.style.display = 'block'; document.body.append(c);
  const sc = +q.get('s') || 1;
  renderFlyer(c, S, { scale: sc, getImg, preview: q.get('p') === '1' });
  c.style.width = c.width / (+q.get('d') || 1) + 'px';
  document.title = 'listo';
})();
"""
test_html = ('<!doctype html><meta charset="utf-8"><title>prueba</title><style>%s body{margin:0;background:#222}</style>'
             '<span style="position:absolute;opacity:0;font:900 10px \'RM Barlow\'">a<i style="font:italic 900 10px \'RM Barlow\'">a</i>'
             '<b style="font:800 10px \'RM Mont\'">a</b><b style="font:italic 800 10px \'RM Barlow\'">a</b><b style="font:700 10px \'RM Barlow\'">a</b><b style="font:600 10px \'RM Mont\'">a</b><b style="font:500 10px \'RM Mont\'">a</b></span>'
             '<script>%s</script><script>%s</script><script>%s</script><script>%s</script>') % (fonts_css, qr, assets_js, code, harness_boot)
with open(os.path.join(HERE, "_prueba.html"), "w", encoding="utf-8") as f:
    f.write(test_html)
print("prueba:", len(test_html) // 1024, "KB")

if "--solo-prueba" in sys.argv or not os.path.exists(os.path.join(SRC, "07_app.js")):
    sys.exit(0)

# ── página final ──
css = read(os.path.join(SRC, "styles.css"))
body = read(os.path.join(SRC, "body.html"))
title = "Ofertas Rivero Market"
inner = ('<title>%s</title>\n<style>\n%s\n%s\n</style>\n%s\n<script>%s</script>\n<script>%s</script>\n<script>\n%s\n</script>\n'
         % (title, fonts_css, css, body, qr, assets_js, code))
with open(os.path.join(HERE, "_publicar.html"), "w", encoding="utf-8") as f:
    f.write(inner)
full = ('<!doctype html>\n<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'
        '<style>:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px);color-scheme:light}body{margin:0}[hidden]{display:none!important}</style></head><body>\n'
        + inner + '\n</body></html>\n')
with open(os.path.join(HERE, "ofertas_rivero_market.html"), "w", encoding="utf-8") as f:
    f.write(full)
# el programa local sirve esta misma página desde programa/web/
web = os.path.join(ROOT, "programa", "web")
os.makedirs(web, exist_ok=True)
with open(os.path.join(web, "index.html"), "w", encoding="utf-8") as f:
    f.write(full)
print("final:", len(full) // 1024, "KB")
