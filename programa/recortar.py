#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Quita el fondo de UNA foto de producto (IA, local). Lo llama servidor.py con el Python que tiene 'rembg'.
También lo usa herramientas/procesar_entrada.py (GitHub Actions) para las fotos que se suben a la nube.

    python recortar.py entrada.jpg salida.png
"""
import sys
from PIL import Image, ImageOps


def recortar_imagen(im, sesion=None):
    """Imagen de PIL (cualquier modo) → imagen RGBA sin fondo, recortada al borde del producto."""
    from rembg import new_session, remove
    im = ImageOps.exif_transpose(im).convert("RGB")
    lado = max(im.size)
    if lado > 2000:
        k = 2000 / lado
        im = im.resize((round(im.width * k), round(im.height * k)), Image.LANCZOS)
    out = remove(im, session=sesion or new_session("isnet-general-use"), post_process_mask=True).convert("RGBA")
    caja = out.getchannel("A").point(lambda v: 255 if v > 10 else 0).getbbox()
    if caja:
        m = 4
        out = out.crop((max(0, caja[0] - m), max(0, caja[1] - m), min(out.width, caja[2] + m), min(out.height, caja[3] + m)))
    return out


def main(entrada, salida):
    with Image.open(entrada) as im:
        out = recortar_imagen(im)
    out.save(salida, "PNG", optimize=True)


if __name__ == "__main__":
    if len(sys.argv) != 3:
        sys.exit("uso: recortar.py entrada salida.png")
    main(sys.argv[1], sys.argv[2])
