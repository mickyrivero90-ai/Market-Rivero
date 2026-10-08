#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Un GitHub de mentira para probar la herramienta online en la propia PC (sin tocar la cuenta real).

Imita lo que usa la herramienta: la API de git (refs, commits, árboles, blobs), la de contenidos,
/user y raw.githubusercontent.com. Guarda todo en memoria, con huellas SHA-1 de blob iguales a las
de git. Responde CORS como GitHub. Tiene ganchos para las pruebas en /_prueba/… (simular que GitHub
Actions quitó el fondo a las fotos, que otra PC guardó al mismo tiempo, etc.).

    python3 herramientas/pruebas/github_falso.py --puerto 8794 --inicial CARPETA
"""
import argparse
import base64
import hashlib
import io
import json
import re
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, unquote, urlparse

LLAVE_BUENA = re.compile(r"^github_pat_bueno_\w+$")
LLAVE_LECTURA = re.compile(r"^github_pat_lectura_\w+$")
MIME = {".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".json": "application/json; charset=utf-8", ".txt": "text/plain; charset=utf-8"}


def sha_blob(datos):
    return hashlib.sha1(b"blob %d\0" % len(datos) + datos).hexdigest()


class Repo:
    def __init__(self, inicial):
        self.lock = threading.RLock()
        self.blobs, self.arboles, self.commits = {}, {}, {}
        self.n = 0
        self.conflictos = 0          # próximos PATCH de la rama que fallan (como si otra PC hubiera guardado justo antes)
        self.consultas = 0
        arbol = {p: self.guardar_blob(d) for p, d in inicial.items()}
        self.rama = self.nuevo_commit(self.guardar_arbol(arbol), [], "inicial")

    def guardar_blob(self, datos):
        s = sha_blob(datos)
        self.blobs[s] = datos
        return s

    def guardar_arbol(self, plano):
        s = hashlib.sha1(json.dumps(sorted(plano.items())).encode()).hexdigest()
        self.arboles[s] = dict(plano)
        return s

    def nuevo_commit(self, arbol, padres, mensaje):
        self.n += 1
        s = hashlib.sha1(f"{arbol}|{padres}|{mensaje}|{self.n}|{time.time()}".encode()).hexdigest()
        self.commits[s] = {"arbol": arbol, "padres": padres, "mensaje": mensaje}
        return s

    def plano(self, ref=None):
        c = self.commits.get(ref or self.rama)
        return self.arboles[c["arbol"]] if c else None

    def cambiar(self, mensaje, cambios):
        """Commit directo en la rama: {ruta: bytes | None (borrar)}."""
        with self.lock:
            p = dict(self.plano())
            for ruta, datos in cambios.items():
                if datos is None:
                    p.pop(ruta, None)
                else:
                    p[ruta] = self.guardar_blob(datos)
            self.rama = self.nuevo_commit(self.guardar_arbol(p), [self.rama], mensaje)
            return self.rama


class Manejador(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"
    repo = None
    dueno = "prueba"
    nombre = "tienda"

    def log_message(self, *a):
        pass

    def _cors(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Authorization, Content-Type, Accept, X-GitHub-Api-Version, If-None-Match")
        self.send_header("Access-Control-Expose-Headers", "ETag, X-RateLimit-Remaining")
        self.send_header("X-RateLimit-Remaining", "4999")

    def _enviar(self, codigo, cuerpo=b"", tipo="application/json; charset=utf-8", extra=None):
        if isinstance(cuerpo, (dict, list)):
            cuerpo = json.dumps(cuerpo).encode()
        self.send_response(codigo)
        self._cors()
        for k, v in (extra or {}).items():
            self.send_header(k, v)
        if codigo != 304:
            self.send_header("Content-Type", tipo)
        self.send_header("Content-Length", str(len(cuerpo)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        if codigo != 304:
            self.wfile.write(cuerpo)

    def _cuerpo(self):
        return json.loads(self._crudo or b"{}") if self._crudo else {}

    def _llave(self):
        a = self.headers.get("Authorization") or ""
        return a.split(" ", 1)[1].strip() if " " in a else ""

    def _puede_escribir(self):
        llave = self._llave()
        if not llave:
            self._enviar(401, {"message": "Requires authentication"})
            return False
        if LLAVE_LECTURA.match(llave):
            self._enviar(403, {"message": "Resource not accessible by personal access token"})
            return False
        if not LLAVE_BUENA.match(llave):
            self._enviar(401, {"message": "Bad credentials"})
            return False
        return True

    def do_OPTIONS(self):
        self._enviar(204)

    def do_GET(self):
        self._despachar("GET")

    def do_POST(self):
        self._despachar("POST")

    def do_PUT(self):
        self._despachar("PUT")

    def do_PATCH(self):
        self._despachar("PATCH")

    def do_DELETE(self):
        self._despachar("DELETE")

    def _despachar(self, metodo):
        n = int(self.headers.get("Content-Length") or 0)                 # siempre se lee el cuerpo: si no, la conexión siguiente queda rota
        self._crudo = self.rfile.read(n) if n else b""
        u = urlparse(self.path)
        q = {k: v[0] for k, v in parse_qs(u.query).items()}
        ruta = unquote(u.path)
        R = self.repo
        R.consultas += 1
        try:
            with R.lock:
                return self._ruta(metodo, ruta, q, R)
        except Exception as e:
            import traceback
            traceback.print_exc()
            self._enviar(500, {"message": str(e)})

    def _ruta(self, metodo, ruta, q, R):
        base = f"/repos/{self.dueno}/{self.nombre}"
        # ── raw.githubusercontent.com ──
        m = re.match(rf"^/raw/{self.dueno}/{self.nombre}/([^/]+)/(.+)$", ruta)
        if m and metodo == "GET":
            ref = R.rama if m.group(1) == "main" else m.group(1)
            p = R.plano(ref)
            if p is None or m.group(2) not in p:
                return self._enviar(404, b"404: Not Found", "text/plain")
            return self._enviar(200, R.blobs[p[m.group(2)]], MIME.get(Path(m.group(2)).suffix.lower(), "application/octet-stream"))
        if ruta == "/user" and metodo == "GET":
            llave = self._llave()
            if LLAVE_BUENA.match(llave) or LLAVE_LECTURA.match(llave):
                return self._enviar(200, {"login": "dueno-de-prueba"})
            return self._enviar(401, {"message": "Bad credentials"})
        # ── ganchos de las pruebas ──
        if ruta == "/_prueba/arbol":
            return self._enviar(200, {"rama": R.rama, "archivos": {k: len(R.blobs[v]) for k, v in R.plano().items()}, "consultas": R.consultas})
        if ruta == "/_prueba/archivo":
            p = R.plano()
            return self._enviar(200, R.blobs[p[q["ruta"]]], "application/octet-stream") if q.get("ruta") in p else self._enviar(404, {"message": "no"})
        if ruta == "/_prueba/conflicto" and metodo == "POST":
            R.conflictos = int(q.get("n", "1"))
            return self._enviar(200, {"ok": True})
        if ruta == "/_prueba/poner" and metodo == "POST":            # otra PC guarda un archivo
            c = self._cuerpo()
            R.cambiar(c.get("mensaje", "otra PC"), {c["ruta"]: c["texto"].encode("utf-8")})
            return self._enviar(200, {"ok": True, "rama": R.rama})
        if ruta == "/_prueba/procesar" and metodo == "POST":         # lo que hace GitHub Actions con productos/_entrada
            from PIL import Image
            cambios = {}
            for ruta_e, s in list(R.plano().items()):
                if not ruta_e.startswith("productos/_entrada/"):
                    continue
                rel = ruta_e[len("productos/_entrada/"):]
                cambios[ruta_e] = None
                try:
                    im = Image.open(io.BytesIO(R.blobs[s])).convert("RGBA")
                    px = im.load()
                    for x in range(im.width):                         # un borde transparente: "sin fondo"
                        px[x, 0] = (0, 0, 0, 0)
                    b = io.BytesIO()
                    im.save(b, "PNG")
                    cambios["productos/" + re.sub(r"\.[^.]+$", ".png", rel)] = b.getvalue()
                except Exception:
                    pass
            if cambios:
                R.cambiar("Fotos sin fondo (IA)", cambios)
            return self._enviar(200, {"procesadas": sum(1 for v in cambios.values() if v is not None)})
        # ── API de GitHub ──
        if ruta == base and metodo == "GET":
            return self._enviar(200, {"name": self.nombre, "full_name": f"{self.dueno}/{self.nombre}", "private": False, "default_branch": "main"})
        if ruta == base + "/git/ref/heads/main" and metodo == "GET":
            etag = f'W/"{R.rama}"'
            if self.headers.get("If-None-Match") == etag:
                return self._enviar(304, extra={"ETag": etag})
            return self._enviar(200, {"ref": "refs/heads/main", "object": {"sha": R.rama, "type": "commit"}}, extra={"ETag": etag})
        m = re.match(rf"^{base}/git/commits/([0-9a-f]+)$", ruta)
        if m and metodo == "GET":
            c = R.commits.get(m.group(1))
            return self._enviar(200, {"sha": m.group(1), "tree": {"sha": c["arbol"]}, "parents": [{"sha": p} for p in c["padres"]], "message": c["mensaje"]}) if c else self._enviar(404, {"message": "Not Found"})
        m = re.match(rf"^{base}/git/trees/([0-9a-f]+|main)$", ruta)
        if m and metodo == "GET":
            sha = R.rama if m.group(1) == "main" else m.group(1)
            plano = R.arboles.get(sha) or (R.arboles[R.commits[sha]["arbol"]] if sha in R.commits else None)
            if plano is None:
                return self._enviar(404, {"message": "Not Found"})
            dirs = sorted({"/".join(p.split("/")[:i]) for p in plano for i in range(1, p.count("/") + 1)})
            arbol = [{"path": d, "mode": "040000", "type": "tree", "sha": "0" * 40} for d in dirs] + [{"path": p, "mode": "100644", "type": "blob", "sha": s, "size": len(R.blobs[s])} for p, s in sorted(plano.items())]
            return self._enviar(200, {"sha": sha, "tree": arbol, "truncated": False})
        if ruta == base + "/git/blobs" and metodo == "POST":
            if not self._puede_escribir():
                return
            c = self._cuerpo()
            datos = base64.b64decode(c["content"]) if c.get("encoding") == "base64" else c["content"].encode("utf-8")
            return self._enviar(201, {"sha": R.guardar_blob(datos)})
        if ruta == base + "/git/trees" and metodo == "POST":
            if not self._puede_escribir():
                return
            c = self._cuerpo()
            plano = dict(R.arboles[c["base_tree"]]) if c.get("base_tree") else {}
            for e in c["tree"]:
                if e.get("sha") is None:
                    if e["path"] not in plano:
                        return self._enviar(422, {"message": "tree.sha null for missing path"})
                    plano.pop(e["path"])
                elif e["sha"] not in R.blobs:
                    return self._enviar(422, {"message": "tree.sha is not a valid blob"})
                else:
                    plano[e["path"]] = e["sha"]
            return self._enviar(201, {"sha": R.guardar_arbol(plano)})
        if ruta == base + "/git/commits" and metodo == "POST":
            if not self._puede_escribir():
                return
            c = self._cuerpo()
            return self._enviar(201, {"sha": R.nuevo_commit(c["tree"], c.get("parents", []), c.get("message", ""))})
        if ruta == base + "/git/refs/heads/main" and metodo == "PATCH":
            if not self._puede_escribir():
                return
            c = self._cuerpo()
            if R.conflictos > 0:                                      # otra PC guardó justo antes
                R.conflictos -= 1
                R.cambiar("otra PC guardó algo", {f"datos/otra-pc-{R.n}.txt": b"hola"})
            nuevo = R.commits.get(c["sha"])
            if not nuevo:
                return self._enviar(422, {"message": "Object does not exist"})
            if R.rama not in nuevo["padres"] and not c.get("force"):
                return self._enviar(422, {"message": "Update is not a fast forward"})
            R.rama = c["sha"]
            return self._enviar(200, {"ref": "refs/heads/main", "object": {"sha": R.rama}})
        m = re.match(rf"^{base}/contents/(.+)$", ruta)
        if m:
            path, plano = m.group(1), R.plano()
            if metodo == "GET":
                if path not in plano:
                    return self._enviar(404, {"message": "Not Found"})
                datos = R.blobs[plano[path]]
                if "raw" in (self.headers.get("Accept") or ""):
                    return self._enviar(200, datos, "application/octet-stream")
                return self._enviar(200, {"type": "file", "path": path, "sha": plano[path], "size": len(datos), "encoding": "base64", "content": base64.b64encode(datos).decode()})
            if not self._puede_escribir():
                return
            c = self._cuerpo()
            if metodo == "PUT":
                if path in plano and c.get("sha") != plano[path]:
                    return self._enviar(409 if c.get("sha") else 422, {"message": "does not match" if c.get("sha") else "sha wasn't supplied"})
                datos = base64.b64decode(c["content"])
                rama = R.cambiar(c.get("message", ""), {path: datos})
                return self._enviar(201 if path not in plano else 200, {"content": {"path": path, "sha": sha_blob(datos), "size": len(datos)}, "commit": {"sha": rama}})
            if metodo == "DELETE":
                if path not in plano:
                    return self._enviar(404, {"message": "Not Found"})
                if c.get("sha") != plano[path]:
                    return self._enviar(409, {"message": "does not match"})
                rama = R.cambiar(c.get("message", ""), {path: None})
                return self._enviar(200, {"commit": {"sha": rama}})
        return self._enviar(404, {"message": "Not Found (github_falso)"})


def cargar_inicial(carpeta):
    base = Path(carpeta)
    return {p.relative_to(base).as_posix(): p.read_bytes() for p in sorted(base.rglob("*")) if p.is_file()} if base.is_dir() else {}


def arrancar(puerto, inicial, dueno="prueba", nombre="tienda"):
    """Arranca el servidor en un hilo y lo devuelve (para usarlo desde las pruebas)."""
    Manejador.repo = Repo(inicial)
    Manejador.dueno, Manejador.nombre = dueno, nombre
    srv = ThreadingHTTPServer(("127.0.0.1", puerto), Manejador)
    srv.daemon_threads = True
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--puerto", type=int, default=8794)
    ap.add_argument("--inicial", help="carpeta con los archivos iniciales del repositorio")
    a = ap.parse_args()
    s = arrancar(a.puerto, cargar_inicial(a.inicial) if a.inicial else {})
    print(f"GitHub de mentira en http://127.0.0.1:{a.puerto} (Ctrl+C para cerrar)")
    try:
        threading.Event().wait()
    except KeyboardInterrupt:
        s.shutdown()
