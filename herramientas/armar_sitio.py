#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Arma la herramienta online (GitHub Pages) en una carpeta.

    python3 herramientas/armar_sitio.py --salida _site                      (lo corre GitHub Actions)
    python3 herramientas/armar_sitio.py --salida /tmp/x --pruebas --repo prueba/tienda   (pruebas en la PC)

Sale:
  index.html                      la herramienta, con los datos del repositorio (dueño, nombre, rama)
  version.json                    versión y momento del armado: la herramienta avisa cuando hay una nueva
  catalogo/productos.json         lista de fotos de productos (con su huella de git)
  catalogo/mini/<huella>.webp     miniaturas para el buscador (cargan rápido)
  fotos/<huella>.<ext>            copia de cada foto de productos: la herramienta las baja de acá (mismo sitio, sin el
                                  límite de raw.githubusercontent.com) y el programa de la PC las trae con un botón
  descargas/Rivero-Market-Folletos.zip     el programa para usar sin internet (Windows o Linux), sin las fotos
  manifest.webmanifest, icono-*.png        para instalarla como aplicación en la PC o el celular
  ofertas/index.html              la página pública de ofertas (si se publicó alguna desde la herramienta:
                                  datos/publico/ofertas.json), con las fotos de fotos/ y «Pedir por WhatsApp»
"""
import argparse
import hashlib
import html
import json
import os
import re
import shutil
import subprocess
import sys
import time
import urllib.parse
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
EXT_FOTO = {".png", ".jpg", ".jpeg", ".webp", ".avif", ".gif", ".bmp"}


def huella_git(datos):
    """La misma huella (SHA-1 de blob) que usa GitHub: así la herramienta sabe si la miniatura está al día."""
    return hashlib.sha1(b"blob %d\0" % len(datos) + datos).hexdigest()


def git(*args):
    try:
        return subprocess.run(["git", *args], cwd=RAIZ, capture_output=True, text=True, timeout=20).stdout.strip()
    except Exception:
        return ""


def repo_por_defecto():
    if os.environ.get("GITHUB_REPOSITORY"):
        return os.environ["GITHUB_REPOSITORY"]
    m = re.search(r"github\.com[:/]+([^/]+)/([^/]+?)(?:\.git)?$", git("remote", "get-url", "origin"))
    return f"{m.group(1)}/{m.group(2)}" if m else ""


def armar_catalogo(salida):
    """catalogo/productos.json y las miniaturas. Sin Pillow, la lista sale igual (sin miniaturas)."""
    try:
        from PIL import Image, ImageOps
    except ImportError:
        Image = None
        print("  (sin Pillow: el catálogo sale sin miniaturas)")
    base = RAIZ / "productos"
    mini_dir = salida / "catalogo" / "mini"
    mini_dir.mkdir(parents=True, exist_ok=True)
    fotos_dir = salida / "fotos"
    fotos_dir.mkdir(parents=True, exist_ok=True)
    productos = []
    for raiz, dirs, archivos in os.walk(base):
        dirs[:] = sorted(d for d in dirs if not d.startswith((".", "_")))
        for f in sorted(archivos):
            p = Path(raiz) / f
            if f.startswith(".") or p.suffix.lower() not in EXT_FOTO:
                continue
            datos = p.read_bytes()
            sha = huella_git(datos)
            item = {"ruta": p.relative_to(base).as_posix(), "sha": sha, "tam": len(datos), "foto": f"fotos/{sha}{p.suffix.lower()}"}
            (fotos_dir / f"{sha}{p.suffix.lower()}").write_bytes(datos)
            if Image is not None:
                try:
                    with Image.open(p) as im:
                        item["w"], item["h"] = im.size
                        im = ImageOps.exif_transpose(im)
                        im.thumbnail((360, 360), Image.LANCZOS)
                        alfa = "A" in im.getbands() or im.info.get("transparency") is not None
                        im.convert("RGBA" if alfa else "RGB").save(mini_dir / f"{sha}.webp", "WEBP", quality=80, method=5)
                    item["mini"] = f"mini/{sha}.webp"
                except Exception as e:
                    print(f"  miniatura fallida {item['ruta']}: {e}")
            productos.append(item)
    return productos


# ───────────────────────── página pública de ofertas (/ofertas/) ─────────────────────────
RE_ALCOHOL = re.compile(r"\b(vino|vinos|fernet|cerveza|cervezas|vodka|whisky|whiskey|gin|ron|licor|aperitivo|espumante|champagne|champa[ñn]a|sidra|tequila|amargo|malbec|cabernet|aperol|campari|gancia)\b", re.I)


def _e(s):
    return html.escape(str(s if s is not None else ""), quote=True)


def _pesos(n):
    """18540 → $18.540 · 1250.5 → $1.250,50"""
    c = round(float(n) * 100)
    ent, dec = divmod(c, 100)
    return "$" + f"{ent:,}".replace(",", ".") + (f",{dec:02d}" if dec else "")


def _num(txt):
    """«18.540» / «1.250,50» → 18540.0 / 1250.5 (como parsePrecio de la herramienta)."""
    s = re.sub(r"[^\d.,]", "", str(txt or ""))
    if not re.search(r"\d", s):
        return None
    if "," in s:
        ent, dec = s.rsplit(",", 1)
        ent = re.sub(r"[.,]", "", ent)
    elif "." in s:
        ent, dec = s.rsplit(".", 1)
        if len(dec) == 3 or s.count(".") > 1:
            ent, dec = s.replace(".", ""), ""
    else:
        ent, dec = s, ""
    dec = re.sub(r"\D", "", dec)[:2]
    return float((ent or "0") + ("." + dec if dec else ""))


def pagina_ofertas(d, fotos, base_url):
    """HTML de la página pública: las ofertas del último folleto publicado, por rubro, con «Pedir por WhatsApp»."""
    C = d.get("comercio") or {}
    V = d.get("vigencia") or {}
    nombre = str(C.get("nombre") or "Rivero Market").strip()
    titulo = str(d.get("titulo") or "Ofertas de la semana").strip()
    vig = str(V.get("texto") or "").strip()
    wa = re.sub(r"\D", "", str(C.get("whatsapp") or ""))
    prods = [p for p in (d.get("productos") or []) if str(p.get("nombre") or "").strip() and _num(p.get("final"))]
    grupos = {}
    for p in prods:
        grupos.setdefault(str(p.get("categoria") or "Ofertas").strip() or "Ofertas", []).append(p)
    hay_alcohol = bool(d.get("alcohol")) and any(RE_ALCOHOL.search(f"{p.get('nombre', '')} {p.get('desc', '')}") for p in prods)
    primera = next((fotos.get(p.get("foto")) for p in prods if fotos.get(p.get("foto"))), None)
    og_img = base_url + (primera or "icono-512.png") if base_url else ""

    def tarjeta(p):
        F, R = _num(p.get("final")), _num(p.get("regular"))
        foto = fotos.get(p.get("foto"))
        img = (f'<img src="../{_e(foto)}" alt="{_e(p.get("nombre"))}" loading="lazy" decoding="async">' if foto
               else '<img src="../icono-512.png" alt="" class="sin-foto" loading="lazy">')
        antes = ""
        if R and F and R > F:
            etq = "Por separado" if p.get("combo") else "Antes"
            antes = f'<p class="antes">{etq} <s>{_e(_pesos(R))}</s> <span class="ahorro">Ahorrás {_e(_pesos(R - F))}</span></p>'
        unidad = f' <span class="unidad">{_e(str(p.get("unidad")).upper())}</span>' if p.get("unidad") else ""
        extra = " · ".join(x for x in (str(p.get("porUnidad") or "").strip(), str(p.get("nota") or "").strip()) if x)
        cond = f'<p class="cond">{_e(p.get("condicion"))}</p>' if p.get("condicion") else ""
        insig = f'<span class="insignia">{_e(p.get("etiqueta"))}</span>' if p.get("etiqueta") else (f'<span class="insignia pct">-{int(p.get("pct"))}%</span>' if p.get("pct") else "")
        pedir = ""
        if wa:
            msg = f"¡Hola {nombre}! Quiero pedir: {p.get('nombre')} a {_pesos(F)}"
            pedir = f'<a class="pedir" href="https://wa.me/{wa}?text={urllib.parse.quote(msg)}" target="_blank" rel="noopener">Pedir por WhatsApp</a>'
        desc = f'<p class="desc">{_e(p.get("desc"))}</p>' if p.get("desc") else ""
        busca = _e(" ".join(str(p.get(k) or "") for k in ("nombre", "desc", "categoria")).lower())
        return (f'<article class="oferta" data-busca="{busca}">{insig}<div class="foto">{img}</div>'
                f'<div class="datos"><h3>{_e(p.get("nombre"))}</h3>{desc}{antes}'
                f'<p class="precio"><span class="placa">{_e(_pesos(F))}</span>{unidad}</p>'
                + (f'<p class="extra">{_e(extra)}</p>' if extra else "") + f'{cond}{pedir}</div></article>')

    secciones = []
    for g, ps in grupos.items():
        gid = re.sub(r"[^a-z0-9]+", "-", g.lower()).strip("-") or "ofertas"
        secciones.append(f'<section class="rubro" id="r-{gid}" data-rubro="{_e(g)}"><h2>{_e(g)}</h2><div class="grilla">{"".join(tarjeta(p) for p in ps)}</div></section>')
    chips = "".join(f'<button type="button" class="chip" data-rubro="{_e(g)}">{_e(g)}</button>' for g in grupos) if len(grupos) > 1 else ""
    promo = str(d.get("promo") or "").strip()
    stock = str((d.get("legal") or {}).get("stock") or "").strip()
    chica = str((d.get("legal") or {}).get("letraChica") or "").strip()
    legales = " ".join(x for x in (
        (f"Ofertas válidas {vig}" if vig else "Ofertas") + (" o hasta agotar stock" + (f" ({stock})" if stock else "") if V.get("agotar") else "") + ".",
        chica,
        "Precios finales en pesos argentinos.",
        " · ".join(x for x in (str(C.get("razon") or "").strip(), ("CUIT " + str(C.get("cuit")).strip()) if C.get("cuit") else "", str(C.get("direccion") or "").strip()) if x) + ".",
        "Imágenes ilustrativas.",
        "Beber con moderación. Prohibida su venta a menores de 18 años." if hay_alcohol else "",
    ) if x and x != ".")
    contacto = []
    if C.get("direccion"):
        contacto.append(f'<li><b>Dirección</b> {_e(C.get("direccion"))}' + (f' · <a href="{_e(C.get("mapa"))}" target="_blank" rel="noopener">Cómo llegar</a>' if C.get("mapa") else "") + "</li>")
    if C.get("horario"):
        contacto.append(f'<li><b>Horario</b> {_e(C.get("horario"))}</li>')
    if wa:
        contacto.append(f'<li><b>WhatsApp</b> <a href="https://wa.me/{wa}" target="_blank" rel="noopener">{_e(C.get("whatsappTexto") or wa)}</a></li>')
    if C.get("canal"):
        contacto.append(f'<li><b>Canal de WhatsApp</b> <a href="{_e(C.get("canal"))}" target="_blank" rel="noopener">Sumate para recibir las ofertas</a></li>')
    if C.get("facebook"):
        fb = C.get("facebookUrl") or ""
        contacto.append(f'<li><b>Facebook</b> ' + (f'<a href="{_e(fb)}" target="_blank" rel="noopener">{_e(C.get("facebook"))}</a>' if fb else _e(C.get("facebook"))) + "</li>")
    if C.get("instagram"):
        ig = str(C.get("instagram")).strip().lstrip("@")
        contacto.append(f'<li><b>Instagram</b> <a href="https://www.instagram.com/{_e(ig)}/" target="_blank" rel="noopener">@{_e(ig)}</a></li>')
    desc_meta = f"{len(prods)} ofertas {vig} en {nombre}" + (f", {C.get('direccion')}" if C.get("direccion") else "") + "."
    hasta = str(V.get("hasta") or "")
    return f"""<!doctype html>
<html lang="es-AR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{_e(titulo)} · {_e(nombre)}</title>
<meta name="description" content="{_e(desc_meta)}">
<meta property="og:type" content="website">
<meta property="og:title" content="{_e(titulo)} · {_e(nombre)}">
<meta property="og:description" content="{_e(desc_meta)}">
{f'<meta property="og:image" content="{_e(og_img)}">' if og_img else ''}
<meta name="theme-color" content="#E64F12">
<link rel="icon" href="../icono-192.png">
<style>
@font-face {{ font-family: "RM Barlow"; src: url(fuentes/Barlow-Black.woff2) format("woff2"); font-weight: 900; font-style: normal; font-display: swap; }}
@font-face {{ font-family: "RM Barlow"; src: url(fuentes/Barlow-BlackItalic.woff2) format("woff2"); font-weight: 900; font-style: italic; font-display: swap; }}
@font-face {{ font-family: "RM Barlow"; src: url(fuentes/Barlow-Bold.woff2) format("woff2"); font-weight: 700; font-style: normal; font-display: swap; }}
@font-face {{ font-family: "RM Mont"; src: url(fuentes/Mont-VF.woff2) format("woff2"); font-weight: 500 900; font-display: swap; }}
:root {{ --naranja: #E64F12; --rojo: #D50F25; --rojo2: #A80A1C; --amarillo: #FFC400; --tinta: #2A160C; --suave: #7A5A48; --fondo: #FFF6EE; --papel: #FFFFFF; --linea: #F0DDD0; --verde: #12803A;
  --f-disp: "RM Barlow", "Arial Narrow", "Roboto Condensed", sans-serif; --f-txt: "RM Mont", "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }}
* {{ box-sizing: border-box; }}
body {{ margin: 0; background: var(--fondo); color: var(--tinta); font: 500 16px/1.45 var(--f-txt); }}
a {{ color: inherit; }}
.cab {{ background: linear-gradient(160deg, #FF7A1A, var(--naranja) 55%, #C93B07); color: #fff; padding: 18px 16px 22px; }}
.cab .in, main, .pie .in {{ max-width: 1100px; margin: 0 auto; }}
.cab img.logo {{ height: 54px; width: auto; display: block; }}
.cab h1 {{ font: 900 italic clamp(34px, 7vw, 56px)/1 var(--f-disp); text-transform: uppercase; margin: 14px 0 6px; letter-spacing: .01em; }}
.cab .vig {{ display: inline-block; background: rgba(0,0,0,.28); padding: 6px 12px; border-radius: 99px; font-weight: 700; font-size: 15px; }}
.cab .promo {{ margin: 12px 0 0; display: inline-block; background: var(--amarillo); color: #3A2400; padding: 7px 14px; border-radius: 10px; font: 900 italic 20px/1.1 var(--f-disp); text-transform: uppercase; }}
.vencida-aviso {{ display: none; background: #2A160C; color: #FFE066; padding: 12px 16px; text-align: center; font-weight: 700; }}
body.vencida .vencida-aviso {{ display: block; }}
body.vencida .grilla {{ opacity: .55; }}
body.vencida .pedir {{ display: none; }}
main {{ padding: 16px 16px 40px; display: grid; gap: 22px; }}
.herr {{ display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }}
.herr input {{ flex: 1 1 220px; min-width: 0; font: inherit; padding: 11px 14px; border-radius: 12px; border: 2px solid var(--linea); background: #fff; }}
.chip {{ font: 700 14px var(--f-txt); padding: 8px 12px; border-radius: 99px; border: 2px solid var(--linea); background: #fff; cursor: pointer; }}
.chip[aria-pressed="true"] {{ background: var(--tinta); color: #fff; border-color: var(--tinta); }}
.rubro h2 {{ font: 900 italic 30px/1 var(--f-disp); text-transform: uppercase; margin: 0 0 10px; color: var(--naranja); }}
.grilla {{ display: grid; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); gap: 14px; }}
.oferta {{ position: relative; background: var(--papel); border-radius: 16px; box-shadow: 0 6px 18px rgba(80, 30, 0, .12); display: grid; grid-template-rows: auto 1fr; overflow: hidden; }}
.oferta .foto {{ aspect-ratio: 1 / 1; display: grid; place-items: center; background: radial-gradient(circle at 50% 55%, #FFF3D6, #fff 70%); padding: 12px; }}
.oferta .foto img {{ max-width: 100%; max-height: 100%; object-fit: contain; }}
.oferta .foto img.sin-foto {{ opacity: .25; width: 45%; }}
.datos {{ padding: 4px 14px 14px; display: grid; gap: 6px; align-content: start; }}
.datos h3 {{ font: 900 italic 22px/1.05 var(--f-disp); text-transform: uppercase; margin: 0; }}
.desc {{ margin: 0; color: var(--suave); font-size: 14px; }}
.antes {{ margin: 0; font-weight: 700; color: var(--suave); font-size: 14px; display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }}
.antes s {{ text-decoration-color: var(--rojo); text-decoration-thickness: 2px; color: var(--tinta); }}
.ahorro {{ background: #2B2B2B; color: #FFE066; padding: 3px 8px; border-radius: 99px; font: 900 italic 13px var(--f-disp); letter-spacing: .03em; }}
.precio {{ margin: 2px 0 0; display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }}
.placa {{ display: inline-block; background: linear-gradient(var(--rojo), var(--rojo2)); color: #fff; font: 900 italic 38px/1 var(--f-disp); padding: 6px 14px 4px 12px; border-radius: 10px; transform: skewX(-8deg); box-shadow: 0 4px 10px rgba(120, 0, 20, .3); }}
.unidad {{ font: 900 15px var(--f-disp); background: var(--amarillo); color: #3A2400; padding: 4px 9px; border-radius: 99px; }}
.extra {{ margin: 0; font-size: 13.5px; font-weight: 700; }}
.cond {{ margin: 0; display: inline-block; justify-self: start; background: #1D8BE0; color: #fff; padding: 4px 10px; border-radius: 99px; font: 900 italic 14px var(--f-disp); text-transform: uppercase; }}
.insignia {{ position: absolute; top: 10px; left: 10px; z-index: 1; background: var(--rojo); color: #fff; font: 900 italic 18px/1 var(--f-disp); padding: 7px 10px; border-radius: 10px; transform: rotate(-6deg); text-transform: uppercase; }}
.insignia.pct {{ background: var(--amarillo); color: var(--rojo2); }}
.pedir {{ margin-top: 4px; display: block; text-align: center; text-decoration: none; background: var(--verde); color: #fff; font-weight: 800; padding: 11px 12px; border-radius: 12px; }}
.pedir:focus-visible, .chip:focus-visible, .herr input:focus-visible {{ outline: 3px solid var(--naranja); outline-offset: 2px; }}
.pie {{ background: #2A160C; color: #F7EDE6; padding: 22px 16px 30px; }}
.pie ul {{ list-style: none; margin: 0 0 14px; padding: 0; display: grid; gap: 6px; }}
.pie b {{ color: var(--amarillo); margin-right: 6px; }}
.pie .legal {{ font-size: 13px; color: #CDBBAE; margin: 0; max-width: 90ch; }}
[hidden] {{ display: none !important; }}
.vacio {{ padding: 30px; text-align: center; color: var(--suave); }}
@media (max-width: 560px) {{ .grilla {{ grid-template-columns: 1fr 1fr; gap: 10px; }} .oferta .foto {{ padding: 8px; }} .datos {{ padding: 2px 10px 10px; gap: 5px; }}
  .datos h3 {{ font-size: 17px; }} .placa {{ font-size: 27px; padding: 5px 10px 3px 9px; }} .antes {{ font-size: 12.5px; }} .pedir {{ padding: 9px 8px; font-size: 14px; }}
  .cond {{ font-size: 12px; }} .insignia {{ font-size: 15px; padding: 5px 8px; }} .rubro h2 {{ font-size: 26px; }} }}
@media (prefers-reduced-motion: reduce) {{ * {{ transition: none !important; }} }}
</style>
</head>
<body>
<header class="cab"><div class="in">
<img class="logo" src="logo.png" alt="{_e(nombre)}">
<h1>{_e(titulo)}</h1>
{f'<span class="vig">Válidas {_e(vig)}</span>' if vig else ''}
{f'<p class="promo">{_e(promo)}</p>' if promo else ''}
</div></header>
<div class="vencida-aviso" role="status">Estas ofertas terminaron{(' el ' + _e(V.get('hastaTexto'))) if V.get('hastaTexto') else ''}. Pronto publicamos las nuevas: sumate al canal para enterarte primero.</div>
<main>
{f'<div class="herr"><input type="search" id="busca" placeholder="Buscar un producto" aria-label="Buscar un producto">{chips}</div>' if prods else ''}
{''.join(secciones) if prods else '<p class="vacio">Todavía no hay ofertas publicadas.</p>'}
</main>
<footer class="pie"><div class="in">
<ul>{''.join(contacto)}</ul>
<p class="legal">{_e(legales)}</p>
</div></footer>
<script>
(() => {{
  const hasta = {json.dumps(hasta)};
  if (hasta && Date.now() > new Date(hasta + 'T23:59:59').getTime()) document.body.classList.add('vencida');
  const busca = document.getElementById('busca'), chips = [...document.querySelectorAll('.chip')];
  let rubro = '';
  const filtrar = () => {{
    const q = (busca ? busca.value : '').trim().toLowerCase();
    document.querySelectorAll('.rubro').forEach(sec => {{
      let n = 0;
      sec.querySelectorAll('.oferta').forEach(o => {{ const ok = (!rubro || sec.dataset.rubro === rubro) && (!q || o.dataset.busca.includes(q)); o.hidden = !ok; if (ok) n++; }});
      sec.hidden = !n;
    }});
  }};
  chips.forEach(c => c.addEventListener('click', () => {{ rubro = rubro === c.dataset.rubro ? '' : c.dataset.rubro; chips.forEach(x => x.setAttribute('aria-pressed', String(x.dataset.rubro === rubro))); filtrar(); }}));
  if (busca) busca.addEventListener('input', filtrar);
}})();
</script>
</body>
</html>
"""


def armar_ofertas(salida, fotos, base_url):
    """ofertas/index.html con lo que se publicó desde la herramienta (datos/publico/ofertas.json). Sin ese archivo, no hay página."""
    origen = RAIZ / "datos" / "publico" / "ofertas.json"
    if not origen.is_file():
        return 0
    try:
        d = json.loads(origen.read_text(encoding="utf-8"))
    except Exception as e:
        print(f"  ofertas.json no se pudo leer: {e}")
        return 0
    dest = salida / "ofertas"
    (dest / "fuentes").mkdir(parents=True, exist_ok=True)
    for f in ("Barlow-Black.woff2", "Barlow-BlackItalic.woff2", "Barlow-Bold.woff2", "Mont-VF.woff2"):
        shutil.copy(RAIZ / "editor" / "fonts_sub" / f, dest / "fuentes" / f)
    logo = RAIZ / "logo" / "rivero-market_horizontal_sobre-naranja.png"
    if logo.is_file():
        shutil.copy(logo, dest / "logo.png")
    (dest / "index.html").write_text(pagina_ofertas(d, fotos, base_url), encoding="utf-8")
    shutil.copy(origen, dest / "ofertas.json")
    return len(d.get("productos") or [])


def armar_iconos(salida):
    origen = RAIZ / "logo" / "rivero-market_icono-perfil.png"
    try:
        from PIL import Image
    except ImportError:
        return False
    with Image.open(origen) as im:
        im = im.convert("RGBA")
        for lado in (192, 512):
            im.resize((lado, lado), Image.LANCZOS).save(salida / f"icono-{lado}.png", optimize=True)
        fondo = Image.new("RGBA", im.size, (229, 80, 26, 255))         # para íconos "maskable" (Android recorta las esquinas)
        fondo.alpha_composite(im)
        fondo.resize((512, 512), Image.LANCZOS).save(salida / "icono-maskable-512.png", optimize=True)
    return True


def main():
    ap = argparse.ArgumentParser(description="Arma la herramienta online (GitHub Pages)")
    ap.add_argument("--salida", required=True, help="carpeta donde queda el sitio (se vacía)")
    ap.add_argument("--repo", default=repo_por_defecto(), help="dueño/repositorio de GitHub (por defecto, el de origin)")
    ap.add_argument("--rama", default="main")
    ap.add_argument("--pruebas", action="store_true", help="deja conectar con un GitHub de mentira en 127.0.0.1")
    ap.add_argument("--sin-zip", action="store_true", help="no arma el programa para descargar (más rápido)")
    args = ap.parse_args()
    if "/" not in args.repo:
        sys.exit("Falta --repo dueño/repositorio")
    dueno, repo = args.repo.split("/", 1)
    salida = Path(args.salida).resolve()
    prohibidas = {RAIZ, *RAIZ.parents} | {RAIZ / d for d in ("editor", "programa", "productos", "datos", "logo", "assets", "herramientas", ".github", "docs", "blender")}
    if salida in prohibidas:
        sys.exit("Esa carpeta de salida no se puede usar: elegí una carpeta nueva (por ejemplo _site)")
    shutil.rmtree(salida, ignore_errors=True)
    salida.mkdir(parents=True)
    t0 = time.time()

    # 1) la herramienta (la misma página que el programa local)
    subprocess.run([sys.executable, str(RAIZ / "editor" / "build.py")], cwd=RAIZ / "editor", check=True)
    html = (RAIZ / "editor" / "ofertas_rivero_market.html").read_text(encoding="utf-8")
    version = (RAIZ / "editor" / "VERSION").read_text(encoding="utf-8").strip()
    codigo = hashlib.sha256(html.encode("utf-8")).hexdigest()[:16]    # cambia solo si cambia la herramienta (no con fotos nuevas)
    armado = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    commit = git("rev-parse", "HEAD") or os.environ.get("GITHUB_SHA", "")
    cfg = {"owner": dueno, "repo": repo, "rama": args.rama, "armado": armado, "commit": commit, "v": version, "codigo": codigo}
    conectar = ["'self'", "https://api.github.com", "https://raw.githubusercontent.com"]
    imagenes = ["'self'", "data:", "blob:", "https://raw.githubusercontent.com"]
    if args.pruebas:
        conectar += ["http://127.0.0.1:*", "http://localhost:*"]
        imagenes += ["http://127.0.0.1:*", "http://localhost:*"]
    csp = ("default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src " + " ".join(imagenes)
           + "; font-src 'self' data:; connect-src " + " ".join(conectar) + "; object-src 'none'; base-uri 'self'; form-action 'none'; worker-src 'none'")
    cabeza = (f'<meta http-equiv="Content-Security-Policy" content="{csp}">'
              '<meta name="robots" content="noindex">'
              '<meta name="description" content="Folletos de ofertas de Rivero Market para imprimir, Facebook, Instagram y WhatsApp.">'
              '<meta name="theme-color" content="#E64F12">'
              '<link rel="manifest" href="manifest.webmanifest"><link rel="icon" href="icono-192.png"><link rel="apple-touch-icon" href="icono-192.png">'
              f'<script>window.RM_NUBE={json.dumps(cfg, ensure_ascii=False)};</script>')
    if "<style>" not in html:
        sys.exit("No encontré dónde poner los datos de la nube en la página")
    html = html.replace("<style>", cabeza + "<style>", 1)
    (salida / "index.html").write_text(html, encoding="utf-8")
    (salida / "version.json").write_text(json.dumps({"v": version, "armado": armado, "commit": commit[:12], "codigo": codigo}, ensure_ascii=False), encoding="utf-8")
    (salida / "robots.txt").write_text("User-agent: *\nAllow: /ofertas/\nDisallow: /\n", encoding="utf-8")   # la herramienta no se indexa; la página de ofertas sí
    print(f"herramienta: {len(html) // 1024} KB · versión {version} · {dueno}/{repo}")

    # 2) catálogo de fotos con miniaturas
    productos = armar_catalogo(salida)
    (salida / "catalogo" / "productos.json").write_text(json.dumps({"commit": commit, "armado": armado, "productos": productos}, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"catálogo: {len(productos)} fotos")
    base_url = "http://127.0.0.1:8793/" if args.pruebas else f"https://{dueno.lower()}.github.io/{repo}/"
    n_of = armar_ofertas(salida, {p["ruta"]: p["foto"] for p in productos}, base_url)
    print(f"página de ofertas: {n_of} productos" if n_of else "página de ofertas: todavía no se publicó ninguna")

    # 3) el programa para usar sin internet
    if not args.sin_zip:
        z = salida / "descargas" / "Rivero-Market-Folletos.zip"
        sitio = "http://127.0.0.1:8793/" if args.pruebas else f"https://{dueno.lower()}.github.io/{repo}/"
        subprocess.run([sys.executable, str(RAIZ / "editor" / "empaquetar.py"), "--salida", str(z), "--sin-fotos", "--sitio", sitio], cwd=RAIZ, check=True)

    # 4) para instalarla como aplicación
    if armar_iconos(salida):
        manifiesto = {"name": "Folletos Rivero Market", "short_name": "Folletos", "description": "Folletos de ofertas para imprimir, Facebook, Instagram y WhatsApp.",
                      "lang": "es-AR", "start_url": "./", "scope": "./", "display": "standalone", "background_color": "#17100C", "theme_color": "#E64F12",
                      "icons": [{"src": "icono-192.png", "sizes": "192x192", "type": "image/png"}, {"src": "icono-512.png", "sizes": "512x512", "type": "image/png"},
                                {"src": "icono-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable"}]}
        (salida / "manifest.webmanifest").write_text(json.dumps(manifiesto, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"listo en {time.time() - t0:.1f} s → {salida}")


if __name__ == "__main__":
    main()
