// ───────────────────────── la nube: GitHub guarda las fotos, los precios y los folletos ─────────────────────────
// La herramienta online (GitHub Pages) usa el repositorio del negocio como depósito compartido entre computadoras:
//   productos/…               fotos de productos (la misma carpeta que usa el programa local)
//   productos/_entrada/…      fotos que esperan que GitHub les quite el fondo con IA (.github/workflows/publicar.yml)
//   datos/catalogo.json       memoria de precios (el último precio de cada foto)
//   datos/proyectos/*.json    «Mis folletos»
//   datos/borradores/*.json   el folleto en curso de cada computadora (para seguirlo en la otra)
// Leer no necesita nada (el repositorio es público). Para guardar hace falta una llave de GitHub (token
// «fine-grained» con Contents: Read and write sobre este repositorio) que queda solo en el navegador de cada PC.
const NUBE_CFG = (() => {
  const c = typeof window !== 'undefined' ? window.RM_NUBE : null;
  if (!c || !c.owner || !c.repo) return null;
  const cfg = { api: 'https://api.github.com', raw: 'https://raw.githubusercontent.com', rama: 'main', ...c };
  try {                                                            // solo para pruebas en la propia PC: un GitHub de mentira
    const q = new URLSearchParams(location.search);
    if (/^(127\.0\.0\.1|localhost)$/.test(location.hostname)) { if (q.get('nube_api')) cfg.api = q.get('nube_api'); if (q.get('nube_raw')) cfg.raw = q.get('nube_raw'); }
  } catch (e) { /* sin parámetros */ }
  return cfg;
})();
const CLAVE = { llave: 'rm.github.llave', llaveFecha: 'rm.github.llave.fecha', usuario: 'rm.github.usuario', pc: 'rm.pc.id', nombrePC: 'rm.pc.nombre', borradorVisto: 'rm.borrador.visto' };
/** Días que dura la llave nueva (GitHub permite hasta 366): pasado ese tiempo hay que crear otra. Se avisa un mes antes. */
const LLAVE_DIAS = 365;
function diasDeLlave() { const f = +LS.get(CLAVE.llaveFecha) || 0; return f ? Math.floor((Date.now() - f) / 86400000) : null; }
const LS = {
  get(k) { try { return localStorage.getItem(k) || ''; } catch (e) { return ''; } },
  set(k, v) { try { if (v) localStorage.setItem(k, v); else localStorage.removeItem(k); } catch (e) { /* navegador sin almacenamiento */ } },
};
const rutaURL = p => String(p).split('/').map(encodeURIComponent).join('/');
const EXT_FOTO = /\.(png|jpe?g|webp|avif|gif|bmp)$/i;
const SUFIJOS_NOMBRE = /\s*\((sin fondo|muestra|recortad[oa])\)\s*$/i;
/** Nombre del producto a partir del nombre del archivo (igual que servidor.py). */
const nombreDeArchivo = stem => stem.replace(/_/g, ' ').replace(SUFIJOS_NOMBRE, '').replace(/\s+/g, ' ').trim() || stem;
/** Nombre de archivo seguro en Windows, Linux y GitHub (igual que limpiar_nombre de servidor.py). */
function limpiarNombre(s, largo = 140) {
  const t = String(s || '').normalize('NFC').replace(/[\x00-\x1f<>:"/\\|?*]/g, ' ').replace(/\s+/g, ' ').replace(/^[\s.]+|[\s.]+$/g, '');
  return t.slice(0, largo).replace(/[\s.]+$/g, '') || 'sin nombre';
}
/** Subcarpeta (categoría) segura: sin "..", sin carpetas ocultas. */
const limpiarRuta = r => String(r || '').split(/[\\/]+/).map(x => x.trim().replace(/^[._]+/, '')).filter(Boolean).map(x => limpiarNombre(x, 60)).join('/');
const esperar = ms => new Promise(r => setTimeout(r, ms));
function bytesABase64(u8) { let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s); }
const textoABase64 = t => bytesABase64(new TextEncoder().encode(t));
const base64ATexto = b => new TextDecoder().decode(Uint8Array.from(atob(String(b).replace(/\s+/g, '')), c => c.charCodeAt(0)));
const blobABase64 = blob => new Promise((res, rej) => { const fr = new FileReader(); fr.onload = () => res(String(fr.result).split(',')[1] || ''); fr.onerror = () => rej(fr.error); fr.readAsDataURL(blob); });
function haceCuanto(ts) {
  const m = Math.round((Date.now() - ts) / 60000);
  if (m < 1) return 'recién'; if (m < 60) return `hace ${m} min`;
  const h = Math.round(m / 60); if (h < 24) return `hace ${h} ${h === 1 ? 'hora' : 'horas'}`;
  const d = new Date(ts); return `el ${fechaLinda(d)}`;
}

class ErrorNube extends Error { constructor(codigo, mensaje, status) { super(mensaje); this.codigo = codigo; this.status = status || 0; } }
async function errorDeGitHub(r, metodo) {
  let m = ''; try { m = (await r.json()).message || ''; } catch (e) { /* sin detalle */ }
  const s = r.status, limite = r.headers.get('X-RateLimit-Remaining') === '0';
  if (s === 401) return new ErrorNube('llave', 'GitHub no reconoce la llave guardada en esta computadora (venció o se borró). Tocá «☁» arriba y conectá de nuevo.', s);
  if ((s === 403 || s === 429) && limite) return new ErrorNube('limite', 'GitHub pidió esperar un rato porque hubo muchas consultas. Probá de nuevo en unos minutos' + (NUBE.llave ? '.' : ' o conectá tu cuenta (así hay mucho más margen).'), s);
  if (s === 403 || (s === 404 && metodo !== 'GET')) return new ErrorNube('permiso', `GitHub no dejó guardar: la llave no tiene permiso de escritura sobre «${NUBE.cfg.repo}». Creá una llave nueva (☁ → Conectar) con ese repositorio marcado.`, s);
  if (s === 404) return new ErrorNube('no-existe', 'No lo encontré en GitHub.', s);
  if (s === 409 || s === 422) return new ErrorNube('conflicto', 'Otra computadora guardó al mismo tiempo. ' + m, s);
  if (s >= 500) return new ErrorNube('github', `GitHub tuvo un problema momentáneo (${s}). Probá de nuevo en un minuto.`, s);
  return new ErrorNube('otro', 'GitHub respondió: ' + (m || 'error ' + s), s);
}

/** Une dos memorias de precios: por producto gana el dato más nuevo; los historiales se juntan. */
function unirCatalogos(a, b) {
  const out = { ...(a || {}) };
  for (const [k, v] of Object.entries(b || {})) {
    if (!v || typeof v !== 'object') continue;
    const w = out[k], gana = !w || (v.ts || 0) >= (w.ts || 0) ? v : w;
    const vistos = new Map();
    [...((w && w.hist) || []), ...(v.hist || [])].forEach(x => { if (x && x.ts) vistos.set(x.ts + '|' + x.final, x); });
    out[k] = { ...gana, hist: [...vistos.values()].sort((x, y) => x.ts - y.ts).slice(-12) };
  }
  return out;
}
/** "2026-10-03_142530 Especial Día de la Madre - 2026-10-18.json" → datos para «Mis folletos». */
function metaDeNombre(archivo) {
  const base = archivo.replace(/\.json$/i, ''), m = /^(\d{4})-(\d{2})-(\d{2})_(\d{2})(\d{2})(\d{2})\s+(.*)$/.exec(base);
  const mtime = m ? Math.round(new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]).getTime() / 1000) : 0;
  return { archivo, titulo: m ? m[7] : base, formato: null, mtime };
}

const NUBE = {
  activo: !!NUBE_CFG, cfg: NUBE_CFG,
  llave: '', usuario: '', puedeEscribir: false, llaveMala: false, sinRed: false,
  pc: '', nombrePC: '',
  commit: null, arbol: null, momento: 0, _etag: null, _refrescando: null, ultimoError: null,
  manif: null, miniLocal: new Map(), _sha: new Map(), consultasRestantes: null,
  borradorTs: 0, _ultimoBorrador: '', _vigilando: null, _vigilaDesde: 0,

  async iniciar() {
    if (!this.activo) return false;
    this.llave = LS.get(CLAVE.llave); this.usuario = LS.get(CLAVE.usuario);
    this.pc = LS.get(CLAVE.pc) || ('pc-' + uid()); LS.set(CLAVE.pc, this.pc);
    this.nombrePC = LS.get(CLAVE.nombrePC);
    this.puedeEscribir = !!this.llave;
    if (this.llave && !LS.get(CLAVE.llaveFecha)) LS.set(CLAVE.llaveFecha, String(Date.now()));   // llaves de antes (sin vencimiento): se cuenta desde hoy y se avisa en 11 meses
    await Promise.all([this.cargarManifiesto(), this.refrescar().catch(e => { this.ultimoError = e; })]);
    if (this.llave) {
      try { const u = await this.gh('GET', this.cfg.api + '/user'); this.usuario = u.login; LS.set(CLAVE.usuario, u.login); }
      catch (e) { if (e.codigo === 'llave') { this.llaveMala = true; this.puedeEscribir = false; } }
    }
    return true;
  },

  // ── conversación con GitHub ──
  async gh(metodo, ruta, cuerpo, op = {}) {
    const C = this.cfg, url = /^https?:/.test(ruta) ? ruta : `${C.api}/repos/${rutaURL(C.owner)}/${rutaURL(C.repo)}${ruta}`;
    const llave = op.llave !== undefined ? op.llave : this.llave;
    const cab = { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', ...(op.cab || {}) };
    if (llave) cab.Authorization = 'Bearer ' + llave;
    if (cuerpo !== undefined) cab['Content-Type'] = 'application/json';
    let r;
    try { r = await fetch(url, { method: metodo, headers: cab, body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo), cache: 'no-store' }); }
    catch (e) { if (!this.sinRed) { this.sinRed = true; this.pintarEstado(); } throw new ErrorNube('red', 'No pude conectarme con GitHub. Revisá que haya internet y probá de nuevo.'); }
    if (this.sinRed) { this.sinRed = false; this.pintarEstado(); }
    const rest = r.headers.get('X-RateLimit-Remaining'); if (rest != null) this.consultasRestantes = +rest;
    if (r.status === 304) return op.respuesta ? { status: 304, json: null, headers: r.headers } : null;
    if (!r.ok) throw await errorDeGitHub(r, metodo);
    const json = r.status === 204 ? null : await r.json().catch(() => null);
    return op.respuesta ? { status: r.status, json, headers: r.headers } : json;
  },
  exigirLlave() {
    if (!this.llave || this.llaveMala) throw new ErrorNube('sin-llave', this.llaveMala ? 'La llave de GitHub de esta computadora ya no sirve. Tocá «☁ Reconectar» arriba.' : 'Para guardar en la nube, primero conectá tu cuenta de GitHub (botón «☁ Conectar» de arriba).');
  },
  /** Trae la lista de archivos del repositorio (si cambió). Con ETag: si no cambió nada, GitHub responde 304 y no gasta consultas. */
  async refrescar(forzar = false) {
    if (this._refrescando) return this._refrescando;
    this._refrescando = (async () => {
      const cab = !forzar && this._etag && this.arbol ? { 'If-None-Match': this._etag } : {};
      const r = await this.gh('GET', `/git/ref/heads/${rutaURL(this.cfg.rama)}`, undefined, { cab, respuesta: true });
      if (r.status === 304 && this.arbol) { this.momento = Date.now(); return false; }
      const sha = r.json.object.sha; this._etag = r.headers.get('ETag') || null;
      if (sha === this.commit && this.arbol) { this.momento = Date.now(); return false; }
      let t;
      try { t = await this.gh('GET', `/git/trees/${sha}?recursive=1`); }
      catch (e) { const c = await this.gh('GET', `/git/commits/${sha}`); t = await this.gh('GET', `/git/trees/${c.tree.sha}?recursive=1`); }
      this.arbol = new Map((t.tree || []).filter(e => e.type === 'blob').map(e => [e.path, { sha: e.sha, tam: e.size || 0 }]));
      this.commit = sha; this.momento = Date.now(); this.ultimoError = null;
      this.alCambiar();
      return true;
    })().finally(() => { this._refrescando = null; });
    return this._refrescando;
  },
  async cargarManifiesto() {
    try {
      const r = await fetch('catalogo/productos.json', { cache: 'no-cache' });
      if (!r.ok) return;
      const j = await r.json();
      this.manif = { commit: j.commit || null, porRuta: new Map((j.productos || []).map(p => [p.ruta, p])) };
    } catch (e) { /* sin lista armada: se usan las fotos completas */ }
  },

  // ── fotos de productos ──
  async productos(forzar = false) {
    if (forzar || !this.arbol || Date.now() - this.momento > 12000) await this.refrescar().catch(e => { this.ultimoError = e; });
    const lista = [];
    const agregar = (path, sha, tam) => {
      if (!path.startsWith('productos/')) return;
      const rel = path.slice(10), partes = rel.split('/'), archivo = partes.pop();
      if (!EXT_FOTO.test(archivo) || archivo.startsWith('.')) return;
      const pendiente = partes[0] === '_entrada', dirs = pendiente ? partes.slice(1) : partes;
      if (dirs.some(d => d.startsWith('.') || d.startsWith('_'))) return;
      lista.push({ ruta: rel, nombre: nombreDeArchivo(archivo.replace(/\.[^.]+$/, '')), categoria: dirs.join('/'), mtime: sha, tam, pendiente });
    };
    if (this.arbol) for (const [path, e] of this.arbol) agregar(path, e.sha, e.tam);
    else if (this.manif) for (const [ruta, m] of this.manif.porRuta) agregar('productos/' + ruta, m.sha, m.tam);
    else if (this.ultimoError) throw this.ultimoError;
    lista.sort((a, b) => sinTildes(a.nombre).localeCompare(sinTildes(b.nombre), 'es') || (a.ruta < b.ruta ? -1 : 1));
    return { carpeta: `GitHub · ${this.cfg.repo}/productos`, productos: lista.filter(x => !x.pendiente), pendientes: lista.filter(x => x.pendiente) };
  },
  /** Si una foto cambió de extensión (la IA la pasa de .jpg a .png), la encuentra con su nombre nuevo. */
  rutaReal(ruta) {
    const hay = r => (this.arbol ? this.arbol.has('productos/' + r) : this.manif ? this.manif.porRuta.has(r) : true);
    if (!ruta || hay(ruta)) return ruta;
    const base = ruta.replace(/\.[^./]+$/, '');
    for (const ext of ['.png', '.webp', '.jpg', '.jpeg']) if (hay(base + ext)) return base + ext;
    return ruta;
  },
  urlImagen(ruta) {
    ruta = this.rutaReal(ruta);                                     // la copia de la página (mismo sitio, sin el límite de raw.githubusercontent.com) si está al día
    const m = this.manif && this.manif.porRuta.get(ruta), actual = this.arbol ? (this.arbol.get('productos/' + ruta) || {}).sha : null;
    if (m && m.foto && (!actual || actual === m.sha)) return m.foto;
    const ref = this.commit || (this.manif && this.manif.commit) || this.cfg.rama;
    return `${this.cfg.raw}/${rutaURL(this.cfg.owner)}/${rutaURL(this.cfg.repo)}/${ref}/productos/${rutaURL(this.rutaReal(ruta))}`;
  },
  urlMiniatura(ruta, v) {
    const loc = this.miniLocal.get(ruta); if (loc) return loc;
    ruta = this.rutaReal(ruta);
    const m = this.manif && this.manif.porRuta.get(ruta), actual = this.arbol ? (this.arbol.get('productos/' + ruta) || {}).sha : null;
    if (m && m.mini && (!actual || actual === m.sha)) return 'catalogo/' + m.mini;
    return this.urlImagen(ruta, v);
  },
  listaPendientes() { return this.arbol ? [...this.arbol.keys()].filter(p => p.startsWith('productos/_entrada/') && EXT_FOTO.test(p)) : []; },

  /** Guarda varios archivos en un solo cambio (commit). `preparar(base)` arma la lista y se vuelve a llamar si otra PC guardó en el medio. */
  async commitear(mensaje, preparar, op = {}) {
    this.exigirLlave();
    const rama = rutaURL(this.cfg.rama);
    for (let intento = 0; intento < 5; intento++) {
      const base = (await this.gh('GET', `/git/ref/heads/${rama}`)).object.sha;
      const cambios = await preparar(base, intento);
      if (!cambios || !cambios.length) return null;
      const subir = cambios.filter(c => !c.sha);
      for (let i = 0; i < subir.length; i++) {
        const c = subir[i];
        if (op.progreso) op.progreso(i, subir.length);
        c.sha = (await this.gh('POST', '/git/blobs', c.texto != null ? { content: c.texto, encoding: 'utf-8' } : { content: await blobABase64(c.blob), encoding: 'base64' })).sha;
      }
      if (op.progreso) op.progreso(subir.length, subir.length);
      const bc = await this.gh('GET', `/git/commits/${base}`);
      const t = await this.gh('POST', '/git/trees', { base_tree: bc.tree.sha, tree: cambios.map(c => ({ path: c.ruta, mode: '100644', type: 'blob', sha: c.sha })) });
      const nc = await this.gh('POST', '/git/commits', { message: mensaje, tree: t.sha, parents: [base] });
      try { await this.gh('PATCH', `/git/refs/heads/${rama}`, { sha: nc.sha, force: false }); }
      catch (e) { if (e.codigo === 'conflicto') { await esperar(500 * (intento + 1)); continue; } throw e; }
      if (this.arbol && this.commit === base) {                      // el árbol que teníamos + estos cambios = el nuevo
        for (const c of cambios) this.arbol.set(c.ruta, { sha: c.sha, tam: c.tam || (c.blob ? c.blob.size : (c.texto || '').length) });
        this.commit = nc.sha; this._etag = null; this.momento = Date.now(); this.alCambiar();
      } else { this._etag = null; await this.refrescar(true).catch(() => {}); }
      return { commit: nc.sha, cambios };
    }
    throw new ErrorNube('conflicto', 'Otra computadora estaba guardando al mismo tiempo y no pude terminar. Probá de nuevo en un ratito.');
  },
  /** Un solo archivo de texto (API de contenidos: una sola consulta). */
  async escribirArchivo(ruta, texto, mensaje) {
    this.exigirLlave();
    for (let i = 0; i < 3; i++) {
      const sha = this._sha.get(ruta) || (this.arbol && (this.arbol.get(ruta) || {}).sha);
      try {
        const r = await this.gh('PUT', `/contents/${rutaURL(ruta)}`, { message: mensaje, content: textoABase64(texto), branch: this.cfg.rama, ...(sha ? { sha } : {}) });
        this._sha.set(ruta, r.content.sha); if (this.arbol) this.arbol.set(ruta, { sha: r.content.sha, tam: r.content.size || texto.length });
        this._etag = null;
        return r;
      } catch (e) {
        if (e.codigo !== 'conflicto') throw e;
        let actual = null;
        try { actual = await this.gh('GET', `/contents/${rutaURL(ruta)}?ref=${rutaURL(this.cfg.rama)}`); } catch (err) { if (err.codigo !== 'no-existe') throw err; }
        if (actual) this._sha.set(ruta, actual.sha); else this._sha.delete(ruta);
        if (this.arbol) { if (actual) this.arbol.set(ruta, { sha: actual.sha, tam: actual.size }); else this.arbol.delete(ruta); }
      }
    }
    throw new ErrorNube('conflicto', 'No pude guardar porque otra computadora lo estaba cambiando. Probá de nuevo.');
  },
  async borrar(ruta, mensaje) {
    this.exigirLlave();
    for (let i = 0; i < 3; i++) {
      let info;
      try { info = await this.gh('GET', `/contents/${rutaURL(ruta)}?ref=${rutaURL(this.cfg.rama)}`); } catch (e) { if (e.codigo === 'no-existe') { if (this.arbol) this.arbol.delete(ruta); return false; } throw e; }
      try {
        await this.gh('DELETE', `/contents/${rutaURL(ruta)}`, { message: mensaje, sha: info.sha, branch: this.cfg.rama });
        if (this.arbol) this.arbol.delete(ruta); this._sha.delete(ruta); this._etag = null; this.alCambiar();
        return true;
      } catch (e) { if (e.codigo !== 'conflicto') throw e; }
    }
    throw new ErrorNube('conflicto', 'No pude borrarlo porque otra computadora lo estaba cambiando. Probá de nuevo.');
  },
  async leerTexto(ruta, ref) {
    if (!ref && this.arbol && !this.arbol.has(ruta)) return null;
    ref = ref || this.commit || this.cfg.rama;
    let r = null;
    try { r = await fetch(`${this.cfg.raw}/${rutaURL(this.cfg.owner)}/${rutaURL(this.cfg.repo)}/${ref}/${rutaURL(ruta)}`, { cache: ref === this.cfg.rama ? 'no-store' : 'default' }); } catch (e) { r = null; }
    if (r && r.ok) return r.text();
    if (r && r.status === 404) return null;
    try { const j = await this.gh('GET', `/contents/${rutaURL(ruta)}?ref=${encodeURIComponent(ref)}`); return base64ATexto(j.content); }   // respaldo: repositorio privado o sin acceso a raw
    catch (e) { if (e.codigo === 'no-existe') return null; throw e; }
  },
  async leerJSON(ruta, ref) { const t = await this.leerTexto(ruta, ref); if (t == null) return null; try { return JSON.parse(t); } catch (e) { return null; } },

  // ── memoria de precios ──
  async leerCatalogo() { return (await this.leerJSON('datos/catalogo.json')) || {}; },
  /** Junta lo de esta PC con lo que haya en la nube (otra PC pudo guardar precios) y lo guarda. Devuelve la memoria unida. */
  async guardarCatalogo(local, mensaje = 'Precios recordados') {
    let unido = local;
    await this.commitear(mensaje, async base => {
      const remoto = (await this.leerJSON('datos/catalogo.json', base)) || {};
      unido = unirCatalogos(remoto, local);
      const texto = JSON.stringify(unido);
      return texto === JSON.stringify(remoto) ? [] : [{ ruta: 'datos/catalogo.json', texto }];
    });
    return unido;
  },

  // ── «Mis folletos» y folletos en curso ──
  async listarProyectos() {
    await this.refrescar().catch(e => { if (!this.arbol) throw e; });
    const lista = [];
    for (const path of this.arbol.keys()) { const m = /^datos\/proyectos\/([^/]+\.json)$/i.exec(path); if (m) lista.push(metaDeNombre(m[1])); }
    return lista.sort((a, b) => b.mtime - a.mtime || (a.archivo < b.archivo ? 1 : -1)).slice(0, 300);
  },
  leerProyecto(archivo) { return this.leerJSON('datos/proyectos/' + archivo); },
  guardarProyecto(nombre, estado) { const archivo = limpiarNombre(nombre.replace(/\.json$/i, ''), 150) + '.json'; return this.escribirArchivo('datos/proyectos/' + archivo, JSON.stringify(estado), 'Mis folletos: ' + archivo.replace(/\.json$/, '')).then(() => archivo); },
  borrarProyecto(archivo) { return this.borrar('datos/proyectos/' + archivo, 'Mis folletos: borrar ' + archivo.replace(/\.json$/, '')); },
  rutaBorrador() { return `datos/borradores/${this.pc}.json`; },
  /** El folleto en curso de esta PC queda también en la nube (cada 10 minutos o al salir), para seguirlo en la otra. */
  programarBorrador: null,
  async guardarBorrador() {
    if (!this.puedeEscribir || !S || !hayContenido()) return false;
    const estado = estadoParaGuardar(S), txt = JSON.stringify(estado);
    if (txt === this._ultimoBorrador) return false;
    const ts = Date.now();
    await this.escribirArchivo(this.rutaBorrador(), JSON.stringify({ pc: this.pc, nombre: this.nombrePC || 'otra computadora', ts, estado }), `Folleto en curso (${this.nombrePC || this.pc})`);
    this._ultimoBorrador = txt; this.borradorTs = ts; this.pintarEstado();
    return true;
  },
  async borradoresDeOtras() {
    if (!this.arbol) return [];
    const rutas = [...this.arbol.keys()].filter(p => /^datos\/borradores\/[^/]+\.json$/.test(p) && p !== this.rutaBorrador());
    return (await Promise.all(rutas.map(p => this.leerJSON(p).catch(() => null)))).filter(b => b && b.estado && b.ts);
  },

  // ── subir fotos ──
  /** Sube fotos nuevas a la carpeta de productos. Con `conIA`, van a productos/_entrada y GitHub les quita el fondo (1 a 3 minutos). */
  async subirFotos(items, carpeta, op = {}) {
    this.exigirLlave();
    await this.refrescar(true).catch(() => {});
    const cat = limpiarRuta(carpeta), prep = [];
    for (let i = 0; i < items.length; i++) {
      if (op.progreso) op.progreso(i, items.length, 'preparar');
      const it = items[i];
      try { const img = await prepararFotoParaSubir(it.file, it.conIA); prep.push({ ...it, ...img, conIA: !!it.conIA && !img.alfa }); }
      catch (e) { prep.push({ ...it, error: e.message || 'No pude leer esa foto' }); }
    }
    const ok = prep.filter(x => !x.error);
    const ocupadas = new Set(this.arbol ? this.arbol.keys() : []);
    const libre = (dir, base, ext, alt) => {
      for (let n = 1; ; n++) {
        const nom = base + (n > 1 ? ` (${n})` : ''), p = `${dir}/${nom}${ext}`;
        if (!ocupadas.has(p) && !(alt && [...ocupadas].some(o => o.startsWith(`${alt}/${nom}.`)))) { ocupadas.add(p); return nom; }
      }
    };
    const dirFinal = 'productos' + (cat ? '/' + cat : ''), dirEntrada = 'productos/_entrada' + (cat ? '/' + cat : '');
    for (const x of ok) {
      const base = limpiarNombre(x.nombre || 'producto', 120);
      const dF = x.subcarpeta ? `${dirFinal}/${limpiarRuta(x.subcarpeta)}` : dirFinal, dE = x.subcarpeta ? `${dirEntrada}/${limpiarRuta(x.subcarpeta)}` : dirEntrada;
      if (x.conIA) { const nom = libre(dF, base, '.png', dE); x.ruta = `${dE}/${nom}${x.ext}`; x.rutaFinal = `${dF}/${nom}.png`; }
      else { const nom = libre(dF, base, x.ext); x.ruta = `${dF}/${nom}${x.ext}`; }
    }
    if (ok.length) {
      const nombres = ok.map(x => x.nombre).slice(0, 4).join(', ') + (ok.length > 4 ? ` y ${ok.length - 4} más` : '');
      await this.commitear((ok.some(x => x.conIA) ? 'Fotos nuevas (quitar fondo): ' : 'Fotos nuevas: ') + nombres, async () => ok.map(x => ({ ruta: x.ruta, blob: x.blob, tam: x.blob.size })),
        { progreso: (i, n) => op.progreso && op.progreso(i, n, 'subir') });
    }
    const listos = [], enCola = [];
    for (const x of ok) {
      const rel = x.ruta.slice(10);
      if (x.conIA) { enCola.push({ ruta: x.rutaFinal.slice(10), entrada: rel, nombre: x.nombre }); continue; }
      if (x.mini) this.miniLocal.set(rel, URL.createObjectURL(x.mini));
      listos.push({ ruta: rel, nombre: nombreDeArchivo(rel.split('/').pop().replace(/\.[^.]+$/, '')), mtime: (this.arbol && (this.arbol.get(x.ruta) || {}).sha) || String(Date.now()) });
    }
    if (enCola.length) this.vigilar();
    return { listos, enCola, fallidas: prep.filter(x => x.error) };
  },
  /** Le pide a GitHub que le quite el fondo a una foto que ya está en la nube (sin volver a subirla). */
  async encolarRecorte(ruta) {
    this.exigirLlave();
    await this.refrescar(true).catch(() => {});
    const e = this.arbol && this.arbol.get('productos/' + ruta);
    if (!e) throw new ErrorNube('no-existe', 'No encuentro esa foto en la nube. Elegila de nuevo.');
    const partes = ruta.split('/'), archivo = partes.pop(), dir = partes.join('/'), ext = (/\.[^.]+$/.exec(archivo) || ['.png'])[0];
    const base = archivo.slice(0, -ext.length).replace(SUFIJOS_NOMBRE, '');
    let nom = `${base} (sin fondo)`;
    for (let n = 2; this.arbol.has(`productos/${dir ? dir + '/' : ''}${nom}.png`) || this.arbol.has(`productos/_entrada/${dir ? dir + '/' : ''}${nom}${ext}`); n++) nom = `${base} (${n}) (sin fondo)`;
    const entrada = `_entrada/${dir ? dir + '/' : ''}${nom}${ext}`, final = `${dir ? dir + '/' : ''}${nom}.png`;
    await this.commitear('Quitar fondo: ' + base, async () => [{ ruta: 'productos/' + entrada, sha: e.sha, tam: e.tam }]);
    this.vigilar();
    return { final, entrada };
  },
  /** Mientras haya fotos esperando a la IA, mira cada 20 segundos si ya están listas. */
  vigilar() {
    if (this._vigilando) return;
    this._vigilaDesde = Date.now();
    const paso = async () => {
      this._vigilando = null;
      if (!this.hayEsperas()) return;
      await this.refrescar().catch(() => {});
      this.resolverEsperas();
      if (!this.hayEsperas()) return;
      if (Date.now() - this._vigilaDesde > 20 * 60000) {
        aviso('GitHub está tardando más de lo normal en quitar el fondo de las fotos. Si en un rato no aparecen, mirá «☁ → Ver el trabajo de GitHub».', 9000);
        return;
      }
      this._vigilando = setTimeout(paso, 20000);
    };
    this._vigilando = setTimeout(paso, 15000);
  },
  hayEsperas() { return this.listaPendientes().length > 0 || (S ? [...S.productos, ...S.coleccion.fotos].some(o => o.esperaIA) : false); },
  /** Las fotos del folleto que esperaban el recorte pasan solas a la versión sin fondo. */
  resolverEsperas() {
    if (!S || !this.arbol) return;
    let listas = 0, fallidas = 0;
    for (const o of [...S.productos, ...S.coleccion.fotos]) {
      if (!o.esperaIA) continue;
      const e = this.arbol.get('productos/' + o.esperaIA);
      if (e) { Object.assign(o, { archivo: o.esperaIA, mtime: e.sha, imgV: (o.imgV || 0) + 1, alfa: true, quitarFondo: false }); delete o.esperaIA; delete o.esperaIAentrada; listas++; }
      else if (o.esperaIAentrada && !this.arbol.has('productos/' + o.esperaIAentrada)) { delete o.esperaIA; delete o.esperaIAentrada; fallidas++; }
    }
    if (listas || fallidas) {
      pintarProductos(); cambio();
      aviso(listas ? (listas === 1 ? 'Listo: la foto ya está sin fondo en el folleto.' : `Listo: ${listas} fotos ya están sin fondo en el folleto.`) + (fallidas ? ` A ${fallidas} no se le pudo quitar el fondo.` : '')
        : 'La IA no pudo quitarle el fondo a esa foto: quedó la original. Probá con una foto más clara o con fondo liso.', 6500);
    }
  },

  // ── avisos a la pantalla ──
  oyentes: new Set(),
  alCambiar() { this.oyentes.forEach(fn => { try { fn(); } catch (e) { console.error(e); } }); },
  pintarEstado() { if (DOM.nubeChip) pintarChipNube(); },
};
/** El folleto en curso se sube como mucho cada 10 minutos (y al salir de la pestaña): antes era cada minuto, llenaba el
 *  historial y dejaba ver los precios en el repositorio público antes de publicarlos. */
NUBE.programarBorrador = (() => { let t = null; return () => { if (t) return; t = setTimeout(() => { t = null; NUBE.guardarBorrador().catch(e => { if (e.codigo !== 'red') console.error(e); }); }, 10 * 60000); }; })();

/** Achica la foto si hace falta (no se pierde nada: el folleto usa hasta 1400 px) y arma una miniatura. */
async function prepararFotoParaSubir(file, paraIA) {
  const url = URL.createObjectURL(file);
  try {
    let im;
    try { im = await cargarImagen(url); } catch (e) { throw new Error(`No pude abrir «${file.name}». ¿Es una foto JPG, PNG o WEBP?`); }
    const w0 = im.naturalWidth || im.width, h0 = im.naturalHeight || im.height, max = paraIA ? 2000 : 1600;
    const c = aCanvas(im, max), alfa = tieneAlfa(c);
    const tipo = String(file.type || '').toLowerCase(), extOrig = (/\.(png|jpe?g|webp)$/i.exec(file.name || '') || [''])[0].toLowerCase().replace('.jpeg', '.jpg');
    let blob, ext;
    if (Math.max(w0, h0) <= max && file.size <= 3e6 && /^image\/(png|jpeg|webp)$/.test(tipo) && extOrig) { blob = file; ext = extOrig; }   // ya está bien: se sube tal cual
    else if (alfa) { blob = await aBlob(c, 'image/png'); ext = '.png'; }
    else { blob = await aBlob(c, 'image/jpeg', 0.9); ext = '.jpg'; }
    const mini = await aBlob(aCanvas(c, 360), alfa ? 'image/png' : 'image/jpeg', 0.85);
    return { blob, ext, alfa, mini, w: c.width, h: c.height };
  } finally { URL.revokeObjectURL(url); }
}

// ───────── un solo lugar para "la carpeta de productos": la del programa local o la de la nube ─────────
const CARPETA = {
  get activa() { return API.activo || NUBE.activo; },
  get nube() { return !API.activo && NUBE.activo; },
  get puedeSubir() { return API.activo || (NUBE.activo && NUBE.puedeEscribir); },
  get hayIA() { return API.activo ? !!(API.info && API.info.ia) : NUBE.activo; },
  productos(forzar) { return API.activo ? API.productos() : NUBE.productos(forzar); },
  async leerCatalogo() { return API.activo ? API.json('/api/catalogo') : NUBE.activo ? NUBE.leerCatalogo() : {}; },
  async guardarCatalogo(cat) { if (API.activo) { await API.put('/api/catalogo', cat); return cat; } if (NUBE.activo && NUBE.puedeEscribir) return NUBE.guardarCatalogo(cat); return cat; },
  get guardaFolletos() { return API.activo || (NUBE.activo && NUBE.puedeEscribir); },
  listarProyectos() { return API.activo ? API.json('/api/proyectos').then(r => r.proyectos) : NUBE.listarProyectos(); },
  leerProyecto(archivo) { return API.activo ? API.json('/api/proyecto?archivo=' + encodeURIComponent(archivo)) : NUBE.leerProyecto(archivo); },
  guardarProyecto(nombre, estado) { return API.activo ? API.put('/api/proyecto?archivo=' + encodeURIComponent(nombre), estado) : NUBE.guardarProyecto(nombre, estado); },
  borrarProyecto(archivo) { return API.activo ? API.pedir('DELETE', '/api/proyecto?archivo=' + encodeURIComponent(archivo)) : NUBE.borrarProyecto(archivo); },
};

// ───────── pantalla: estado de la nube (arriba), conectar, traer lo de esta PC ─────────
function pintarChipNube() {
  const b = DOM.nubeChip; if (!b) return;
  let txt, det, cls;
  if (NUBE.sinRed) { txt = '☁ Sin conexión'; det = 'No hay conexión con GitHub. Lo que hagas queda en esta computadora y se sube cuando vuelva internet.'; cls = 'err'; }
  else if (NUBE.llaveMala) { txt = '☁ Reconectar'; det = 'La llave de GitHub de esta computadora ya no sirve. Tocá para cargar una nueva.'; cls = 'err'; }
  else if (!NUBE.puedeEscribir) { txt = '☁ Conectar'; det = 'Conectá tu cuenta de GitHub para guardar fotos, precios y folletos en la nube.'; cls = 'off'; }
  else if (diasDeLlave() >= LLAVE_DIAS - 30) { const q = LLAVE_DIAS - diasDeLlave(); txt = '☁ Renová la llave'; det = q > 0 ? `La llave de GitHub de esta computadora vence en ${q} ${q === 1 ? 'día' : 'días'}. Tocá para crear una nueva (son 2 minutos).` : 'La llave de GitHub de esta computadora ya venció o está por vencer. Tocá para crear una nueva.'; cls = 'off'; }
  else { txt = '☁ En la nube'; det = `Conectado como ${NUBE.usuario || 'tu cuenta'}${NUBE.nombrePC ? ' · esta PC: ' + NUBE.nombrePC : ''}${NUBE.borradorTs ? ' · folleto en curso guardado ' + haceCuanto(NUBE.borradorTs) : ''}`; cls = 'ok'; }
  b.className = 'nube-chip ' + cls; b.textContent = txt; b.title = det; b.setAttribute('aria-label', det);
}
function chipNube() {
  DOM.nubeChip = h('button', { type: 'button', class: 'nube-chip', onclick: () => (NUBE.puedeEscribir && !NUBE.llaveMala && diasDeLlave() < LLAVE_DIAS - 30 ? abrirPanelNube() : abrirConectar()) });
  pintarChipNube();
  return DOM.nubeChip;
}
const urlRepo = (sub = '') => `https://github.com/${NUBE.cfg.owner}/${NUBE.cfg.repo}${sub}`;
function urlNuevaLlave(nombrePC) {
  const d = new Date(), nom = `Folletos Rivero ${nombrePC || 'PC'} ${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`.slice(0, 40);
  const q = new URLSearchParams({ name: nom, description: `Herramienta de folletos (${NUBE.cfg.repo}): guardar fotos, precios y folletos desde ${nombrePC || 'esta computadora'}.`, target_name: NUBE.cfg.owner, expires_in: String(LLAVE_DIAS), contents: 'write' });
  return 'https://github.com/settings/personal-access-tokens/new?' + q.toString();
}
/** Asistente para conectar la cuenta de GitHub (una sola vez en cada computadora). */
function abrirConectar() {
  return new Promise(resolve => {
    let conectado = false;
    const nombres = ['Casa', 'Negocio', 'Celular'];
    const inNombre = h('input', { type: 'text', value: NUBE.nombrePC || '', placeholder: 'Ej.: Casa, Negocio', maxlength: 24, autocomplete: 'off', 'aria-label': 'Nombre de esta computadora' });
    const enlace = h('a', { class: 'btn small primary', href: urlNuevaLlave(NUBE.nombrePC), target: '_blank', rel: 'noopener' }, 'Abrir GitHub para crear la llave ↗');
    inNombre.addEventListener('input', () => { enlace.href = urlNuevaLlave(inNombre.value.trim()); });
    const inLlave = h('input', { type: 'password', placeholder: 'github_pat_…', autocomplete: 'off', spellcheck: 'false', 'aria-label': 'Llave de GitHub' });
    const estado = h('p', { class: 'hint', 'aria-live': 'polite', style: 'margin:0' });
    const btn = h('button', { class: 'btn primary', type: 'button', onclick: async () => {
      const llave = inLlave.value.trim(), nombre = limpiarNombre(inNombre.value.trim() || 'Esta PC', 24);
      if (!/^(github_pat_|ghp_|gho_|ghu_)[A-Za-z0-9_]{20,}$/.test(llave)) { estado.textContent = 'Eso no parece una llave de GitHub: tiene que empezar con «github_pat_». Copiala entera desde GitHub.'; inLlave.focus(); return; }
      btn.disabled = true; btn.textContent = 'Probando la llave…'; estado.textContent = '';
      try {
        const u = await NUBE.gh('GET', NUBE.cfg.api + '/user', undefined, { llave });
        try { await NUBE.gh('POST', '/git/blobs', { content: 'Prueba de la llave de la herramienta de folletos', encoding: 'utf-8' }, { llave }); }
        catch (e) { if (e.codigo === 'permiso' || e.codigo === 'no-existe') throw new ErrorNube('permiso', `La llave funciona, pero no tiene permiso para guardar en «${NUBE.cfg.repo}». En GitHub, en «Repository access», marcá «Only select repositories» → ${NUBE.cfg.repo}, y en «Contents» elegí «Read and write». Después creá la llave de nuevo.`); throw e; }
        Object.assign(NUBE, { llave, usuario: u.login, puedeEscribir: true, llaveMala: false, nombrePC: nombre });
        LS.set(CLAVE.llave, llave); LS.set(CLAVE.usuario, u.login); LS.set(CLAVE.nombrePC, nombre); LS.set(CLAVE.llaveFecha, String(Date.now()));
        conectado = true; m.cerrar();
        pintarChipNube(); construirPanel();
        aviso(`Listo: conectado como ${u.login}. Desde ahora tus fotos, precios y folletos se guardan en la nube.`, 6000);
      } catch (e) { estado.textContent = e.message; btn.disabled = false; btn.textContent = 'Conectar'; }
    } }, 'Conectar');
    const paso = (n, ...kids) => h('li', null, h('b', { class: 'paso-n' }, String(n)), h('div', { class: 'stack' }, ...kids));
    const m = abrirModal({ titulo: NUBE.llaveMala ? 'Volver a conectar con GitHub' : 'Conectar con GitHub', ancho: 640, alCerrar: () => resolve(conectado),
      cuerpo: h('div', { class: 'stack' },
        h('p', { class: 'hint', style: 'margin:0' }, 'Para guardar fotos, precios y «Mis folletos» en la nube (y verlos desde la otra computadora), esta página necesita una llave de tu cuenta de GitHub. Se hace una sola vez en cada computadora.'),
        h('ol', { class: 'pasos-llave' },
          paso(1, h('span', null, '¿Cómo se llama esta computadora?'), inNombre, h('div', { class: 'quick' }, ...nombres.map(n => h('button', { type: 'button', class: 'q', onclick: () => { inNombre.value = n; enlace.href = urlNuevaLlave(n); } }, n)))),
          paso(2, enlace, h('small', { class: 'hint' }, `Si te lo pide, entrá con tu cuenta (${NUBE.cfg.owner}). El nombre de la llave y el permiso «Contents: Read and write» ya vienen puestos.`)),
          paso(3, h('span', null, 'En «Repository access» elegí ', h('b', null, 'Only select repositories'), ' y marcá ', h('b', null, NUBE.cfg.repo), '. Abajo de todo tocá ', h('b', null, 'Generate token'), ' y copiá la llave (empieza con github_pat_).')),
          paso(4, h('span', null, 'Pegá la llave acá:'), inLlave)),
        estado,
        h('p', { class: 'note' }, 'La llave queda guardada solo en este navegador y solo sirve para este repositorio. Si alguna vez querés anularla, borrala en GitHub: Settings → Developer settings → Personal access tokens.')),
      acciones: [h('button', { class: 'btn ghost', type: 'button', onclick: () => m.cerrar() }, 'Cancelar'), btn] });
    inLlave.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); btn.click(); } });
    setTimeout(() => (NUBE.nombrePC ? inLlave : inNombre).focus(), 30);
  });
}
function desconectarNube() {
  return confirmar('¿Desconectar esta computadora?', 'Se borra la llave de GitHub de este navegador. Tus fotos y folletos siguen en la nube; para volver a guardar, conectá de nuevo.', 'Desconectar', 'Cancelar').then(ok => {
    if (!ok) return;
    LS.set(CLAVE.llave, ''); LS.set(CLAVE.usuario, ''); LS.set(CLAVE.llaveFecha, '');
    Object.assign(NUBE, { llave: '', usuario: '', puedeEscribir: false, llaveMala: false });
    pintarChipNube(); construirPanel(); aviso('Listo: esta computadora quedó desconectada de GitHub.');
  });
}
/** Lo mismo que la sección del panel, en una ventana (desde el botón ☁ de arriba). */
function abrirPanelNube() {
  const m = abrirModal({ titulo: '☁ Tu nube (GitHub)', ancho: 620, cuerpo: contenidoNube(() => m.cerrar()) });
}
function contenidoNube(cerrar = () => {}) {
  const C = NUBE.cfg, conectado = NUBE.puedeEscribir && !NUBE.llaveMala;
  const fila = (etq, valor) => h('div', { class: 'info-fila' }, h('span', { class: 'lab' }, etq), h('span', null, valor));
  const pend = NUBE.listaPendientes().length;
  return h('div', { class: 'stack' },
    fila('Estado', conectado ? `Conectado como ${NUBE.usuario || 'tu cuenta'}` : NUBE.llaveMala ? 'La llave de esta PC ya no sirve' : 'Sin conectar (solo para mirar)'),
    conectado ? fila('Esta computadora', NUBE.nombrePC || '—') : null,
    NUBE.borradorTs ? fila('Folleto en curso', 'guardado en la nube ' + haceCuanto(NUBE.borradorTs)) : null,
    pend ? fila('Quitando el fondo', `${pend} ${pend === 1 ? 'foto' : 'fotos'} (GitHub tarda 1 a 3 minutos)`) : null,
    h('div', { class: 'row-actions' },
      conectado ? h('button', { class: 'btn small primary', type: 'button', onclick: () => { cerrar(); abrirTraer(); } }, '⇪ Traer lo de esta PC') : h('button', { class: 'btn small primary', type: 'button', onclick: () => { cerrar(); abrirConectar(); } }, NUBE.llaveMala ? 'Reconectar' : '☁ Conectar con GitHub'),
      conectado ? h('button', { class: 'btn small', type: 'button', onclick: async () => { try { const ok = await NUBE.guardarBorrador(); aviso(ok ? 'Guardé el folleto en curso en la nube.' : 'El folleto en curso ya estaba guardado.'); } catch (e) { aviso(e.message); } } }, 'Guardar el folleto en curso') : null,
      conectado ? h('button', { class: 'btn small danger ghost', type: 'button', onclick: () => { cerrar(); desconectarNube(); } }, 'Desconectar') : null),
    h('div', { class: 'row-actions' },
      h('a', { class: 'btn small ghost', href: urlRepo('/tree/' + C.rama + '/productos'), target: '_blank', rel: 'noopener' }, 'Ver las fotos en GitHub ↗'),
      h('a', { class: 'btn small ghost', href: urlRepo('/actions'), target: '_blank', rel: 'noopener' }, 'Ver el trabajo de GitHub ↗'),
      h('a', { class: 'btn small ghost', href: 'descargas/Rivero-Market-Folletos.zip', download: '' }, 'Programa para usar sin internet (.zip)')),
    h('p', { class: 'note' }, `Todo se guarda en el repositorio ${C.owner}/${C.repo}. Es público: cualquiera con el link puede ver las fotos, los precios y los folletos guardados (son los mismos que publicás). La herramienta se actualiza sola: cuando hay una versión nueva, aparece un aviso arriba.`));
}
function seccionNube() {
  return detalles('☁ Nube: fotos, precios y folletos', contenidoNube());
}

// ───────── traer lo de esta PC (fotos, precios y folletos del programa viejo) ─────────
/** Clasifica los archivos de una carpeta elegida: fotos de productos/, memoria de precios y «Mis folletos». */
function analizarCarpeta(archivos) {
  const fotos = [], proyectos = [], catalogos = [], estados = [];
  const lista = archivos.map(f => ({ f, p: String(f.webkitRelativePath || f.relativo || f.name).replace(/\\/g, '/') }));
  const conProductos = lista.some(x => x.p.split('/').slice(0, -1).some(d => d.toLowerCase() === 'productos'));
  for (const { f, p } of lista) {
    const partes = p.split('/'), nombre = partes[partes.length - 1];
    if (/(^|\/)datos\/catalogo\.json$/i.test(p)) { catalogos.push(f); continue; }
    if (/(^|\/)datos\/proyectos\/[^/]+\.json$/i.test(p)) { proyectos.push({ f, nombre }); continue; }
    if (/(^|\/)programa\/datos\/estado\.json$/i.test(p)) { estados.push(f); continue; }
    if (!/\.(png|jpe?g|webp)$/i.test(nombre) || nombre.startsWith('.')) continue;
    let rel;
    if (conProductos) { const i = partes.findIndex((d, k) => k < partes.length - 1 && d.toLowerCase() === 'productos'); if (i < 0) continue; rel = partes.slice(i + 1); }
    else rel = partes;                                           // eligió directamente una carpeta de fotos: la carpeta es la categoría
    if (rel.slice(0, -1).some(d => d.startsWith('.') || d.startsWith('_'))) continue;
    fotos.push({ f, rel: [...rel.slice(0, -1).map(d => limpiarNombre(d, 60)), limpiarNombre(nombre)].join('/') });
  }
  return { fotos, proyectos, catalogos, estados };
}
async function abrirTraer(op = {}) {
  try { NUBE.exigirLlave(); } catch (e) { aviso(e.message); return abrirConectar(); }
  const input = h('input', { type: 'file', multiple: true, hidden: true, webkitdirectory: '', directory: '' });
  const resumen = h('div', { class: 'stack' }, h('p', { class: 'hint', style: 'margin:0' }, 'Todavía no elegiste ninguna carpeta.'));
  let plan = null, conIA = true;
  const btnSubir = h('button', { class: 'btn primary', type: 'button', disabled: true, onclick: () => subirPlan() }, 'Subir a la nube');
  input.addEventListener('change', async () => { const fs = [...input.files]; input.value = ''; if (fs.length) await armarPlan(fs); });
  async function armarPlan(fs) {
    resumen.replaceChildren(h('p', { class: 'hint', style: 'margin:0' }, `Revisando ${fs.length} archivos…`));
    await NUBE.refrescar(true).catch(() => {});
    const A = analizarCarpeta(fs), enNube = NUBE.arbol || new Map();
    const sinExt = p => p.replace(/\.[^./]+$/, '');                  // la misma foto pudo subirse como .jpg (se achica al subirla): se compara sin la extensión
    const yaEstan = new Set([...enNube.keys()].filter(p => p.startsWith('productos/')).map(p => sinExt(p.replace(/^productos\/_entrada\//, 'productos/'))));
    const nuevas = A.fotos.filter(x => !yaEstan.has(sinExt('productos/' + x.rel))), repetidas = A.fotos.length - nuevas.length;
    const projNuevos = A.proyectos.filter(x => !enNube.has('datos/proyectos/' + limpiarNombre(x.nombre.replace(/\.json$/i, ''), 150) + '.json'));
    let precios = {};
    for (const f of A.catalogos) { try { precios = unirCatalogos(precios, JSON.parse(await f.text())); } catch (e) { /* archivo dañado */ } }
    let enCurso = null;
    for (const f of A.estados) { try { const j = JSON.parse(await f.text()); if (j && j.v && !j.vacio && (j.productos || []).some(p => p && (p.nombre || p.archivo))) enCurso = j; } catch (e) { /* no se usa */ } }
    plan = { nuevas, precios, projNuevos, enCurso };
    const cats = new Map(); nuevas.forEach(x => { const c = x.rel.includes('/') ? x.rel.split('/')[0] : 'Sin categoría'; cats.set(c, (cats.get(c) || 0) + 1); });
    const nPrecios = Object.keys(precios).length, hay = nuevas.length || nPrecios || projNuevos.length || enCurso;
    llenar(resumen,
      h('ul', { class: 'checks' },
        h('li', { class: nuevas.length ? 'ok' : 'info' }, h('span', { class: 'ic' }, nuevas.length ? '✓' : 'i'), h('span', null, `Fotos de productos: ${A.fotos.length} encontradas · ${nuevas.length} nuevas` + (repetidas ? ` · ${repetidas} ya estaban en la nube` : ''),
          cats.size ? h('small', null, [...cats.entries()].map(([c, n]) => `${c}: ${n}`).join(' · ')) : null)),
        h('li', { class: nPrecios ? 'ok' : 'info' }, h('span', { class: 'ic' }, nPrecios ? '✓' : 'i'), h('span', null, nPrecios ? `Precios recordados de ${nPrecios} ${nPrecios === 1 ? 'producto' : 'productos'} (se juntan con los de la nube; gana el más nuevo)` : 'No encontré memoria de precios (programa/datos/catalogo.json).')),
        h('li', { class: projNuevos.length ? 'ok' : 'info' }, h('span', { class: 'ic' }, projNuevos.length ? '✓' : 'i'), h('span', null, A.proyectos.length ? `«Mis folletos»: ${A.proyectos.length} ${A.proyectos.length === 1 ? 'guardado' : 'guardados'} · ${projNuevos.length} ${projNuevos.length === 1 ? 'nuevo' : 'nuevos'}` : 'No encontré «Mis folletos» (programa/datos/proyectos).')),
        enCurso ? h('li', { class: 'ok' }, h('span', { class: 'ic' }, '✓'), h('span', null, 'El folleto que estaba abierto en el programa (queda en «Mis folletos» como «en curso»).')) : null),
      nuevas.length ? check('Quitarles el fondo con IA a las fotos que todavía lo tengan', 'Las que ya están recortadas (PNG sin fondo) se suben tal cual. Las otras las procesa GitHub: tardan unos minutos más en aparecer.', conIA, v => { conIA = v; }) : null,
      hay ? null : h('p', { class: 'hint', style: 'margin:0' }, 'No hay nada nuevo para subir: todo lo de esa carpeta ya está en la nube.'));
    btnSubir.disabled = !hay;
  }
  async function subirPlan() {
    if (!plan) return;
    btnSubir.disabled = true; elegir.disabled = true;
    const prog = h('p', { class: 'confirm-texto', 'aria-live': 'polite', style: 'margin:0' }, 'Empezando…'), barra = h('progress', { max: '100', value: '0', class: 'barra-progreso' });
    resumen.replaceChildren(prog, barra);
    const hecho = { fotos: 0, ia: 0, precios: 0, folletos: 0, fallidas: [] };
    try {
      const tandas = []; for (let i = 0; i < plan.nuevas.length; i += 20) tandas.push(plan.nuevas.slice(i, i + 20));
      for (let t = 0; t < tandas.length; t++) {
        const items = tandas[t].map(x => { const partes = x.rel.split('/'), archivo = partes.pop(); return { file: x.f, nombre: archivo.replace(/\.[^.]+$/, ''), subcarpeta: partes.join('/'), conIA }; });
        const r = await NUBE.subirFotos(items, '', { progreso: (i, n, fase) => {
          const k = t * 20 + i, total = plan.nuevas.length;
          prog.textContent = `Fotos: ${fase === 'preparar' ? 'preparando' : 'subiendo'} ${Math.min(k + 1, total)} de ${total}…`; barra.value = String(Math.round(((t * 20 + (fase === 'subir' ? i : i / 2)) / Math.max(1, total)) * 85));
        } });
        hecho.fotos += r.listos.length; hecho.ia += r.enCola.length; hecho.fallidas.push(...r.fallidas.map(x => x.nombre));
      }
      if (Object.keys(plan.precios).length) { prog.textContent = 'Juntando los precios recordados…'; CAT = await NUBE.guardarCatalogo(unirCatalogos(CAT, plan.precios), 'Precios recordados (traídos de ' + (NUBE.nombrePC || 'otra PC') + ')'); hecho.precios = Object.keys(plan.precios).length; }
      barra.value = '92';
      const proys = [];
      for (const x of plan.projNuevos) { try { proys.push({ ruta: 'datos/proyectos/' + limpiarNombre(x.nombre.replace(/\.json$/i, ''), 150) + '.json', texto: await x.f.text() }); } catch (e) { /* ilegible */ } }
      if (plan.enCurso) proys.push({ ruta: 'datos/proyectos/' + limpiarNombre(nombreCopia().replace(/^(\S+)\s/, '$1 En curso (traído) - '), 150) + '.json', texto: JSON.stringify(plan.enCurso) });
      if (proys.length) { prog.textContent = 'Subiendo «Mis folletos»…'; await NUBE.commitear('Mis folletos traídos de ' + (NUBE.nombrePC || 'otra PC'), async () => proys.map(p => ({ ...p }))); hecho.folletos = proys.length; }
      barra.value = '100';
      llenar(resumen, h('p', { class: 'confirm-texto', style: 'margin:0' }, h('b', null, '¡Listo! '),
        [hecho.fotos ? `${hecho.fotos} fotos` : '', hecho.ia ? `${hecho.ia} fotos más que GitHub está recortando (aparecen en unos minutos)` : '', hecho.precios ? `precios de ${hecho.precios} productos` : '', hecho.folletos ? `${hecho.folletos} folletos guardados` : ''].filter(Boolean).join(', ') + ' ya están en la nube. Se ven desde cualquier computadora.'),
        hecho.fallidas.length ? h('p', { class: 'hint', style: 'margin:0' }, `No pude abrir ${hecho.fallidas.length}: ${hecho.fallidas.slice(0, 6).join(', ')}${hecho.fallidas.length > 6 ? '…' : ''}`) : null);
      btnSubir.textContent = 'Listo'; btnSubir.disabled = false; btnSubir.onclick = () => m.cerrar();
    } catch (e) {
      console.error(e);
      resumen.replaceChildren(h('p', { class: 'confirm-texto', style: 'margin:0' }, 'Se cortó a mitad de camino: ' + e.message), h('p', { class: 'hint', style: 'margin:0' }, `Alcancé a subir ${hecho.fotos} fotos. Volvé a elegir la carpeta: lo que ya subí no se repite.`));
      elegir.disabled = false;
    }
  }
  const elegir = h('button', { class: 'btn', type: 'button', onclick: () => input.click() }, 'Elegir la carpeta…');
  const m = abrirModal({ titulo: 'Traer lo que tenés en esta computadora', ancho: 680,
    cuerpo: h('div', { class: 'stack' },
      h('p', { class: 'hint', style: 'margin:0' }, 'Si en esta PC usabas el programa de folletos, elegí su carpeta (por ejemplo «Rivero-Market-Folletos», en el Escritorio o en Descargas). Subo a la nube las fotos de productos, los precios recordados y «Mis folletos» que todavía no estén. También sirve para subir de una vez una carpeta con fotos nuevas (cada subcarpeta es una categoría).'),
      h('p', { class: 'hint', style: 'margin:0' }, 'El navegador te va a preguntar si querés subir los archivos de la carpeta: decile que sí. No se borra ni se cambia nada en tu computadora.'),
      h('div', { class: 'row-actions' }, elegir, input), resumen),
    acciones: [h('button', { class: 'btn ghost', type: 'button', onclick: () => m.cerrar() }, 'Cerrar'), btnSubir] });
  if (op.archivos) armarPlan(op.archivos);                          // (pruebas automáticas: archivos ya elegidos)
}

// ───────── al iniciar en la nube: versión nueva, folletos de la otra PC, fotos que se están recortando ─────────
async function revisarVersionNueva() {
  if (!NUBE.activo || !NUBE.cfg.armado || DOM.bannerVersion) return;
  try {
    const r = await fetch('version.json', { cache: 'no-store' }); if (!r.ok) return;
    const v = await r.json();
    if (v.codigo && NUBE.cfg.codigo ? v.codigo === NUBE.cfg.codigo : (!v.armado || v.armado === NUBE.cfg.armado)) return;   // subir fotos rearma la página, pero la herramienta es la misma
    DOM.bannerVersion = h('div', { class: 'banner-version', role: 'status' }, h('span', null, `Hay una versión nueva de la herramienta${v.v ? ' (' + v.v + ')' : ''}.`),
      h('button', { class: 'btn small primary', type: 'button', onclick: async () => {
        try { await KV.set('estado', estadoParaGuardar(S)); await KV.set('estado_ts', Date.now()); } catch (e) { /* igual se actualiza */ }
        location.replace(location.pathname + '?v=' + encodeURIComponent(v.armado));
      } }, 'Actualizar ahora'),
      h('button', { class: 'btn small ghost', type: 'button', 'aria-label': 'Más tarde', onclick: () => { DOM.bannerVersion.remove(); DOM.bannerVersion = null; } }, 'Más tarde'));
    document.body.prepend(DOM.bannerVersion);
  } catch (e) { /* sin internet: se revisa más tarde */ }
}
async function ofrecerBorradorDeOtraPC() {
  if (!NUBE.activo) return;
  const visto = +LS.get(CLAVE.borradorVisto) || 0, local = (await KV.get('estado_ts')) || 0;
  const otros = (await NUBE.borradoresDeOtras().catch(() => [])).filter(b => b.ts > Math.max(visto, local) + 30000);
  if (!otros.length) return;
  const b = otros.sort((x, y) => y.ts - x.ts)[0];
  if (JSON.stringify(b.estado) === JSON.stringify(estadoParaGuardar(S))) return;
  const titulo = (b.estado.titulo || (b.estado.mensaje || {}).titulo || 'folleto sin título');
  const ok = await confirmar('¿Seguís con el folleto de la otra computadora?', `En «${b.nombre || 'otra computadora'}» quedó un folleto sin terminar («${titulo}»), guardado ${haceCuanto(b.ts)}. ¿Lo abrís acá para seguirlo?`, 'Sí, seguir con ese', 'No, quedarme con este');
  LS.set(CLAVE.borradorVisto, String(b.ts));
  if (!ok) return;
  try { if (hayContenido()) await guardarCopiaFolleto(); } catch (e) { console.error(e); }
  const datosLocal = S.comercio; S = normalizarEstado(b.estado); S.comercio = comercioAlAbrir(S.comercio, datosLocal); S.avisoEjemplo = false; ACTIVO = { tipo: esColeccion() ? 'foto' : 'producto', i: 0 };
  await prepararImagenes(S); construirPanel(); cambio(); reiniciarHistorial();
  aviso(`Listo: seguís con el folleto de «${b.nombre || 'la otra computadora'}».`);
}
async function despuesDeIniciarNube() {
  if (!NUBE.activo) return;
  NUBE.oyentes.add(() => { if (DOM.nubeChip) pintarChipNube(); });
  if (NUBE.llaveMala) aviso('La llave de GitHub de esta computadora ya no sirve. Tocá «☁ Reconectar» arriba para cargar una nueva.', 8000);
  else if (NUBE.ultimoError && !NUBE.arbol) aviso(NUBE.ultimoError.message, 8000);
  if (NUBE.hayEsperas()) { NUBE.resolverEsperas(); NUBE.vigilar(); }
  setInterval(revisarVersionNueva, 10 * 60000);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { if (NUBE.puedeEscribir) NUBE.guardarBorrador().catch(() => {}); }
    else { revisarVersionNueva(); NUBE.refrescar().then(c => { if (c) NUBE.resolverEsperas(); }).catch(() => {}); }
  });
  await ofrecerBorradorDeOtraPC().catch(e => console.error(e));
  revisarVersionNueva();
}

// ───────── entregar los archivos terminados: carpeta de la PC, descarga o .zip ─────────
const CRC_TABLA = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
function crc32(u8) { let c = 0xFFFFFFFF; for (let i = 0; i < u8.length; i++) c = CRC_TABLA[(c ^ u8[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
/** ZIP sin comprimir (los PNG y PDF ya vienen comprimidos): [{nombre, blob}] → Blob. */
async function crearZip(archivos) {
  const enc = new TextEncoder(), partes = [], central = [], d = new Date(); let off = 0;
  const hora = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1), dia = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
  for (const a of archivos) {
    const nom = enc.encode(a.nombre), dat = new Uint8Array(await a.blob.arrayBuffer()), crc = crc32(dat);
    const lh = new DataView(new ArrayBuffer(30));
    [[0, 0x04034b50, 4], [4, 20, 2], [6, 0x0800, 2], [8, 0, 2], [10, hora, 2], [12, dia, 2], [14, crc, 4], [18, dat.length, 4], [22, dat.length, 4], [26, nom.length, 2], [28, 0, 2]].forEach(([o, v, n]) => (n === 4 ? lh.setUint32(o, v, true) : lh.setUint16(o, v, true)));
    partes.push(lh.buffer, nom, dat); central.push({ nom, crc, tam: dat.length, off }); off += 30 + nom.length + dat.length;
  }
  let tamCentral = 0;
  for (const c of central) {
    const ch = new DataView(new ArrayBuffer(46));
    [[0, 0x02014b50, 4], [4, 20, 2], [6, 20, 2], [8, 0x0800, 2], [10, 0, 2], [12, hora, 2], [14, dia, 2], [16, c.crc, 4], [20, c.tam, 4], [24, c.tam, 4], [28, c.nom.length, 2], [30, 0, 2], [32, 0, 2], [34, 0, 2], [36, 0, 2], [38, 0, 4], [42, c.off, 4]].forEach(([o, v, n]) => (n === 4 ? ch.setUint32(o, v, true) : ch.setUint16(o, v, true)));
    partes.push(ch.buffer, c.nom); tamCentral += 46 + c.nom.length;
  }
  const fin = new DataView(new ArrayBuffer(22));
  fin.setUint32(0, 0x06054b50, true); fin.setUint16(8, central.length, true); fin.setUint16(10, central.length, true); fin.setUint32(12, tamCentral, true); fin.setUint32(16, off, true);
  partes.push(fin.buffer);
  return new Blob(partes, { type: 'application/zip' });
}
const puedeElegirCarpeta = () => typeof window.showDirectoryPicker === 'function' && window.top === window.self;
const CARPETA_PC = { handle: null, cargada: false,
  async cargar() { if (!this.cargada) { this.cargada = true; try { this.handle = (await KV.get('carpetaDestino')) || null; } catch (e) { this.handle = null; } } return this.handle; },
  async elegir() { const hd = await window.showDirectoryPicker({ id: 'folletos', mode: 'readwrite', startIn: 'desktop' }); this.handle = hd; await KV.set('carpetaDestino', hd); return hd; },
  async permiso() { const hd = this.handle; if (!hd) return false; try { if ((await hd.queryPermission({ mode: 'readwrite' })) === 'granted') return true; return (await hd.requestPermission({ mode: 'readwrite' })) === 'granted'; } catch (e) { return false; } },
};
async function nombreLibreEn(dir, nombre, esCarpeta = false) {
  const m = esCarpeta ? [nombre, ''] : (/^(.*?)(\.[^.]+)?$/.exec(nombre) || [nombre, nombre, '']).slice(1);
  for (let n = 1; n < 500; n++) {
    const prueba = (m[0] || nombre) + (n > 1 ? ` (${n})` : '') + (m[1] || '');
    try { if (esCarpeta) await dir.getDirectoryHandle(prueba); else await dir.getFileHandle(prueba); } catch (e) { return prueba; }
  }
  return nombre + ' ' + Date.now();
}
/** Entrega los archivos del folleto: en la carpeta elegida de la PC (Chrome/Edge), o como descarga (si son muchos, en un .zip). */
async function entregarArchivos(archivos, carpetaNombre, modo) {
  const n = archivos.length;
  if (modo === 'carpeta' && CARPETA_PC.handle && (await CARPETA_PC.permiso())) {
    let dir = CARPETA_PC.handle, sub = '';
    if (archivos.filter(a => a.tipo === 'png').length > 1) { sub = await nombreLibreEn(dir, limpiarNombre(carpetaNombre, 120), true); dir = await dir.getDirectoryHandle(sub, { create: true }); }
    for (const a of archivos) { const fh = await dir.getFileHandle(await nombreLibreEn(dir, limpiarNombre(a.nombre, 180)), { create: true }); const w = await fh.createWritable(); await w.write(a.blob); await w.close(); }
    return { modo: 'carpeta', texto: sub ? `Guardé ${n} archivos en la carpeta «${sub}», dentro de «${CARPETA_PC.handle.name}».` : `Guardé tu folleto en la carpeta «${CARPETA_PC.handle.name}».` };
  }
  if (n === 2 && (await esBrave())) {
    const img = archivos.find(a => a.tipo === 'png') || archivos[0], r = await guardarArchivo(img.blob, img.nombre);
    if (r !== 'ok') throw new Error('No se pudo descargar (' + r + ').');
    return { modo: 'descarga', texto: 'Descargué la imagen (está en la carpeta Descargas). El PDF para imprimir lo bajás con el botón «⬇ PDF para imprimir» de acá abajo: Brave no deja bajar dos archivos seguidos.' };
  }
  if (n <= 2) {
    for (const a of archivos) { const r = await guardarArchivo(a.blob, a.nombre); if (r !== 'ok') throw new Error(r === 'no-disponible' ? 'Este visor no permite descargar. Abrí la herramienta en el navegador.' : 'No se pudo descargar (' + r + ').'); await esperar(350); }
    return { modo: 'descarga', texto: n === 1 ? 'Descargué tu folleto (está en la carpeta Descargas).' : 'Descargué tu folleto: la imagen y el PDF (están en la carpeta Descargas).' };
  }
  const base = limpiarNombre(carpetaNombre, 120), zip = await crearZip(archivos.map(a => ({ nombre: base + '/' + limpiarNombre(a.nombre, 180), blob: a.blob })));
  const r = await guardarArchivo(zip, base + '.zip');
  if (r !== 'ok') throw new Error('No se pudo descargar (' + r + ').');
  return { modo: 'zip', texto: `Descargué los ${n} archivos juntos en «${base}.zip» (carpeta Descargas). Abrilo con doble clic para ver las imágenes; cada una también se puede bajar o compartir desde acá abajo.` };
}
/** Brave bloquea la segunda descarga seguida y no deja elegir carpeta. */
async function esBrave() { try { return !!(navigator.brave && (await navigator.brave.isBrave())); } catch (e) { return false; } }
/** Compartir una imagen (en el celular abre WhatsApp, Facebook, etc.). */
const puedeCompartir = blob => { try { return !!(navigator.canShare && navigator.canShare({ files: [new File([blob], 'x.png', { type: blob.type || 'image/png' })] })); } catch (e) { return false; } };
async function compartirArchivo(blob, nombre, texto) {
  try { await navigator.share({ files: [new File([blob], nombre, { type: blob.type || 'image/png' })], text: texto || undefined }); }
  catch (e) { if (e && e.name !== 'AbortError') aviso('No se pudo compartir desde este navegador: descargala y mandala desde WhatsApp.'); }
}
window.__nube = { analizarCarpeta, unirCatalogos, crearZip, metaDeNombre, limpiarNombre, limpiarRuta, abrirTraer, revisarVersionNueva, desconectarNube, entregarArchivos, CARPETA_PC };   // solo para pruebas automáticas
