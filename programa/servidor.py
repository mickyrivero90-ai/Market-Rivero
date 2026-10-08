#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Rivero Market · programa de folletos (servidor local)

Hace tres cosas, todas dentro de tu propia computadora:
  1. Muestra la herramienta de folletos en el navegador (http://127.0.0.1:8780).
  2. Lee la carpeta de fotos de productos (RiveroMarket/productos) para elegirlas con un clic.
  3. Guarda los folletos terminados en el Escritorio.

Solo escucha en 127.0.0.1: nadie de tu red puede entrar. No usa internet.

    python3 servidor.py --abrir        abre el navegador; si el programa ya estaba andando, solo lo abre
    python3 servidor.py --sin-navegador   para pruebas

Variables opcionales (para pruebas): RIVERO_PRODUCTOS, RIVERO_ESCRITORIO, RIVERO_DATOS, RIVERO_SIN_ABRIR, RIVERO_PYTHON_IA
"""
import argparse
import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
import threading
import time
import traceback
import unicodedata
import urllib.request
import webbrowser
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

try:
    from PIL import Image, ImageOps
    PIL_OK = True
except Exception:                                   # sin Pillow no hay miniaturas: se usan las fotos originales
    PIL_OK = False

def _leer_version():
    """La versión la escribe el armado de la pantalla en programa/VERSION.txt: así programa y pantalla se pueden comparar."""
    try:
        return (Path(__file__).resolve().parent / "VERSION.txt").read_text(encoding="utf-8-sig").strip() or "?"   # utf-8-sig: el ZIP le pone BOM a los .txt (Bloc de notas)
    except OSError:
        return "?"


VERSION = _leer_version()
ES_WIN = sys.platform.startswith("win")
ES_MAC = sys.platform == "darwin"
PUERTOS = list(range(8780, 8790))
AQUI = Path(__file__).resolve().parent
RAIZ = AQUI.parent
PRODUCTOS = Path(os.environ.get("RIVERO_PRODUCTOS") or RAIZ / "productos").expanduser()
DATOS = Path(os.environ.get("RIVERO_DATOS") or AQUI / "datos").expanduser()
WEB = AQUI / "web" / "index.html"
PROYECTOS = DATOS / "proyectos"
MINIATURAS = DATOS / "cache" / "miniaturas"
NUBE_CFG = AQUI / "nube.json"                       # {"sitio": "https://dueño.github.io/repo/"}: de ahí se traen las fotos de la nube
EXT_IMG = {".png", ".jpg", ".jpeg", ".webp", ".avif", ".gif", ".bmp"}
LOCK_ARCHIVOS = threading.Lock()
LOCK_IA = threading.Lock()
SERVIDOR = None


# ───────────────────────── utilidades ─────────────────────────
def decir(msg):
    try:
        print(msg, flush=True)
    except Exception:
        try:
            print(str(msg).encode("ascii", "replace").decode("ascii"), flush=True)
        except Exception:
            pass


def avisar_error(msg):
    """Muestra un cartel con el problema (con el ícono o pythonw no hay consola donde leerlo) y lo deja en el registro."""
    registrar("ERROR: " + str(msg))
    decir(msg)
    try:
        if ES_WIN:
            import ctypes
            ctypes.windll.user32.MessageBoxW(0, str(msg), "Folletos Rivero Market", 0x10)
        elif not ES_MAC:
            for cmd in (["kdialog", "--error", str(msg)], ["zenity", "--error", "--text", str(msg)], ["notify-send", "Folletos Rivero Market", str(msg)]):
                if shutil.which(cmd[0]):
                    subprocess.Popen(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, start_new_session=True)
                    break
    except Exception:
        pass


def registrar(msg):
    try:
        DATOS.mkdir(parents=True, exist_ok=True)
        log = DATOS / "registro.log"
        if log.exists() and log.stat().st_size > 1_000_000:
            log.replace(DATOS / "registro.anterior.log")
        with open(log, "a", encoding="utf-8") as f:
            f.write(time.strftime("%Y-%m-%d %H:%M:%S ") + str(msg).rstrip() + "\n")
    except Exception:
        pass


def carpeta_escritorio():
    env = os.environ.get("RIVERO_ESCRITORIO")
    if env:
        return Path(env).expanduser()
    if ES_WIN:                                                        # puede estar redirigido a OneDrive
        try:
            import winreg
            with winreg.OpenKey(winreg.HKEY_CURRENT_USER, r"Software\Microsoft\Windows\CurrentVersion\Explorer\User Shell Folders") as k:
                p = Path(os.path.expandvars(winreg.QueryValueEx(k, "Desktop")[0]))
            if p.is_dir():
                return p
        except Exception:
            pass
    elif not ES_MAC:
        try:
            r = subprocess.run(["xdg-user-dir", "DESKTOP"], capture_output=True, text=True, timeout=3)
            p = Path(r.stdout.strip()) if r.returncode == 0 and r.stdout.strip() else None
            if p and p.is_dir() and p != Path.home():
                return p
        except Exception:
            pass
    for n in ("Desktop", "Escritorio"):
        if (Path.home() / n).is_dir():
            return Path.home() / n
    return Path.home() / "Desktop"


ESCRITORIO = carpeta_escritorio()


def buscar_python_ia():
    """Python con 'rembg' instalado (recorte automático de fondo). Es opcional."""
    candidatos = [os.environ.get("RIVERO_PYTHON_IA"), RAIZ / "_trabajo" / "venv" / "bin" / "python", AQUI / ".venv" / "bin" / "python"]
    for c in candidatos:
        if not c:
            continue
        c = Path(c)
        if c.exists() and list((c.parent.parent / "lib").glob("python*/site-packages/rembg")):
            return str(c.absolute())
    return None


IA_PY = buscar_python_ia()


class Rechazo(Exception):
    def __init__(self, codigo, mensaje):
        super().__init__(mensaje)
        self.codigo, self.mensaje = codigo, mensaje


PROHIBIDOS = re.compile(r'[\x00-\x1f<>:"/\\|?*]')


def limpiar_nombre(s, largo=140):
    s = unicodedata.normalize("NFC", str(s or ""))
    s = PROHIBIDOS.sub(" ", s)
    s = re.sub(r"\s+", " ", s).strip(" .")
    return s[:largo].strip(" .") or "sin nombre"


def limpiar_ruta_relativa(r):
    partes = [limpiar_nombre(p) for p in re.split(r"[\\/]+", str(r or "")) if p.strip() and p.strip() not in (".", "..")]
    return "/".join(partes)


def nombre_libre(carpeta, base, ext):
    p = carpeta / f"{base}{ext}"
    n = 2
    while p.exists():
        p = carpeta / f"{base} ({n}){ext}"
        n += 1
    return p


def dentro(base, rel):
    """Ruta absoluta de `rel` dentro de `base`; rechaza cualquier intento de salir de la carpeta."""
    try:
        base = Path(base).resolve()
        p = (base / str(rel)).resolve()
    except (ValueError, OSError):
        raise Rechazo(400, "Ruta no válida")
    if p != base and base not in p.parents:
        raise Rechazo(400, "Ruta no permitida")
    return p


def sin_tildes(s):
    return "".join(c for c in unicodedata.normalize("NFD", s) if unicodedata.category(c) != "Mn").lower()


SUFIJOS_NOMBRE = re.compile(r"\s*\((sin fondo|muestra|recortad[oa])\)\s*$", re.I)


def nombre_de_archivo(stem):
    s = SUFIJOS_NOMBRE.sub("", stem.replace("_", " "))
    return re.sub(r"\s+", " ", s).strip() or stem


def escribir_json_atomico(ruta, obj):
    ruta.parent.mkdir(parents=True, exist_ok=True)
    tmp = ruta.with_suffix(ruta.suffix + ".tmp")
    with LOCK_ARCHIVOS:
        tmp.write_text(json.dumps(obj, ensure_ascii=False), encoding="utf-8")
        os.replace(tmp, ruta)


def leer_json(ruta, defecto=None):
    try:
        return json.loads(ruta.read_text(encoding="utf-8"))
    except Exception:
        return defecto


def abrir_con_el_sistema(ruta):
    if os.environ.get("RIVERO_SIN_ABRIR"):
        return True
    if ES_WIN:
        try:
            os.startfile(str(ruta))                                   # archivos, carpetas y direcciones web
            return True
        except Exception:
            return False
    if ES_MAC:
        subprocess.Popen(["open", str(ruta)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        return True
    for cmd in (["xdg-open"], ["gio", "open"], ["kde-open"]):
        if shutil.which(cmd[0]):
            subprocess.Popen(cmd + [str(ruta)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, start_new_session=True)
            return True
    return False


def tipo_de_imagen(datos):
    if datos[:8] == b"\x89PNG\r\n\x1a\n":
        return ".png"
    if datos[:3] == b"\xff\xd8\xff":
        return ".jpg"
    if datos[:4] == b"RIFF" and datos[8:12] == b"WEBP":
        return ".webp"
    return None


MIME = {".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".avif": "image/avif",
        ".gif": "image/gif", ".bmp": "image/bmp", ".json": "application/json", ".pdf": "application/pdf"}


# ───────────────────────── fotos de productos ─────────────────────────
def listar_productos():
    base = PRODUCTOS.resolve()
    if not base.is_dir():
        return []
    out = []
    for raiz, dirs, archivos in os.walk(base):
        dirs[:] = sorted(d for d in dirs if not d.startswith((".", "_")))
        for f in archivos:
            p = Path(raiz) / f
            if f.startswith(".") or p.suffix.lower() not in EXT_IMG:
                continue
            try:
                st = p.stat()
            except OSError:
                continue
            rel = p.relative_to(base).as_posix()
            cat = Path(rel).parent.as_posix()
            out.append({"ruta": rel, "nombre": nombre_de_archivo(p.stem), "categoria": "" if cat == "." else cat,
                        "mtime": int(st.st_mtime), "tam": st.st_size})
    out.sort(key=lambda x: (sin_tildes(x["nombre"]), x["ruta"]))
    return out


def miniatura_de(ruta):
    """Ruta de una miniatura WEBP (se crea la primera vez). None si no se puede."""
    if not PIL_OK:
        return None
    p = dentro(PRODUCTOS, ruta)
    st = p.stat()
    clave = hashlib.sha1(f"{ruta}|{st.st_mtime_ns}|{st.st_size}".encode("utf-8")).hexdigest()[:24] + ".webp"
    destino = MINIATURAS / clave
    if destino.exists():
        return destino
    try:
        with Image.open(p) as im:
            if im.format == "JPEG":
                im.draft("RGB", (720, 720))                           # decodifica mucho más rápido las fotos grandes del celular
            im = ImageOps.exif_transpose(im)
            im.thumbnail((360, 360), Image.LANCZOS)
            tiene_alfa = "A" in im.getbands() or im.info.get("transparency") is not None
            im = im.convert("RGBA" if tiene_alfa else "RGB")
            MINIATURAS.mkdir(parents=True, exist_ok=True)
            tmp = destino.with_suffix(".tmp")
            im.save(tmp, "WEBP", quality=82)
            os.replace(tmp, destino)
        return destino
    except Exception as e:
        registrar(f"miniatura fallida {ruta}: {e}")
        return None


# ───────────────────────── servidor ─────────────────────────
RUTAS = {}


def ruta(metodo, path):
    def deco(fn):
        RUTAS[(metodo, path)] = fn
        return fn
    return deco


class Handler(BaseHTTPRequestHandler):
    server_version = "RiveroMarket/" + VERSION
    protocol_version = "HTTP/1.0"                   # una conexión por pedido: simple y sin sorpresas

    def log_message(self, fmt, *args):
        if os.environ.get("RIVERO_LOG_PEDIDOS"):
            registrar("%s %s" % (self.address_string(), fmt % args))

    do_GET = lambda self: self._despachar("GET")
    do_POST = lambda self: self._despachar("POST")
    do_PUT = lambda self: self._despachar("PUT")
    do_DELETE = lambda self: self._despachar("DELETE")

    # --- respuestas ---
    def _json(self, obj, codigo=200):
        datos = json.dumps(obj, ensure_ascii=False).encode("utf-8")
        self.send_response(codigo)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(datos)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(datos)

    def _archivo(self, p, tipo=None, cache="no-cache"):
        st = p.stat()
        self.send_response(200)
        self.send_header("Content-Type", tipo or MIME.get(p.suffix.lower(), "application/octet-stream"))
        self.send_header("Content-Length", str(st.st_size))
        self.send_header("Cache-Control", cache)
        self.end_headers()
        with open(p, "rb") as f:
            shutil.copyfileobj(f, self.wfile, 256 * 1024)

    def _cuerpo(self, maximo):
        try:
            n = int(self.headers.get("Content-Length") or 0)
        except ValueError:
            raise Rechazo(400, "Pedido mal formado")
        if n < 0 or n > maximo:
            raise Rechazo(413, "El archivo es demasiado grande")
        return self.rfile.read(n)

    # --- seguridad ---
    def _verificar(self, metodo):
        host = (self.headers.get("Host") or "").rsplit(":", 1)[0].strip("[]")
        if host not in ("127.0.0.1", "localhost"):
            raise Rechazo(403, "Dirección no permitida")
        if metodo != "GET":
            if self.headers.get("X-Rivero") != "1":
                raise Rechazo(403, "Falta el encabezado de seguridad")
            origen = self.headers.get("Origin")
            if origen and (urlparse(origen).hostname or "") not in ("127.0.0.1", "localhost"):
                raise Rechazo(403, "Origen no permitido")

    def _despachar(self, metodo):
        try:
            u = urlparse(self.path)
            q = {k: v[0] for k, v in parse_qs(u.query, keep_blank_values=True).items()}
            self._verificar(metodo)
            if metodo == "GET" and u.path in ("/", "/index.html"):
                return self._web()
            fn = RUTAS.get((metodo, u.path))
            if not fn:
                raise Rechazo(404, "No existe")
            fn(self, q)
        except Rechazo as e:
            try:
                self._json({"error": e.mensaje}, e.codigo)
            except Exception:
                pass
        except (BrokenPipeError, ConnectionResetError):
            pass
        except Exception as e:
            registrar(traceback.format_exc())
            try:
                self._json({"error": "Error interno: %s" % e}, 500)
            except Exception:
                pass

    def _web(self):
        if not WEB.exists():
            datos = "<meta charset=utf-8><body style='font:16px sans-serif;padding:2rem'>Falta construir la herramienta. Ejecutá: <code>python3 editor/build.py</code></body>".encode("utf-8")
            self.send_response(500)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(datos)))
            self.end_headers()
            self.wfile.write(datos)
            return
        self._archivo(WEB, "text/html; charset=utf-8", "no-store")


# ───────────────────────── rutas de la API ─────────────────────────
def sitio_nube():
    """La herramienta online de donde se traen las fotos (programa/nube.json, lo pone el armado del ZIP)."""
    s = str((leer_json(NUBE_CFG, {}) or {}).get("sitio") or "").strip()
    if not re.match(r"^https://[a-z0-9.-]+\.github\.io/[^\s?#]+/$|^http://127\.0\.0\.1:\d+/$", s):
        return ""
    return s


def huella_git(datos):
    """La misma huella que usa GitHub (y el catálogo de la página) para cada foto."""
    return hashlib.sha1(b"blob %d\0" % len(datos) + datos).hexdigest()


@ruta("GET", "/api/hola")
def api_hola(h, q):
    h._json({"ok": True, "programa": "rivero-market", "version": VERSION, "productos": str(PRODUCTOS), "escritorio": str(ESCRITORIO),
             "datos": str(DATOS), "ia": bool(IA_PY), "miniaturas": PIL_OK, "sitio": sitio_nube()})


@ruta("POST", "/api/traer-fotos")
def api_traer_fotos(h, q):
    """Trae a la carpeta de productos las fotos de la herramienta online que faltan o cambiaron (no borra nada)."""
    sitio = sitio_nube()
    if not sitio:
        raise Rechazo(400, "Este programa no sabe cuál es la herramienta online (falta programa/nube.json). Bajá el programa de nuevo desde la herramienta online.")
    def bajar(url, limite):
        with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "RiveroMarket/" + VERSION}), timeout=60) as r:
            return r.read(limite + 1)
    try:
        cat = json.loads(bajar(sitio + "catalogo/productos.json", 20 * 1024 * 1024).decode("utf-8"))
    except Exception as e:
        raise Rechazo(502, f"No pude leer la lista de fotos de la nube ({e}). ¿Hay internet?")
    nuevas, cambiadas, iguales, fallidas = [], [], 0, []
    with LOCK_ARCHIVOS:
        for it in cat.get("productos", []):
            rel, foto, sha = limpiar_ruta_relativa(str(it.get("ruta", ""))), str(it.get("foto") or ""), str(it.get("sha") or "")
            if not rel or not re.match(r"^fotos/[0-9a-f]{40}\.[a-z0-9]{2,5}$", foto) or Path(rel).suffix.lower() not in EXT_IMG:
                continue
            try:
                destino = dentro(PRODUCTOS, rel)
                if destino.is_file() and huella_git(destino.read_bytes()) == sha:
                    iguales += 1
                    continue
                datos = bajar(sitio + foto, 40 * 1024 * 1024)
                if huella_git(datos) != sha:
                    raise ValueError("la foto llegó incompleta")
                habia = destino.is_file()
                destino.parent.mkdir(parents=True, exist_ok=True)
                tmp = destino.with_name(destino.name + ".bajando")
                tmp.write_bytes(datos)
                tmp.replace(destino)
                (cambiadas if habia else nuevas).append(rel)
            except Exception as e:
                fallidas.append(f"{rel}: {e}")
    registrar(f"fotos de la nube: {len(nuevas)} nuevas, {len(cambiadas)} cambiadas, {iguales} iguales, {len(fallidas)} con error")
    h._json({"ok": True, "nuevas": len(nuevas), "cambiadas": len(cambiadas), "iguales": iguales, "fallidas": fallidas[:20]})


@ruta("GET", "/api/productos")
def api_productos(h, q):
    PRODUCTOS.mkdir(parents=True, exist_ok=True)
    h._json({"carpeta": str(PRODUCTOS), "productos": listar_productos()})


@ruta("GET", "/api/imagen")
def api_imagen(h, q):
    p = dentro(PRODUCTOS, q.get("ruta", ""))
    if not p.is_file() or p.suffix.lower() not in EXT_IMG:
        raise Rechazo(404, "No encuentro esa foto")
    h._archivo(p, cache="public, max-age=86400" if q.get("v") else "no-cache")


@ruta("GET", "/api/miniatura")
def api_miniatura(h, q):
    p = dentro(PRODUCTOS, q.get("ruta", ""))
    if not p.is_file() or p.suffix.lower() not in EXT_IMG:
        raise Rechazo(404, "No encuentro esa foto")
    m = miniatura_de(q.get("ruta", ""))
    h._archivo(m or p, "image/webp" if m else None, cache="public, max-age=86400" if q.get("v") else "no-cache")


@ruta("POST", "/api/subir")
def api_subir(h, q):
    nombre = limpiar_nombre(q.get("nombre") or "producto")
    carpeta = limpiar_ruta_relativa(q.get("carpeta", ""))
    datos = h._cuerpo(30 * 1024 * 1024)
    ext = tipo_de_imagen(datos)
    if not ext:
        raise Rechazo(415, "Solo se aceptan fotos JPG, PNG o WEBP")
    PRODUCTOS.mkdir(parents=True, exist_ok=True)
    destino_dir = dentro(PRODUCTOS, carpeta) if carpeta else PRODUCTOS.resolve()
    destino_dir.mkdir(parents=True, exist_ok=True)
    destino = nombre_libre(destino_dir, nombre, ext)
    destino.write_bytes(datos)
    base = PRODUCTOS.resolve()
    h._json({"ruta": destino.relative_to(base).as_posix(), "nombre": nombre_de_archivo(destino.stem), "mtime": int(destino.stat().st_mtime)})


@ruta("POST", "/api/recortar")
def api_recortar(h, q):
    if not IA_PY:
        raise Rechazo(501, "El recorte automático no está instalado en esta computadora")
    p = dentro(PRODUCTOS, q.get("ruta", ""))
    if not p.is_file():
        raise Rechazo(404, "No encuentro esa foto")
    base = SUFIJOS_NOMBRE.sub("", p.stem)
    destino = nombre_libre(p.parent, f"{base} (sin fondo)", ".png")
    with LOCK_IA:
        r = subprocess.run([IA_PY, str(AQUI / "recortar.py"), str(p), str(destino)], capture_output=True, text=True, timeout=240)
    if r.returncode != 0 or not destino.exists():
        registrar("recorte fallido: " + (r.stderr or "")[-1500:])
        raise Rechazo(500, "No pude recortar esa foto")
    h._json({"ruta": destino.relative_to(PRODUCTOS.resolve()).as_posix(), "nombre": nombre_de_archivo(destino.stem), "mtime": int(destino.stat().st_mtime)})


@ruta("POST", "/api/procesar")
def api_procesar(h, q):
    """Procesado en lote: recibe una foto cruda, le quita el fondo con IA y la guarda lista en la carpeta de productos."""
    if not IA_PY:
        raise Rechazo(501, "El recorte automático no está instalado en esta computadora")
    nombre = limpiar_nombre(q.get("nombre") or "producto")
    carpeta = limpiar_ruta_relativa(q.get("carpeta", ""))
    datos = h._cuerpo(30 * 1024 * 1024)
    if not tipo_de_imagen(datos):
        raise Rechazo(415, "Solo se aceptan fotos JPG, PNG o WEBP")
    PRODUCTOS.mkdir(parents=True, exist_ok=True)
    destino_dir = dentro(PRODUCTOS, carpeta) if carpeta else PRODUCTOS.resolve()
    destino_dir.mkdir(parents=True, exist_ok=True)
    tmp = DATOS / "tmp"
    tmp.mkdir(parents=True, exist_ok=True)
    entrada = tmp / f"entrada_{int(time.time() * 1000)}_{os.getpid()}"
    entrada.write_bytes(datos)
    destino = nombre_libre(destino_dir, nombre, ".png")
    try:
        with LOCK_IA:
            r = subprocess.run([IA_PY, str(AQUI / "recortar.py"), str(entrada), str(destino)], capture_output=True, text=True, timeout=240)
    finally:
        try:
            entrada.unlink()
        except OSError:
            pass
    if r.returncode != 0 or not destino.exists():
        registrar("procesar fallido: " + (r.stderr or "")[-1500:])
        raise Rechazo(500, "No pude procesar esa foto (el recorte con IA falló)")
    h._json({"ruta": destino.relative_to(PRODUCTOS.resolve()).as_posix(), "nombre": nombre_de_archivo(destino.stem), "mtime": int(destino.stat().st_mtime)})


@ruta("GET", "/api/estado")
def api_estado_get(h, q):
    h._json(leer_json(DATOS / "estado.json", {"vacio": True}))


@ruta("PUT", "/api/estado")
def api_estado_put(h, q):
    obj = json.loads(h._cuerpo(30 * 1024 * 1024).decode("utf-8"))
    if not isinstance(obj, dict):
        raise Rechazo(400, "Estado no válido")
    escribir_json_atomico(DATOS / "estado.json", obj)
    h._json({"ok": True})


@ruta("GET", "/api/catalogo")
def api_catalogo_get(h, q):
    h._json(leer_json(DATOS / "catalogo.json", {}))


@ruta("PUT", "/api/catalogo")
def api_catalogo_put(h, q):
    obj = json.loads(h._cuerpo(5 * 1024 * 1024).decode("utf-8"))
    if not isinstance(obj, dict):
        raise Rechazo(400, "Catálogo no válido")
    escribir_json_atomico(DATOS / "catalogo.json", obj)
    h._json({"ok": True})


@ruta("POST", "/api/guardar")
def api_guardar(h, q):
    """Guarda un folleto terminado (PNG, JPG o PDF) en el Escritorio, sin pisar archivos que ya existan."""
    datos = h._cuerpo(120 * 1024 * 1024)
    firma = {".png": datos[:8] == b"\x89PNG\r\n\x1a\n", ".jpg": datos[:3] == b"\xff\xd8\xff", ".pdf": datos[:5] == b"%PDF-"}
    ext = "." + (q.get("tipo") or "png").lower().lstrip(".")
    if ext not in firma or not firma[ext]:
        raise Rechazo(415, "El archivo no es un PNG, JPG o PDF válido")
    base = limpiar_nombre(q.get("nombre") or "Folleto")
    if base.lower().endswith(ext):                                  # solo se quita la extensión repetida, no los puntos del medio
        base = base[: -len(ext)].rstrip(" .") or "Folleto"
    ESCRITORIO.mkdir(parents=True, exist_ok=True)
    carpeta = ESCRITORIO
    if q.get("carpeta"):                                            # varias imágenes de un mismo folleto: van juntas en una carpeta del Escritorio
        sub = limpiar_nombre(q.get("carpeta"), 120)
        carpeta = nombre_libre(ESCRITORIO, sub, "") if q.get("nueva") == "1" else dentro(ESCRITORIO, sub)
        carpeta.mkdir(parents=True, exist_ok=True)
    destino = nombre_libre(carpeta, base, ext)
    destino.write_bytes(datos)
    registrar(f"guardado {destino}")
    h._json({"ok": True, "ruta": str(destino), "nombre": destino.name, "carpeta": str(carpeta), "subcarpeta": carpeta.name if carpeta != ESCRITORIO else ""})


def meta_proyecto(p):
    d = leer_json(p, {}) or {}
    fmt = str(d.get("formato", ""))
    titulo = (d.get("coleccion", {}) or {}).get("mensaje") if fmt.startswith("coleccion") else (d.get("mensaje", {}) or {}).get("titulo") if fmt.startswith("mensaje") else d.get("titulo")
    return {"archivo": p.name, "titulo": titulo,
            "formato": d.get("formato"), "tema": d.get("tema"), "mtime": int(p.stat().st_mtime)}


@ruta("GET", "/api/proyectos")
def api_proyectos(h, q):
    PROYECTOS.mkdir(parents=True, exist_ok=True)
    lista = [meta_proyecto(p) for p in PROYECTOS.glob("*.json")]
    lista.sort(key=lambda x: -x["mtime"])
    h._json({"proyectos": lista[:200]})


def archivo_proyecto(q):
    nombre = limpiar_nombre(q.get("archivo", ""))
    if nombre.lower().endswith(".json"):
        nombre = nombre[:-5].rstrip(" .") or "folleto"
    return PROYECTOS / (nombre + ".json")


@ruta("GET", "/api/proyecto")
def api_proyecto_get(h, q):
    p = dentro(PROYECTOS, archivo_proyecto(q).name)
    if not p.is_file():
        raise Rechazo(404, "No encuentro ese folleto")
    h._archivo(p, "application/json; charset=utf-8", "no-store")


@ruta("PUT", "/api/proyecto")
def api_proyecto_put(h, q):
    obj = json.loads(h._cuerpo(30 * 1024 * 1024).decode("utf-8"))
    if not isinstance(obj, dict):
        raise Rechazo(400, "Folleto no válido")
    p = dentro(PROYECTOS, archivo_proyecto(q).name)
    escribir_json_atomico(p, obj)
    h._json({"ok": True, "archivo": p.name})


@ruta("DELETE", "/api/proyecto")
def api_proyecto_delete(h, q):
    p = dentro(PROYECTOS, archivo_proyecto(q).name)
    if p.is_file():
        p.unlink()
    h._json({"ok": True})


@ruta("POST", "/api/abrir-carpeta")
def api_abrir_carpeta(h, q):
    destinos = {"productos": PRODUCTOS, "escritorio": ESCRITORIO}
    d = destinos.get(q.get("cual", ""))
    if d is None:
        raise Rechazo(400, "Carpeta desconocida")
    d.mkdir(parents=True, exist_ok=True)
    h._json({"ok": abrir_con_el_sistema(d)})


@ruta("POST", "/api/abrir-archivo")
def api_abrir_archivo(h, q):
    r = Path(str(q.get("ruta", "")))                                # solo archivos o carpetas que están dentro del Escritorio
    try:
        rel = r.resolve().relative_to(ESCRITORIO.resolve()) if r.is_absolute() else r
    except ValueError:
        raise Rechazo(400, "Ruta no permitida")
    p = dentro(ESCRITORIO, rel)
    if not (p.is_file() or p.is_dir()):
        raise Rechazo(404, "No encuentro ese archivo")
    h._json({"ok": abrir_con_el_sistema(p)})


@ruta("POST", "/api/cerrar")
def api_cerrar(h, q):
    h._json({"ok": True})
    if SERVIDOR is not None:
        threading.Thread(target=SERVIDOR.shutdown, daemon=True).start()


# ───────────────────────── arranque ─────────────────────────
def instancia_en(puerto):
    try:
        opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))
        with opener.open(f"http://127.0.0.1:{puerto}/api/hola", timeout=1.2) as r:
            d = json.loads(r.read().decode("utf-8"))
            return d if d.get("programa") == "rivero-market" else None
    except Exception:
        return None


def abrir_navegador(url):
    if os.environ.get("RIVERO_SIN_ABRIR"):
        return
    try:
        if webbrowser.open(url):
            return
    except Exception:
        pass
    abrir_con_el_sistema(url)


def main():
    global SERVIDOR
    ap = argparse.ArgumentParser(description="Programa de folletos de Rivero Market")
    ap.add_argument("--puerto", type=int, default=None, help="por defecto prueba 8780 a 8789")
    ap.add_argument("--abrir", action="store_true", help="abrir el navegador")
    ap.add_argument("--sin-navegador", action="store_true")
    args = ap.parse_args()
    abrir = args.abrir and not args.sin_navegador
    puertos = [args.puerto] if args.puerto else list(PUERTOS)
    for p in puertos:
        if instancia_en(p):                                           # ya estaba abierto: solo mostrar la pantalla
            if abrir:
                abrir_navegador(f"http://127.0.0.1:{p}/")
            decir(f"El programa ya estaba abierto en http://127.0.0.1:{p}/")
            return 0
    PRODUCTOS.mkdir(parents=True, exist_ok=True)
    DATOS.mkdir(parents=True, exist_ok=True)
    srv, puerto = None, None
    for p in puertos:
        try:
            srv = ThreadingHTTPServer(("127.0.0.1", p), Handler)
            puerto = p
            break
        except OSError:
            continue
    if srv is None:
        avisar_error("No pude abrir el programa: los puertos 8780 a 8789 están ocupados. Cerrá otras copias del programa y probá de nuevo.")
        return 1
    srv.daemon_threads = True
    SERVIDOR = srv
    url = f"http://127.0.0.1:{puerto}/"
    registrar(f"servidor iniciado en {url} · productos={PRODUCTOS} · escritorio={ESCRITORIO} · ia={bool(IA_PY)} · miniaturas={PIL_OK}")
    decir(f"Programa de folletos de Rivero Market en {url}   (para cerrarlo: boton Cerrar programa, o Ctrl+C)")
    if abrir:
        threading.Timer(0.5, abrir_navegador, [url]).start()
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        srv.server_close()
        registrar("servidor cerrado")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except SystemExit:
        raise
    except Exception:
        avisar_error("No pude abrir el programa de folletos.\nDetalle en: " + str(DATOS / "registro.log") + "\n\n" + traceback.format_exc()[-600:])
        sys.exit(1)
