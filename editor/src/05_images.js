// ───────────────────────── imágenes de productos y fotos ─────────────────────────
const IMG = { ready: new Map(), error: new Map() };          // clave → imagen lista para dibujar / clave → cuándo falló (se vuelve a probar)
const REINTENTO_MS = 60000;                                     // una foto que no cargó se vuelve a pedir al minuto (o al finalizar)

const enLaNube = () => typeof NUBE !== 'undefined' && NUBE.activo && !(typeof API !== 'undefined' && API.activo);
/** Dirección de una foto de la carpeta de productos: la del programa local o la de la nube (GitHub). */
const urlImagen = (ruta, v) => (enLaNube() ? NUBE.urlImagen(ruta, v) : '/api/imagen?ruta=' + encodeURIComponent(ruta) + (v ? '&v=' + encodeURIComponent(v) : ''));
const urlMiniatura = (ruta, v) => (enLaNube() ? NUBE.urlMiniatura(ruta, v) : '/api/miniatura?ruta=' + encodeURIComponent(ruta) + (v ? '&v=' + encodeURIComponent(v) : ''));
/** ¿Hay carpeta de productos? (programa local o nube) */
const servidorActivo = () => (typeof API !== 'undefined' && API.activo) || enLaNube();

/** De dónde sale la foto de un producto (o de una foto de colección): incrustada, o de la carpeta del programa. */
function srcDe(p) {
  if (!p) return null;
  if (p.img) return p.img;
  if (p.archivo && servidorActivo()) return urlImagen(p.archivo, p.mtime);
  return null;
}
function srcMini(p) {
  if (!p) return null;
  if (p.img) return p.img;
  if (p.archivo && servidorActivo()) return urlMiniatura(p.archivo, p.mtime);
  return null;
}
const claveImg = p => [p.id, p.imgV || 0, p.archivo || '', p.mtime || '', p.quitarFondo ? 1 : 0, p.tol || 40, p.img ? p.img.length : 0].join('|');
const getImg = p => (p && srcDe(p) ? IMG.ready.get(claveImg(p)) || null : null);
const faltaArchivo = p => !!(p && srcDe(p) && IMG.error.has(claveImg(p)));

/** Las fotos de otro sitio (las de la nube) se piden con permiso CORS: si no, el folleto no se podría exportar. */
const esDeOtroSitio = src => { try { return /^https?:/i.test(src) && new URL(src, location.href).origin !== location.origin; } catch (e) { return false; } };
function cargarImagen(src) {
  return new Promise((res, rej) => { const im = new Image(); if (esDeOtroSitio(src)) im.crossOrigin = 'anonymous'; im.onload = () => res(im); im.onerror = () => rej(new Error('No se pudo cargar la imagen')); im.src = src; });
}
function aCanvas(img, maxSide = 1000) {
  const w0 = img.naturalWidth || img.width, h0 = img.naturalHeight || img.height, sc = Math.min(1, maxSide / Math.max(w0, h0));
  const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w0 * sc)); c.height = Math.max(1, Math.round(h0 * sc));
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); return c;
}
function tieneAlfa(c) {
  const d = c.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, c.width, c.height).data;
  for (let i = 3; i < d.length; i += 16) if (d[i] < 250) return true;
  return false;
}
function esquinasClaras(c) {
  const ctx = c.getContext('2d', { willReadFrequently: true }), w = c.width, h = c.height, n = Math.max(2, Math.round(Math.min(w, h) * 0.02));
  let ok = 0;
  for (const [x, y] of [[0, 0], [w - n, 0], [0, h - n], [w - n, h - n]]) {
    const d = ctx.getImageData(x, y, n, n).data; let s = 0, m = d.length / 4;
    for (let i = 0; i < d.length; i += 4) s += Math.min(d[i], d[i + 1], d[i + 2]);
    if (s / m > 225) ok++;
  }
  return ok >= 3;
}

/** Quita el fondo liso (blanco o casi) conectado a los bordes. tol = sensibilidad (0–120). */
function quitarFondo(src, tol = 40) {
  const w = src.width, h = src.height, out = document.createElement('canvas'); out.width = w; out.height = h;
  const ctx = out.getContext('2d', { willReadFrequently: true }); ctx.drawImage(src, 0, 0);
  const im = ctx.getImageData(0, 0, w, h), d = im.data;
  const corner = [[0, 0], [w - 1, 0], [0, h - 1], [w - 1, h - 1]].map(([x, y]) => { const i = (y * w + x) * 4; return [d[i], d[i + 1], d[i + 2]]; });
  const bg = [0, 1, 2].map(c => corner.map(v => v[c]).sort((a, b) => a - b)[2]);        // mediana robusta
  const dist = i => Math.max(Math.abs(d[i] - bg[0]), Math.abs(d[i + 1] - bg[1]), Math.abs(d[i + 2] - bg[2]));
  const seen = new Uint8Array(w * h), stack = new Int32Array(w * h); let sp = 0;
  const push = (x, y) => { const p = y * w + x; if (!seen[p] && dist(p * 4) <= tol) { seen[p] = 1; stack[sp++] = p; } };
  for (let x = 0; x < w; x++) { push(x, 0); push(x, h - 1); }
  for (let y = 0; y < h; y++) { push(0, y); push(w - 1, y); }
  while (sp) {
    const p = stack[--sp], x = p % w, y = (p / w) | 0;
    if (x > 0) push(x - 1, y); if (x < w - 1) push(x + 1, y); if (y > 0) push(x, y - 1); if (y < h - 1) push(x, y + 1);
  }
  for (let p = 0; p < w * h; p++) if (seen[p]) d[p * 4 + 3] = 0;
  // borde suave: píxeles pegados al fondo reciben transparencia parcial y se les quita el halo claro
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    const p = y * w + x; if (seen[p]) continue;
    if (!(seen[p - 1] || seen[p + 1] || seen[p - w] || seen[p + w])) continue;
    const i = p * 4, dd = dist(i), a = clamp((dd - tol * 0.55) / (tol * 1.4), 0, 1);
    if (a < 1) { d[i + 3] = Math.round(a * 255); const k = Math.max(a, 0.25); for (let c = 0; c < 3; c++) d[i + c] = clamp(bg[c] + (d[i + c] - bg[c]) / k, 0, 255); }
  }
  ctx.putImageData(im, 0, 0);
  return out;
}

/** Saca los bordes vacíos de la foto de un producto (transparentes, o del fondo claro y liso) para que el producto
 *  se vea lo más grande posible en su cuadro. Si no hay bordes que sacar, devuelve la misma foto. */
function recortarBordes(c) {
  const w = c.width, h = c.height; if (w < 16 || h < 16) return c;
  const d = c.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, w, h).data;
  const esq = [0, w - 1, (h - 1) * w, h * w - 1].map(q => q * 4), transparente = esq.some(i => d[i + 3] < 250);
  let vacio;
  if (transparente) vacio = i => d[i + 3] < 24;
  else {
    const bg = [0, 1, 2].map(n => d[esq[0] + n]), dist = i => Math.max(Math.abs(d[i] - bg[0]), Math.abs(d[i + 1] - bg[1]), Math.abs(d[i + 2] - bg[2]));
    if (Math.min(...bg) < 200 || esq.some(i => dist(i) > 22)) return c;          // solo fondos claros y parejos en las 4 esquinas
    vacio = i => dist(i) <= 22;
  }
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) for (let x = 0, i = y * w * 4; x < w; x++, i += 4) if (!vacio(i)) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  if (x1 < 0) return c;
  const pad = Math.round(Math.max(x1 - x0, y1 - y0) * 0.015);
  x0 = Math.max(0, x0 - pad); y0 = Math.max(0, y0 - pad); x1 = Math.min(w - 1, x1 + pad); y1 = Math.min(h - 1, y1 + pad);
  const cw = x1 - x0 + 1, ch = y1 - y0 + 1;
  if (cw >= w * 0.97 && ch >= h * 0.97) return c;
  const out = document.createElement('canvas'); out.width = cw; out.height = ch;
  out.getContext('2d').drawImage(c, x0, y0, cw, ch, 0, 0, cw, ch);
  return out;
}

/** Lee un archivo (elegido, pegado o soltado) y devuelve {url, alfa, claro}. Para la página suelta, donde no hay carpeta. */
async function leerArchivoImagen(file) {
  const src = URL.createObjectURL(file);
  try {
    const img = await cargarImagen(src), c = aCanvas(img, 1000), alfa = tieneAlfa(c), claro = !alfa && esquinasClaras(c);
    const webp = c.toDataURL('image/webp', 0.9).startsWith('data:image/webp');
    const url = alfa ? (webp ? c.toDataURL('image/webp', 0.92) : c.toDataURL('image/png')) : c.toDataURL('image/jpeg', 0.92);
    return { url, alfa, claro };
  } finally { URL.revokeObjectURL(src); }
}

/** Mira una foto de la carpeta: ¿ya viene sin fondo?, ¿tiene fondo blanco liso (se quita sola)?, ¿tiene un fondo complicado? */
async function analizarFoto(src) {
  const im = await cargarImagen(src), c = aCanvas(im, 600), alfa = tieneAlfa(c);
  return { alfa, claro: !alfa && esquinasClaras(c), w: im.naturalWidth || im.width, h: im.naturalHeight || im.height };
}

/** Prepara (decodifica, reduce y, si hace falta, recorta el fondo) las imágenes que usa el estado. */
async function prepararImagenes(S, op = {}) {
  const vivos = new Set(), tareas = [];
  const items = [...(S.productos || []).flatMap(p => [[p, 1400, true], ...(p.fotosExtra || []).map(f => [f, 1400, true])]), ...((((S.coleccion || {}).fotos) || []).map(p => [p, 2000, false]))];
  for (const [p, maxLado, esProducto] of items) {
    const src = srcDe(p);
    if (!src) continue;
    const k = claveImg(p); vivos.add(k);
    if (IMG.ready.has(k) || (IMG.error.has(k) && !op.reintentar && Date.now() - IMG.error.get(k) < REINTENTO_MS)) continue;
    tareas.push(cargarImagen(src).then(im => { const c = aCanvas(im, maxLado), f = p.quitarFondo ? quitarFondo(c, p.tol || 40) : c; IMG.ready.set(k, esProducto ? recortarBordes(f) : f); IMG.error.delete(k); }).catch(() => { IMG.error.set(k, Date.now()); }));
  }
  await Promise.all(tareas);
  for (const k of [...IMG.ready.keys()]) if (!vivos.has(k)) IMG.ready.delete(k);
  for (const k of [...IMG.error.keys()]) if (!vivos.has(k)) IMG.error.delete(k);
  const lg = (S.promo && S.promo.logo) || '';                      // logo propio de la promo (p. ej. el oficial de Mercado Pago)
  if (!lg) { RES.promoLogo = null; RES._promoSrc = ''; }
  else if (RES._promoSrc !== lg) { try { RES.promoLogo = await cargarImagen(lg); RES._promoSrc = lg; } catch (e) { RES.promoLogo = null; } }
}
