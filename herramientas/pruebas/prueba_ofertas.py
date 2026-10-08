#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Prueba de la página pública de ofertas (herramientas/armar_sitio.py → ofertas/index.html), sin navegador.

    python3 herramientas/pruebas/prueba_ofertas.py

Arma la página con datos de ejemplo y revisa: precios, «antes» y «por separado», el link «Pedir por WhatsApp»
con el mensaje ya escrito, los textos legales (vigencia, stock, CUIT, alcohol), que no se cuele HTML de un
nombre y que una oferta sin precio no salga.
"""
import importlib.util
import re
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location("armar_sitio", RAIZ / "herramientas" / "armar_sitio.py")
A = importlib.util.module_from_spec(spec)
spec.loader.exec_module(A)

resultados = []


def ok(nombre, cond, extra=""):
    resultados.append(bool(cond))
    print(("OK    " if cond else "FALLA ") + nombre + (f" → {extra}" if extra and not cond else ""))


datos = {
    "v": 1, "titulo": "Ofertas de la semana", "promo": "10% OFF PAGANDO CON QR DE MERCADO PAGO",
    "vigencia": {"desde": "2026-10-08", "hasta": "2026-10-18", "agotar": True, "texto": "del 8 al 18 de octubre de 2026", "hastaTexto": "domingo 18 de octubre"},
    "comercio": {"nombre": "Rivero Market", "direccion": "Barrio San José, Avenida Solís Pizarro 1430", "horario": "Lun a sáb 8 a 21", "whatsapp": "5493875123456",
                 "whatsappTexto": "387 512-3456", "canal": "https://whatsapp.com/channel/0029Vau", "facebook": "Fiambrería Rivero", "mapa": "https://maps.app.goo.gl/x", "razon": "Rivero SRL", "cuit": "30-12345678-9"},
    "legal": {"letraChica": "Precios finales en pesos.", "stock": "20 u. por producto"},
    "alcohol": True,
    "productos": [
        {"nombre": "Fernet Branca 750 ml", "final": "12.150", "regular": "13.500", "pct": 10, "unidad": "", "porUnidad": "$16.200 x litro", "condicion": "PAGANDO CON QR MP", "foto": "Bebidas/Fernet.png", "categoria": "Bebidas"},
        {"nombre": "Queso cremoso <script>alert(1)</script>", "final": "7.830", "regular": "8.700", "pct": 10, "unidad": "x kg", "porUnidad": "$783 los 100 g", "foto": "", "categoria": "Fiambres y quesos"},
        {"nombre": "Combo Picada", "final": "9.990", "regular": "12.400", "combo": True, "categoria": "Combos"},
        {"nombre": "Sin precio", "final": "", "categoria": "Bebidas"},
    ],
}
pagina = A.pagina_ofertas(datos, {"Bebidas/Fernet.png": "fotos/abc.png"}, "https://ejemplo.github.io/tienda/")

ok("título y nombre del local", "<title>Ofertas de la semana · Rivero Market</title>" in pagina)
ok("precios con el formato de acá", "$12.150" in pagina and "$7.830" in pagina and "<s>$13.500</s>" in pagina)
ok("combo: «Por separado» en vez de «Antes»", "Por separado <s>$12.400</s>" in pagina)
ok("ahorro calculado", "Ahorrás $1.350" in pagina)
ok("precio por kilo o litro y por 100 g", "$16.200 x litro" in pagina and "$783 los 100 g" in pagina)
ok("el nombre no puede meter HTML", "<script>alert(1)" not in pagina and "&lt;script&gt;" in pagina)
ok("una oferta sin precio no sale", "Sin precio" not in pagina)
m = re.search(r'href="https://wa\.me/5493875123456\?text=([^"]+)"', pagina)
ok("«Pedir por WhatsApp» con el mensaje ya escrito", m and "Fernet%20Branca%20750%20ml" in m.group(1) and "%2412.150" in m.group(1), m.group(1) if m else "sin link")
ok("foto desde la copia de la página", 'src="../fotos/abc.png"' in pagina)
ok("rubros con filtro", 'data-rubro="Bebidas"' in pagina and 'data-rubro="Fiambres y quesos"' in pagina and 'class="chip"' in pagina)
ok("legales: vigencia, stock y CUIT", "Ofertas válidas del 8 al 18 de octubre de 2026 o hasta agotar stock (20 u. por producto)." in pagina and "CUIT 30-12345678-9" in pagina)
ok("leyenda de alcohol (hay fernet)", "Beber con moderación. Prohibida su venta a menores de 18 años." in pagina)
ok("vista previa al compartir el link", 'property="og:image" content="https://ejemplo.github.io/tienda/fotos/abc.png"' in pagina)
ok("aviso de ofertas vencidas", 'const hasta = "2026-10-18"' in pagina and "Estas ofertas terminaron el domingo 18 de octubre" in pagina)
sin_alcohol = A.pagina_ofertas({**datos, "alcohol": False}, {}, "")
ok("sin la leyenda de alcohol si en el folleto está apagada", "Beber con moderación" not in sin_alcohol)
vacia = A.pagina_ofertas({**datos, "productos": []}, {}, "")
ok("sin ofertas: lo dice", "Todavía no hay ofertas publicadas." in vacia)

print(f"\n{sum(resultados)} de {len(resultados)} comprobaciones OK")
sys.exit(0 if all(resultados) else 1)
