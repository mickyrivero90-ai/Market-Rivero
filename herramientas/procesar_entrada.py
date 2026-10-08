#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Quita el fondo con IA a las fotos que llegan a productos/_entrada/ (lo corre GitHub Actions).

La herramienta online sube ahí las fotos "crudas" (sacadas con el celular, sobre cualquier fondo).
Cada una queda en productos/<la misma subcarpeta>/<el mismo nombre>.png, recortada y sin fondo,
y se borra de _entrada. Si la IA falla con alguna, se guarda igual con su fondo para no perderla
(salvo que sea un pedido de "(sin fondo)" de una foto que ya estaba: ahí la original sigue en su lugar).

    python herramientas/procesar_entrada.py              (usa la carpeta productos/ del repositorio)
    python herramientas/procesar_entrada.py --raiz DIR   (para pruebas)
"""
import argparse
import re
import shutil
import sys
import time
import traceback
from pathlib import Path

AQUI = Path(__file__).resolve().parent
sys.path.insert(0, str(AQUI.parent / "programa"))
EXT = {".png", ".jpg", ".jpeg", ".webp"}
SIN_FONDO = re.compile(r"\(sin fondo\)\s*$", re.I)


def nombre_libre(carpeta, base, ext):
    p = carpeta / f"{base}{ext}"
    n = 2
    while p.exists():
        p = carpeta / f"{base} ({n}){ext}"
        n += 1
    return p


def main():
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--raiz", default=str(AQUI.parent), help="carpeta del repositorio (la que tiene productos/)")
    args = ap.parse_args()
    productos = Path(args.raiz) / "productos"
    entrada = productos / "_entrada"
    fotos = sorted(p for p in entrada.rglob("*") if p.is_file() and p.suffix.lower() in EXT) if entrada.is_dir() else []
    if not fotos:
        print("No hay fotos para procesar.")
        return 0
    from PIL import Image
    from rembg import new_session
    from recortar import recortar_imagen
    t0 = time.time()
    sesion = new_session("isnet-general-use")
    print(f"Modelo de IA listo en {time.time() - t0:.1f} s. Fotos: {len(fotos)}")
    ok = fallidas = 0
    for p in fotos:
        rel = p.relative_to(entrada)
        destino_dir = productos / rel.parent
        destino_dir.mkdir(parents=True, exist_ok=True)
        t = time.time()
        try:
            with Image.open(p) as im:                                  # ¿es una foto de verdad?
                im.load()
        except Exception:
            fallidas += 1
            print(f"  ✗ {rel}: no es una foto que se pueda abrir; se descarta")
            p.unlink()
            continue
        try:
            with Image.open(p) as im:
                out = recortar_imagen(im, sesion)
            destino = nombre_libre(destino_dir, p.stem, ".png")
            out.save(destino, "PNG", optimize=True)
            ok += 1
            print(f"  ✓ {rel} → {destino.relative_to(productos)} ({time.time() - t:.1f} s)")
        except Exception:
            fallidas += 1
            traceback.print_exc()
            if SIN_FONDO.search(p.stem):
                print(f"  ✗ {rel}: la IA falló; la foto original sigue en su lugar")
            else:
                destino = nombre_libre(destino_dir, p.stem, p.suffix.lower())
                shutil.copy2(p, destino)
                print(f"  ✗ {rel}: la IA falló; se guardó con su fondo en {destino.relative_to(productos)}")
        p.unlink()
    for d in sorted((x for x in entrada.rglob("*") if x.is_dir()), key=lambda x: -len(x.parts)):   # carpetas vacías de _entrada
        try:
            d.rmdir()
        except OSError:
            pass
    try:
        entrada.rmdir()
    except OSError:
        pass
    print(f"Listo: {ok} sin fondo, {fallidas} con problemas, en {time.time() - t0:.0f} s.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
