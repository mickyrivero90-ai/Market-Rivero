#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Arma el ZIP del programa de folletos para llevarlo a otra computadora (Windows o Linux).

    python3 empaquetar.py        ->  _entregas/Rivero-Market-Folletos-AAAA-MM-DD.zip
"""
import os
import re
import sys
import time
import zipfile
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
SALIDA = RAIZ / "_entregas"
NOMBRE = "Rivero-Market-Folletos"                      # carpeta que aparece al descomprimir
FECHA = time.strftime("%Y-%m-%d")


def archivos():
    """(origen, ruta dentro del zip, permisos)"""
    out = []
    for n, modo in (("iniciar.bat", 0o644), ("iniciar.sh", 0o755), ("instalar-acceso-directo-linux.sh", 0o755), ("LEEME.txt", 0o644), ("LEEME.md", 0o644), ("CONTEXTO_DEL_PROYECTO.txt", 0o644), ("CAMBIOS.txt", 0o644)):
        out.append((RAIZ / n, n, modo))
    out.append((RAIZ / "editor" / "ofertas_rivero_market.html", "Folletos sin programa (solo navegador).html", 0o644))
    for n, modo in (("servidor.py", 0o755), ("recortar.py", 0o644), ("icono.png", 0o644), ("VERSION.txt", 0o644)):
        out.append((RAIZ / "programa" / n, f"programa/{n}", modo))
    out.append((RAIZ / "programa" / "web" / "index.html", "programa/web/index.html", 0o644))
    for p in sorted((RAIZ / "productos").rglob("*")):
        if p.is_file() and not any(part.startswith(".") for part in p.relative_to(RAIZ).parts):
            out.append((p, p.relative_to(RAIZ).as_posix(), 0o644))
    for p in sorted((RAIZ / "logo").iterdir()):
        if p.is_file() and p.suffix.lower() in (".svg", ".png") and p.name != "original_referencia.png":
            out.append((p, f"logo/{p.name}", 0o644))
    return out


def main():
    SALIDA.mkdir(exist_ok=True)
    for viejo in SALIDA.glob(f"{NOMBRE}*.zip"):                    # una sola entrega vigente: la de la fecha más nueva
        viejo.unlink()
    VER = (RAIZ / "editor" / "VERSION").read_text(encoding="utf-8").strip()
    destino = SALIDA / f"{NOMBRE}-v{VER}-{FECHA}.zip"
    faltan = [str(o) for o, _, _ in archivos() if not o.exists()]
    if faltan:
        sys.exit("Faltan archivos: " + ", ".join(faltan))
    with zipfile.ZipFile(destino, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as z:
        for origen, arc, modo in archivos():
            info = zipfile.ZipInfo.from_file(origen, f"{NOMBRE}/{arc}")
            info.external_attr = (0o100000 | modo) << 16
            info.compress_type = zipfile.ZIP_DEFLATED
            with open(origen, "rb") as f:
                datos = f.read()
            if arc.endswith((".bat", ".txt")):                                         # Windows: saltos de línea CRLF (y BOM en el texto para el Bloc de notas)
                datos = re.sub(rb"\r?\n", b"\r\n", datos)
                if arc.endswith(".txt") and not datos.startswith(b"\xef\xbb\xbf"):
                    datos = b"\xef\xbb\xbf" + datos
            z.writestr(info, datos, compresslevel=9)
    mb = destino.stat().st_size / 1024 / 1024
    print(f"{destino}  ({mb:.1f} MB, {len(archivos())} archivos)")


if __name__ == "__main__":
    main()
