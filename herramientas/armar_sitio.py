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
  descargas/Rivero-Market-Folletos.zip     el programa para usar sin internet (Windows o Linux)
  manifest.webmanifest, icono-*.png        para instalarla como aplicación en la PC o el celular
"""
import argparse
import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
import time
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
    productos = []
    for raiz, dirs, archivos in os.walk(base):
        dirs[:] = sorted(d for d in dirs if not d.startswith((".", "_")))
        for f in sorted(archivos):
            p = Path(raiz) / f
            if f.startswith(".") or p.suffix.lower() not in EXT_FOTO:
                continue
            datos = p.read_bytes()
            sha = huella_git(datos)
            item = {"ruta": p.relative_to(base).as_posix(), "sha": sha, "tam": len(datos)}
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
    armado = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    commit = git("rev-parse", "HEAD") or os.environ.get("GITHUB_SHA", "")
    cfg = {"owner": dueno, "repo": repo, "rama": args.rama, "armado": armado, "commit": commit, "v": version}
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
    (salida / "version.json").write_text(json.dumps({"v": version, "armado": armado, "commit": commit[:12]}, ensure_ascii=False), encoding="utf-8")
    (salida / "robots.txt").write_text("User-agent: *\nDisallow: /\n", encoding="utf-8")
    print(f"herramienta: {len(html) // 1024} KB · versión {version} · {dueno}/{repo}")

    # 2) catálogo de fotos con miniaturas
    productos = armar_catalogo(salida)
    (salida / "catalogo" / "productos.json").write_text(json.dumps({"commit": commit, "armado": armado, "productos": productos}, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"catálogo: {len(productos)} fotos")

    # 3) el programa para usar sin internet
    if not args.sin_zip:
        z = salida / "descargas" / "Rivero-Market-Folletos.zip"
        subprocess.run([sys.executable, str(RAIZ / "editor" / "empaquetar.py"), "--salida", str(z)], cwd=RAIZ, check=True)

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
