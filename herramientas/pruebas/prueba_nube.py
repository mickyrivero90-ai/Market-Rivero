#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Prueba de punta a punta de la herramienta ONLINE, con un GitHub de mentira (no toca la cuenta real).

Arma el sitio (herramientas/armar_sitio.py --pruebas), levanta el sitio en 127.0.0.1:8793 y el GitHub
de mentira en 127.0.0.1:8794, y usa la herramienta en Firefox como una persona: conectar la llave,
elegir y subir fotos, quitar el fondo «en la nube», finalizar (descarga .zip), «Mis folletos», memoria
de precios, folleto en curso entre dos PC, traer lo de otra PC, marketing y aviso de versión nueva.

Necesita Python con selenium y Pillow, Firefox y geckodriver:
    RIVERO_GECKODRIVER=/ruta/geckodriver  python herramientas/pruebas/prueba_nube.py
(en la PC de casa: _trabajo/venv/bin/python herramientas/pruebas/prueba_nube.py)
"""
import functools
import io
import json
import os
import shutil
import subprocess
import sys
import threading
import time
import urllib.parse
import urllib.request
import zipfile
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(Path(__file__).resolve().parent))
import github_falso  # noqa: E402

from PIL import Image  # noqa: E402
from selenium import webdriver  # noqa: E402
from selenium.webdriver.common.by import By  # noqa: E402
from selenium.webdriver.firefox.options import Options  # noqa: E402
from selenium.webdriver.firefox.service import Service  # noqa: E402
from selenium.webdriver.support.ui import WebDriverWait  # noqa: E402

TMP = Path(os.environ.get("RIVERO_PRUEBAS_TMP") or RAIZ / "_trabajo" / "tmp" / "prueba_nube")   # dentro de /home: el Firefox "snap" no lee /tmp
os.environ["TMPDIR"] = str(TMP.parent)                              # el perfil temporal de Firefox también tiene que quedar en /home
TMP.parent.mkdir(parents=True, exist_ok=True)
SITIO, DESCARGAS, FOTOS = TMP / "sitio", TMP / "descargas", TMP / "fotos"
GECKO = os.environ.get("RIVERO_GECKODRIVER") or str(RAIZ / "_trabajo" / "bin" / "geckodriver")
P_SITIO, P_GH = 8793, 8794
GH = f"http://127.0.0.1:{P_GH}"
URL = f"http://127.0.0.1:{P_SITIO}/index.html?nube_api={GH}&nube_raw={GH}/raw"
LLAVE = "github_pat_bueno_" + "b" * 30
resultados = []


def ok(nombre, cond, extra=""):
    resultados.append(bool(cond))
    print(("OK    " if cond else "FALLA ") + nombre + ((" → " + str(extra)) if extra != "" else ""), flush=True)


def gh(ruta, datos=None):
    """Consulta al GitHub de mentira (los ganchos /_prueba/… que cambian algo van por POST)."""
    post = datos is not None or ruta.split("?")[0] in ("/_prueba/procesar", "/_prueba/conflicto", "/_prueba/poner")
    req = urllib.request.Request(GH + ruta, data=(json.dumps(datos).encode() if datos is not None else b"") if post else None, method="POST" if post else "GET",
                                 headers={"Content-Type": "application/json"} if datos is not None else {})
    with urllib.request.urlopen(req, timeout=20) as r:
        return json.loads(r.read())


def arbol():
    return gh("/_prueba/arbol")["archivos"]


def preparar():
    shutil.rmtree(TMP, ignore_errors=True)
    for d in (DESCARGAS, FOTOS):
        d.mkdir(parents=True)
    subprocess.run([sys.executable, str(RAIZ / "herramientas" / "armar_sitio.py"), "--salida", str(SITIO), "--pruebas", "--repo", "prueba/tienda", "--sin-zip"], check=True, cwd=RAIZ, stdout=subprocess.DEVNULL)
    # fotos de prueba: una con fondo (como sacada con el celular) y una "aceite" para traer de otra PC
    for nombre, color in (("IMG_20261008_101500.jpg", (120, 160, 200)), ("IMG_20261008_101700.jpg", (200, 190, 150))):
        im = Image.new("RGB", (900, 700), color)
        px = im.load()
        for x in range(300, 600):
            for y in range(120, 640):
                px[x, y] = (220, 60, 60)
        im.save(FOTOS / nombre, quality=90)
    (SITIO / "_prueba").mkdir()
    shutil.copy(FOTOS / "IMG_20261008_101700.jpg", SITIO / "_prueba" / "aceite.jpg")
    inicial = {f"productos/{p.relative_to(RAIZ / 'productos').as_posix()}": p.read_bytes() for p in (RAIZ / "productos").rglob("*") if p.is_file()}
    inicial["README.md"] = b"# tienda de prueba\n"
    return inicial


class Silencioso(SimpleHTTPRequestHandler):
    def log_message(self, *a):
        pass


def servir_sitio():
    s = ThreadingHTTPServer(("127.0.0.1", P_SITIO), functools.partial(Silencioso, directory=str(SITIO)))
    s.daemon_threads = True
    threading.Thread(target=s.serve_forever, daemon=True).start()
    return s


def navegador():
    if os.environ.get("RIVERO_NAVEGADOR", "firefox").lower() == "chrome":            # RIVERO_NAVEGADOR=chrome (chromedriver lo baja Selenium)
        from selenium.webdriver.chrome.options import Options as OpcionesChrome
        o = OpcionesChrome()
        o.add_argument("--headless=new")
        o.add_argument("--window-size=1500,950")
        o.add_experimental_option("prefs", {"download.default_directory": str(DESCARGAS), "download.prompt_for_download": False,
                                            "profile.default_content_setting_values.automatic_downloads": 1})
        d = webdriver.Chrome(options=o)
        d.set_script_timeout(90)
        return d
    o = Options()
    o.add_argument("-headless")
    o.binary_location = os.environ.get("RIVERO_FIREFOX", "/usr/bin/firefox")
    o.set_preference("browser.download.folderList", 2)
    o.set_preference("browser.download.dir", str(DESCARGAS))
    o.set_preference("browser.download.useDownloadDir", True)
    o.set_preference("browser.download.manager.showWhenStarting", False)
    o.set_preference("browser.helperApps.neverAsk.saveToDisk", "application/zip,image/png,application/pdf,text/calendar,application/json,application/octet-stream")
    o.set_preference("pdfjs.disabled", True)
    log = TMP / "gecko.log"
    d = webdriver.Firefox(options=o, service=Service(GECKO, log_output=str(log)))
    d.set_window_size(1500, 950)
    d.set_script_timeout(90)
    return d


def esperar(d, js, t=25, msg=""):
    WebDriverWait(d, t).until(lambda x: x.execute_script(js), msg)


def js(d, codigo, *args):
    return d.execute_script(codigo, *args)


def jsa(d, codigo, *args):
    """Script asíncrono: el código usa `listo(valor)` para devolver."""
    return d.execute_async_script("const listo = arguments[arguments.length - 1];\n(async () => {" + codigo + "})().then(v => listo(v === undefined ? null : v), e => listo('ERROR: ' + (e && e.message || e)));", *args)


def clic_texto(d, selector, texto):
    """Clic en el último botón visible y habilitado que dice `texto` (el de la ventana de más arriba)."""
    return js(d, "const bs=[...document.querySelectorAll(arguments[0])].filter(x=>x.textContent.includes(arguments[1]) && x.offsetParent !== null && !x.disabled); const b=bs[bs.length-1]; if(b){b.click(); return true;} return false;", selector, texto)


def clic_casillero(d, tipo, i):
    js(d, """const [tipo, i] = arguments, api = window.__api, c = document.querySelector('.stage canvas');
      const t = api.hits().find(h => h.tipo === tipo && h.i === i); const dim = api.dim(), r = c.getBoundingClientRect();
      c.dispatchEvent(new MouseEvent('click', { clientX: r.left + (t.x + t.w / 2) / dim.w * r.width, clientY: r.top + (t.y + t.h / 2) / dim.h * r.height, bubbles: true }));""", tipo, i)


def foto(d, nombre):
    d.save_screenshot(str(TMP / nombre))


def subir_foto_en_selector(d, ruta, nombre, categoria, con_ia):
    js(d, "const i=document.querySelector('.selector input[type=file]'); i.hidden=false; i.style.display='block'; i.style.opacity=1")
    d.find_element(By.CSS_SELECTOR, ".selector input[type=file]").send_keys(str(ruta))
    esperar(d, "return !!document.querySelector('.sube-fila input')")
    n = d.find_element(By.CSS_SELECTOR, ".sube-fila input")
    n.clear()
    n.send_keys(nombre)
    d.find_element(By.CSS_SELECTOR, ".modal [list='lista-categorias']").send_keys(categoria)
    marcado = js(d, "const l=[...document.querySelectorAll('.modal label.chk')].find(x=>x.textContent.includes('Quitar el fondo con IA')); return l ? l.querySelector('input').checked : null")
    if marcado is not None and marcado != con_ia:
        js(d, "[...document.querySelectorAll('.modal label.chk')].find(x=>x.textContent.includes('Quitar el fondo con IA')).querySelector('input').click()")
    clic_texto(d, ".modal-pie .btn.primary", "")


def main():
    inicial = preparar()
    sitio = servir_sitio()
    falso = github_falso.arrancar(P_GH, inicial)
    d = navegador()
    try:
        # ── 1) abre en modo nube, sin llave ──
        d.get(URL)
        esperar(d, "return !!document.querySelector('.fmt') && !!document.querySelector('.stage canvas') && !!window.__estado", 40)
        time.sleep(1.0)
        ok("modo online", "folletos online" in d.execute_script("return document.querySelector('.brand').textContent"))   # en pantallas bajas el subtítulo se oculta
        ok("botón ☁ Conectar (sin llave)", d.find_element(By.CSS_SELECTOR, ".nube-chip").text.strip() == "☁ Conectar")
        acc = d.find_element(By.CSS_SELECTOR, ".actions").text
        ok("botones de la nube y marketing", all(t in acc for t in ("Nuevo folleto", "Mis folletos", "Marketing", "Finalizar")), acc.replace("\n", " | "))
        foto(d, "n01_inicio.png")

        # ── 2) folleto nuevo y buscador con las fotos de la nube ──
        clic_texto(d, ".demo-note button", "Empezar un folleto nuevo")
        time.sleep(1.0)
        ok("folleto nuevo vacío", js(d, "return window.__estado.productos.every(p => !p.nombre && !p.archivo)"))
        clic_casillero(d, "producto", 0)
        esperar(d, "return document.querySelectorAll('.selector-modal .tile').length >= 44", 30)
        tiles = js(d, "return document.querySelectorAll('.selector-modal .tile').length")
        ok("buscador con las fotos de la nube", tiles >= 44, f"{tiles} fotos")
        ok("miniaturas del catálogo armado", js(d, "return [...document.querySelectorAll('.selector-modal .tile img')].some(i => i.getAttribute('src').startsWith('catalogo/mini/'))"))
        ok("categorías", {"Repostería", "Fotos grandes"} <= set(js(d, "return [...document.querySelectorAll('.cat')].map(c=>c.firstChild.textContent)")))
        foto(d, "n02_buscador.png")
        d.find_element(By.CSS_SELECTOR, "input.busca").send_keys("mapsa cuber semiamargo")
        time.sleep(0.4)
        clic_texto(d, ".selector-modal .tile", "Mapsa Cuber semiamargo")
        esperar(d, "return window.__estado.productos[0].archivo === 'Repostería/Mapsa Cuber semiamargo 500 g.png'")
        ok("producto elegido de la nube", True)
        d.switch_to.active_element.send_keys("25.990")
        time.sleep(0.6)
        esperar(d, "const p = window.__estado.productos[0]; return !!p.final")
        url_img = js(d, "return window.__api.nube().urlImagen(window.__estado.productos[0].archivo)")
        ok("la foto viene de la misma página (copia del catálogo)", url_img.startswith("fotos/"), url_img[:70])          # desde la 3.7: sin el límite de raw
        url_nueva = js(d, "return window.__api.nube().urlImagen('Nueva/todavía no publicada.png')")
        ok("una foto que todavía no está en la página viene de GitHub", url_nueva.startswith(GH + "/raw/prueba/tienda/"), url_nueva[:70])
        time.sleep(1.5)
        r = js(d, "try { return window.__api.lienzo(0.25).toDataURL('image/png').length } catch (e) { return 'ERROR ' + e.message }")
        ok("el folleto se puede exportar (foto de otro sitio con CORS)", isinstance(r, int) and r > 5000, r)

        # ── 3) conectar con GitHub ──
        d.find_element(By.CSS_SELECTOR, ".nube-chip").click()
        esperar(d, "return !!document.querySelector('.pasos-llave')")
        foto(d, "n03_conectar.png")
        d.find_element(By.CSS_SELECTOR, ".pasos-llave input[type=text]").send_keys("Casa")
        enlace = js(d, "return document.querySelector('.pasos-llave a').href")
        ok("link a GitHub con la llave ya armada", "personal-access-tokens/new" in enlace and "contents=write" in enlace and "target_name=prueba" in enlace and "expires_in=365" in enlace, enlace[:120])
        llave = d.find_element(By.CSS_SELECTOR, ".pasos-llave input[type=password]")
        llave.send_keys("github_pat_lectura_" + "a" * 30)
        clic_texto(d, ".modal-pie .btn.primary", "Conectar")
        esperar(d, "return /no tiene permiso/.test(document.querySelector('.modal-cuerpo').innerText)")
        ok("llave sin permiso de escritura: lo explica", True)
        llave.clear()
        llave.send_keys(LLAVE)
        clic_texto(d, ".modal-pie .btn.primary", "Conectar")
        esperar(d, "return !document.querySelector('.pasos-llave') && document.querySelector('.nube-chip').textContent.includes('En la nube')")
        ok("conectado: ☁ En la nube", True)
        ok("la llave quedó en este navegador", js(d, "return localStorage.getItem('rm.github.llave')") == LLAVE)

        # ── 4) subir una foto sin IA y otra con IA ──
        clic_casillero(d, "producto", 1)
        esperar(d, "return document.querySelectorAll('.selector-modal .tile').length >= 44")
        subir_foto_en_selector(d, FOTOS / "IMG_20261008_101500.jpg", "Gaseosa de prueba 2 L", "Bebidas", False)
        esperar(d, "return window.__estado.productos[1].archivo === 'Bebidas/Gaseosa de prueba 2 L.jpg'", 30)
        ok("foto subida a la nube y cargada en el casillero", "productos/Bebidas/Gaseosa de prueba 2 L.jpg" in arbol())
        clic_casillero(d, "producto", 2)
        esperar(d, "return document.querySelectorAll('.selector-modal .tile').length >= 45")
        subir_foto_en_selector(d, FOTOS / "IMG_20261008_101700.jpg", "Yerba de prueba 1 kg", "Almacén", True)
        esperar(d, "return !document.querySelector('.sube-fila')", 30)
        esperar(d, "return !!document.querySelector('.tile.pend')", 30)
        ok("con IA: va a productos/_entrada", "productos/_entrada/Almacén/Yerba de prueba 1 kg.jpg" in arbol())
        ok("el buscador la muestra «quitando fondo»", "Quitando fondo" in d.find_element(By.CSS_SELECTOR, ".tile.pend").text)
        foto(d, "n04_quitando_fondo.png")
        gh("/_prueba/procesar")
        clic_texto(d, ".modal-pie button", "Actualizar")
        esperar(d, "return !document.querySelector('.tile.pend') && [...document.querySelectorAll('.selector-modal .tile')].some(t => t.textContent.includes('Yerba de prueba 1 kg') && t.textContent.includes('Nueva'))", 20)
        ok("GitHub le quitó el fondo: aparece sola (marcada Nueva)", "productos/Almacén/Yerba de prueba 1 kg.png" in arbol())
        clic_texto(d, ".selector-modal .tile", "Yerba de prueba 1 kg")
        esperar(d, "return window.__estado.productos[2].archivo === 'Almacén/Yerba de prueba 1 kg.png'")
        d.switch_to.active_element.send_keys("3.200")

        # ── 5) «Quitar fondo con IA» de una foto que ya está en la nube ──
        js(d, "document.querySelector('.prow[data-i=\"1\"] details.pmas').open = true")
        clic_texto(d, '.prow[data-i="1"] button', "Quitar fondo con IA")
        esperar(d, "return window.__estado.productos[1].esperaIA === 'Bebidas/Gaseosa de prueba 2 L (sin fondo).png'", 20)
        ok("pide el recorte sin volver a subir la foto", "productos/_entrada/Bebidas/Gaseosa de prueba 2 L (sin fondo).jpg" in arbol())
        gh("/_prueba/procesar")
        jsa(d, "await window.__api.nube().refrescar(true); window.__api.nube().resolverEsperas(); return true;")
        esperar(d, "return window.__estado.productos[1].archivo === 'Bebidas/Gaseosa de prueba 2 L (sin fondo).png' && !window.__estado.productos[1].esperaIA", 15)
        ok("la foto del folleto pasó sola a la versión sin fondo", True)

        # ── 6) finalizar: .zip con todo, copia en «Mis folletos» y precios recordados ──
        js(d, "const p = window.__estado.productos; p[1].final = '4.150'; p[1].regular = '4.890'; window.__estado.vigencia.desde = '2026-10-12'; window.__estado.vigencia.hasta = '2026-10-18';")
        clic_texto(d, ".actions .btn.primary", "Finalizar")
        esperar(d, "return [...document.querySelectorAll('.modal-cab h2')].some(h => /revisá esto|para dónde/i.test(h.textContent))")
        if js(d, "return [...document.querySelectorAll('.modal-cab h2')].some(h => /revisá esto/i.test(h.textContent))"):
            clic_texto(d, ".modal-pie .btn.primary", "Seguir igual")
        esperar(d, "return [...document.querySelectorAll('.modal-cab h2')].some(h => /para dónde/i.test(h.textContent))")
        js(d, """document.querySelectorAll('.dest input').forEach(i => { const t = i.closest('.dest').textContent; const quiero = /Imprimir en hoja A4|Estados e Historias · UN PRODUCTO/.test(t); if (i.checked !== quiero) i.click(); });""")
        publicar = js(d, "const l = [...document.querySelectorAll('label.chk')].find(x => /Publicar estas ofertas/.test(x.textContent)); if (l && !l.querySelector('input').checked) l.querySelector('input').click(); return !!l")
        ok("ofrece publicar en la página de ofertas", publicar)
        clic_texto(d, ".modal-pie .btn.primary", "Generar")
        esperar(d, "return [...document.querySelectorAll('.modal-cab h2')].some(h => /terminado|No pude/.test(h.textContent))", 90)
        titulo = js(d, "return [...document.querySelectorAll('.modal-cab h2')].map(h => h.textContent).join('|')")
        ok("folleto terminado", "terminado" in titulo, titulo)
        foto(d, "n05_terminado.png")
        texto_fin = js(d, "return document.querySelector('.modal-cuerpo').innerText")
        ok("avisa que se descargó en un .zip", ".zip" in texto_fin)
        ok("y que quedó la copia en la nube", "Mis folletos" in texto_fin)
        zips = []
        for _ in range(40):
            zips = [p for p in DESCARGAS.glob("*.zip") if not p.name.endswith(".part")]
            if zips and not list(DESCARGAS.glob("*.part")):
                break
            time.sleep(0.5)
        ok("se descargó un .zip", len(zips) == 1, [p.name for p in zips])
        if zips:
            z = zipfile.ZipFile(zips[0])
            nombres = z.namelist()
            ok("el .zip trae A4 (PNG y PDF) y una imagen por producto", len(nombres) == 5 and sum(n.endswith(".pdf") for n in nombres) == 1, len(nombres))
            a4 = next((n for n in nombres if n.endswith("A4 para imprimir.png")), None)
            ok("PNG A4 a 300 dpi", a4 and Image.open(io.BytesIO(z.read(a4))).size == (2480, 3508), a4)
            ok("nombres con carpeta y tildes", all(n.startswith("Rivero Market - ") and "/" in n for n in nombres), nombres[0])
        a = arbol()
        proys = [p for p in a if p.startswith("datos/proyectos/")]
        ok("copia en «Mis folletos» (en la nube)", len(proys) == 1, proys)
        pub = json.loads(urllib.request.urlopen(GH + "/_prueba/archivo?ruta=datos/publico/ofertas.json").read()) if "datos/publico/ofertas.json" in a else {}
        ok("ofertas publicadas para la página (solo lo que se ve)", len(pub.get("productos", [])) >= 2 and pub["productos"][0].get("final") and "costo" not in json.dumps(pub), [p.get("nombre") for p in pub.get("productos", [])][:3])
        cat = json.loads(urllib.request.urlopen(GH + "/_prueba/archivo?ruta=datos/catalogo.json").read())
        ok("memoria de precios en la nube", cat.get("Repostería/Mapsa Cuber semiamargo 500 g.png", {}).get("final") == "25.990" and "Almacén/Yerba de prueba 1 kg.png" in cat, list(cat)[:3])
        clic_texto(d, ".modal-pie button", "Seguir editando")

        # ── 6b) «¿Cómo te fue?» en «Mis folletos»: queda guardado en el mismo folleto ──
        clic_texto(d, ".actions button", "Mis folletos")
        esperar(d, "return [...document.querySelectorAll('.proy button')].some(b => /Cómo te fue/.test(b.textContent))", 15)
        clic_texto(d, ".proy button", "¿Cómo te fue?")
        esperar(d, "return !!document.getElementById('res-ventas')", 15)
        js(d, "const v = document.getElementById('res-ventas'); v.value = '1.250.000'; const c = document.getElementById('res-canal'); c.value = '7';")
        clic_texto(d, ".modal-pie .btn.primary", "Guardar")
        time.sleep(1.5)
        proy = json.loads(urllib.request.urlopen(GH + "/_prueba/archivo?ruta=" + urllib.parse.quote(proys[0])).read())
        ok("«¿Cómo te fue?» queda guardado en el folleto", (proy.get("resultados") or {}).get("ventas") == "1.250.000" and (proy["resultados"].get("claves") or {}).get("canal") == 7, proy.get("resultados"))
        js(d, "document.querySelectorAll('.modal-cab button').forEach(b => b.click())")
        time.sleep(0.5)

        # ── 7) marketing ──
        clic_texto(d, ".actions button", "Marketing")
        esperar(d, "return !!document.querySelector('.mkt-texto')")
        t = js(d, "return document.querySelector('.mkt-texto').value")
        ok("texto para el canal con negritas y precios", "*Mapsa Cuber semiamargo 500 g*" in t and "*$25.990*" in t and "~$4.890~" in t, t[:120].replace("\n", " / "))
        ok("con la dirección", "Solís Pizarro 1430" in t)
        foto(d, "n06_marketing_textos.png")
        clic_texto(d, ".mkt-cuerpo .q", "Facebook")
        t = js(d, "return document.querySelector('.mkt-texto').value")
        ok("texto de Facebook sin asteriscos y con hashtags", "*" not in t and "#RiveroMarket" in t and "whatsapp.com/channel" in t)
        clic_texto(d, ".mkt-cuerpo .q", "Estados")
        n_est = js(d, "return document.querySelectorAll('.mkt-linea').length")
        ok("textos para los Estados (uno general y uno por producto)", n_est == 4, n_est)
        clic_texto(d, ".mkt-cuerpo .q", "Canal")
        clic_texto(d, ".mkt-cuerpo .q", "Urgente")
        ok("tono urgente", "⏰" in js(d, "return document.querySelector('.mkt-texto').value"))
        clic_texto(d, ".mkt-tab", "Plan")
        esperar(d, "return document.querySelectorAll('.plan-item').length > 5")
        ok("plan de la semana (7 días)", js(d, "return document.querySelectorAll('.plan-dia').length") == 7)
        foto(d, "n07_plan.png")
        clic_texto(d, ".mkt-cuerpo button", "Recordatorios")
        ics = None
        for _ in range(40):                                           # Firefox crea el archivo vacío y lo llena al final
            l = [p for p in DESCARGAS.glob("*.ics") if p.stat().st_size > 0]
            if l and not list(DESCARGAS.glob("*.part")):
                ics = l[0].read_text(encoding="utf-8")
                break
            time.sleep(0.3)
        ok("recordatorios para el celular (.ics)", ics and ics.startswith("BEGIN:VCALENDAR") and ics.count("BEGIN:VEVENT") >= 15, ics and ics.count("BEGIN:VEVENT"))
        clic_texto(d, ".mkt-tab", "Me conviene")
        esperar(d, "return !!document.querySelector('.mkt-cuerpo select')")
        js(d, "const s = document.querySelector('.mkt-cuerpo select'); s.value = '0'; s.dispatchEvent(new Event('change'));")
        ok("calculadora: sin «antes», el precio de hoy es el normal", js(d, "return [...document.querySelectorAll('.mkt-cuerpo .caja-aparte input')][1].value") == "25.990")
        costo = d.find_element(By.CSS_SELECTOR, ".mkt-cuerpo .caja-aparte input[placeholder='ej. 15.000']")
        costo.send_keys("18.000")
        js(d, "const i = [...document.querySelectorAll('.mkt-cuerpo .caja-aparte input')][3]; i.value = '10'; i.dispatchEvent(new Event('input'));")
        txt = js(d, "return document.querySelector('.calc-res').innerText")
        ok("calculadora: cuánto gana y cuánto más hay que vender", "ganás" in txt and "vender" in txt and "23.391" in js(d, "return [...document.querySelectorAll('.mkt-cuerpo .caja-aparte input')][2].value"), txt[:200].replace("\n", " / "))
        foto(d, "n07b_calculadora.png")
        ok("el costo queda solo en esta PC", "18.000" in (js(d, "return localStorage.getItem('rm.costos')") or ""))
        clic_texto(d, ".mkt-tab", "combo")
        esperar(d, "return document.querySelectorAll('.combo-fila').length >= 2")
        js(d, "document.querySelectorAll('.combo-fila input[type=checkbox]')[0].click(); document.querySelectorAll('.combo-fila input[type=checkbox]')[1].click();")
        js(d, "const i = [...document.querySelectorAll('.mkt-cuerpo input')].find(x => x.placeholder === 'precio del combo'); i.value = '27.500'; i.dispatchEvent(new Event('input'));")
        clic_texto(d, ".mkt-cuerpo .btn.primary", "Agregar el combo")
        esperar(d, "return window.__estado.productos.some(p => p.etiqueta === 'COMBO')")
        combo = js(d, "const p = window.__estado.productos.find(p => p.etiqueta === 'COMBO'); return [p.nombre, p.regular, p.final, (p.img || '').slice(0, 22)]")
        ok("combo agregado al folleto (con las fotos juntas)", combo[1] == "30.140" and combo[2] == "27.500" and combo[3].startswith("data:image/"), combo)   # WebP (o PNG si el navegador no tiene WebP)
        clic_texto(d, ".mkt-tab", "Fechas")
        ev = js(d, "return [...document.querySelectorAll('.evento b')].map(b => b.textContent)")
        ok("fechas que vienen", "Halloween" in ev and "Día de la Madre" in ev, ev[:4])
        clic_texto(d, ".mkt-tab", "Ideas")
        n_ideas = js(d, "return document.querySelectorAll('label.guia').length")
        js(d, "document.querySelector('label.guia input').click()")
        ok("ideas para vender más (con casillas)", n_ideas >= 25 and "google" in (js(d, "return localStorage.getItem('rm.guia.hecho')") or ""), n_ideas)
        foto(d, "n08_ideas.png")
        js(d, "document.querySelector('.modal-cab button').click()")

        # ── 8) otra PC guardó al mismo tiempo: se reintenta sin perder nada ──
        gh("/_prueba/conflicto?n=1")
        r = jsa(d, "const c = await window.__api.nube().guardarCatalogo({ 'x/prueba.png': { nombre: 'Prueba', final: '1', ts: Date.now() } }); return Object.keys(c).length;")
        a = arbol()
        cat = json.loads(urllib.request.urlopen(GH + "/_prueba/archivo?ruta=datos/catalogo.json").read())
        ok("guardado con otra PC al mismo tiempo (reintenta y junta)", isinstance(r, int) and any(p.startswith("datos/otra-pc-") for p in a) and "x/prueba.png" in cat and "Repostería/Mapsa Cuber semiamargo 500 g.png" in cat, r)

        # ── 9) «Mis folletos» desde la nube ──
        clic_texto(d, ".actions button", "Mis folletos")
        esperar(d, "return document.querySelectorAll('.proy').length >= 1")
        esperar(d, "return /A4 · 10 ofertas/.test(document.querySelector('.proy small').textContent)", 15)
        ok("Mis folletos lista la copia de la nube (con su formato)", True, js(d, "return document.querySelector('.proy').innerText.replace(/\\n/g, ' | ')"))
        js(d, "document.querySelector('.modal-cab button').click()")

        # ── 10) folleto en curso: se guarda en la nube y se ofrece en la otra PC ──
        r = jsa(d, "return await window.__api.nube().guardarBorrador();")
        pc = js(d, "return window.__api.nube().pc")
        ok("folleto en curso guardado en la nube", r is True and f"datos/borradores/{pc}.json" in arbol(), r)
        otro = {"pc": "pc-negocio", "nombre": "Negocio", "ts": int(time.time() * 1000) + 120000,
                "estado": {"v": 6, "formato": "a4_10", "tema": "naranja", "titulo": "Folleto de la otra PC", "productos": [{"nombre": "Salame milán", "final": "4.500"}], "avisoEjemplo": False}}
        gh("/_prueba/poner", {"ruta": "datos/borradores/pc-negocio.json", "texto": json.dumps(otro)})
        d.get(URL)
        esperar(d, "return [...document.querySelectorAll('.modal-cab h2')].some(h => /otra computadora/.test(h.textContent))", 40)
        ok("al abrir, ofrece seguir el folleto de la otra PC", True)
        foto(d, "n09_otra_pc.png")
        clic_texto(d, ".modal-pie .btn.primary", "seguir con ese")
        esperar(d, "return window.__estado.titulo === 'Folleto de la otra PC' && window.__estado.productos[0].nombre === 'Salame milán'")
        ok("sigue con el folleto de la otra PC", True)
        ok("la llave sigue guardada al volver a abrir", "En la nube" in d.find_element(By.CSS_SELECTOR, ".nube-chip").text)

        # ── 11) traer lo de otra PC (carpeta del programa viejo) ──
        r = jsa(d, """
          const raw = window.__api.nube().urlImagen('Repostería/Mapsa Cuber semiamargo 500 g.png');
          const mk = async (url, rel) => { const b = await (await fetch(url)).blob(); const f = new File([b], rel.split('/').pop(), { type: b.type }); f.relativo = rel; return f; };
          const txt = (texto, rel) => { const f = new File([texto], rel.split('/').pop(), { type: 'application/json' }); f.relativo = rel; return f; };
          const R = 'Rivero-Market-Folletos/';
          const fs = [await mk(raw, R + 'productos/Repostería/Mapsa Cuber semiamargo 500 g.png'),
            await mk('icono-512.png', R + 'productos/Fiambres/Salame milán.png'),
            await mk('_prueba/aceite.jpg', R + 'productos/Almacén/Aceite girasol 900 ml.jpg'),
            txt(JSON.stringify({ 'Fiambres/Salame milán.png': { nombre: 'Salame milán', final: '4.500', ts: Date.now() } }), R + 'programa/datos/catalogo.json'),
            txt(JSON.stringify({ v: 6, formato: 'a4_10', titulo: 'Ofertas viejas', productos: [] }), R + 'programa/datos/proyectos/2026-10-01_120000 Ofertas viejas - 2026-10-05.json'),
            txt('x', R + 'programa/datos/cache/miniaturas/abc.webp')];
          window.__nube.abrirTraer({ archivos: fs }); return fs.length;""")
        esperar(d, "return /encontradas/.test(document.querySelector('.modal-cuerpo').innerText)", 20)
        resumen = js(d, "return document.querySelector('.modal-cuerpo').innerText")
        ok("resumen de lo que hay para traer", "3 encontradas · 2 nuevas · 1 ya estaban" in resumen and "1 nuevo" in resumen, resumen.split("\n")[3:6])
        foto(d, "n10_traer.png")
        clic_texto(d, ".modal-pie .btn.primary", "Subir a la nube")
        esperar(d, "return /¡Listo!|Se cortó/.test(document.querySelector('.modal-cuerpo').innerText)", 60)
        fin = js(d, "return document.querySelector('.modal-cuerpo').innerText")
        a = arbol()
        ok("trajo las fotos nuevas (y la que tenía fondo, a la IA)", "productos/Fiambres/Salame milán.png" in a and "productos/_entrada/Almacén/Aceite girasol 900 ml.jpg" in a, fin[:120])
        ok("trajo «Mis folletos»", "datos/proyectos/2026-10-01_120000 Ofertas viejas - 2026-10-05.json" in a)
        cat = json.loads(urllib.request.urlopen(GH + "/_prueba/archivo?ruta=datos/catalogo.json").read())
        ok("juntó los precios", "Fiambres/Salame milán.png" in cat and "Repostería/Mapsa Cuber semiamargo 500 g.png" in cat)
        js(d, "document.querySelector('.modal-cab button').click()")
        jsa(d, "await window.__api.nube().refrescar(true); return true;")
        js(d, "window.__nube.abrirTraer({ archivos: [] })")
        r = jsa(d, """
          const mk = async (url, rel) => { const b = await (await fetch(url)).blob(); const f = new File([b], rel.split('/').pop(), { type: b.type }); f.relativo = rel; return f; };
          document.querySelector('.modal-cab button').click();
          window.__nube.abrirTraer({ archivos: [await mk('icono-512.png', 'X/productos/Fiambres/Salame milán.png'), await mk('_prueba/aceite.jpg', 'X/productos/Almacén/Aceite girasol 900 ml.jpg')] }); return true;""")
        esperar(d, "return /encontradas/.test(document.querySelector('.modal-cuerpo').innerText)", 20)
        ok("traer de nuevo no repite nada", "0 nuevas · 2 ya estaban" in js(d, "return document.querySelector('.modal-cuerpo').innerText"))
        js(d, "document.querySelector('.modal-cab button').click()")

        # ── 12) versión nueva publicada: aviso arriba ──
        v = json.loads((SITIO / "version.json").read_text())
        v["armado"] = "2099-01-01T00:00:00Z"                            # se rearmó la página (por ejemplo, por fotos nuevas) con la misma herramienta
        (SITIO / "version.json").write_text(json.dumps(v))
        js(d, "window.__nube.revisarVersionNueva()"); time.sleep(2)
        ok("fotos nuevas no hacen saltar el aviso de versión", not d.find_elements(By.CSS_SELECTOR, ".banner-version"))
        v["codigo"], v["v"] = "otro-codigo", "9.9"
        (SITIO / "version.json").write_text(json.dumps(v))
        js(d, "window.__nube.revisarVersionNueva()")
        esperar(d, "return !!document.querySelector('.banner-version')", 10)
        ok("aviso de versión nueva", "versión nueva" in d.find_element(By.CSS_SELECTOR, ".banner-version").text)
        foto(d, "n11_version_nueva.png")

        # ── 13) desconectar ──
        js(d, "window.__nube.desconectarNube()")
        esperar(d, "return [...document.querySelectorAll('.modal-cab h2')].some(h => /Desconectar/.test(h.textContent))")
        clic_texto(d, ".modal-pie .btn.primary", "Desconectar")
        esperar(d, "return document.querySelector('.nube-chip').textContent.trim() === '☁ Conectar'")
        ok("desconectado: la llave se borró", js(d, "return localStorage.getItem('rm.github.llave')") is None)
        clic_casillero(d, "producto", 5)
        esperar(d, "return document.querySelectorAll('.selector-modal .tile').length >= 44")
        ok("sin llave igual se pueden elegir fotos (y usar una de la PC)", clic_texto(d, ".modal-pie button", "Usar una foto de esta PC") is True)
        time.sleep(0.5)
        # ── 14) guardar directo en una carpeta de la PC (Chrome y Edge), con una carpeta de mentira ──
        r = jsa(d, """
          const mem = {};
          const dirH = path => ({ name: path.split('/').pop(), kind: 'directory',
            async queryPermission() { return 'granted'; }, async requestPermission() { return 'granted'; },
            async getDirectoryHandle(n, o = {}) { const p = path + '/' + n; if (!(p in mem)) { if (!o.create) throw new DOMException('no', 'NotFoundError'); mem[p] = 'dir'; } else if (mem[p] !== 'dir') throw new DOMException('tipo', 'TypeMismatchError'); return dirH(p); },
            async getFileHandle(n, o = {}) { const p = path + '/' + n; if (!(p in mem)) { if (!o.create) throw new DOMException('no', 'NotFoundError'); mem[p] = 0; } else if (mem[p] === 'dir') throw new DOMException('tipo', 'TypeMismatchError');
              return { kind: 'file', name: n, async createWritable() { let t = 0; return { async write(b) { t += b.size; }, async close() { mem[p] = t; } }; } }; } });
          window.__nube.CARPETA_PC.handle = dirH('Escritorio');
          const b = new Blob([new Uint8Array(1234)], { type: 'image/png' });
          const arch = [{ nombre: 'Folleto - A4.png', tipo: 'png', blob: b }, { nombre: 'Folleto - A4.pdf', tipo: 'pdf', blob: b }, { nombre: 'Folleto - Estado.png', tipo: 'png', blob: b }];
          const r1 = await window.__nube.entregarArchivos(arch, 'Rivero Market - Prueba', 'carpeta');
          const r2 = await window.__nube.entregarArchivos(arch.slice(0, 2), 'Rivero Market - Prueba', 'carpeta');
          const r3 = await window.__nube.entregarArchivos(arch.slice(0, 2), 'Rivero Market - Prueba', 'carpeta');
          window.__nube.CARPETA_PC.handle = null;
          return { modos: [r1.modo, r2.modo, r3.modo], mem };""")
        esperado = {"Escritorio/Rivero Market - Prueba": "dir", "Escritorio/Rivero Market - Prueba/Folleto - A4.png": 1234, "Escritorio/Rivero Market - Prueba/Folleto - A4.pdf": 1234,
                    "Escritorio/Rivero Market - Prueba/Folleto - Estado.png": 1234, "Escritorio/Folleto - A4.png": 1234, "Escritorio/Folleto - A4.pdf": 1234,
                    "Escritorio/Folleto - A4 (2).png": 1234, "Escritorio/Folleto - A4 (2).pdf": 1234}
        ok("guardar en una carpeta de la PC (varias van en una carpeta nueva; no pisa archivos)", isinstance(r, dict) and r["modos"] == ["carpeta"] * 3 and r["mem"] == esperado, r)

        # ── 15) llave vencida o borrada en GitHub ──
        js(d, "localStorage.setItem('rm.github.llave', 'github_pat_malo_' + 'x'.repeat(30))")
        d.get(URL)
        esperar(d, "return !!document.querySelector('.nube-chip') && document.querySelector('.nube-chip').textContent.includes('Reconectar')", 40)
        ok("llave que ya no sirve: pide reconectar", True)
        ok("sin errores de JavaScript en pantalla", "ERROR JS" not in d.find_element(By.TAG_NAME, "body").text)
        ok("consultas al GitHub de mentira", True, gh("/_prueba/arbol")["consultas"])
    except Exception as e:
        import traceback
        traceback.print_exc()
        ok("excepción en la prueba", False, repr(e)[:300])
        try:
            foto(d, "n99_error.png")
            print(d.find_element(By.TAG_NAME, "body").text[:800])
        except Exception:
            pass
    finally:
        d.quit()
        falso.shutdown()
        sitio.shutdown()
    print(f"\n{sum(resultados)} de {len(resultados)} comprobaciones OK  (capturas en {TMP})")
    return 0 if all(resultados) else 1


if __name__ == "__main__":
    sys.exit(main())
