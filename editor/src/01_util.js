// ───────────────────────── utilidades ─────────────────────────
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const uid = () => Math.random().toString(36).slice(2, 9);
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

function h(tag, attrs, ...kids) {
  const el = document.createElement(tag);
  if (attrs) for (const [k, v] of Object.entries(attrs)) {
    if (v === false || v == null) continue;
    if (k === 'class') el.className = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'value') el.value = v;
    else if (v === true) el.setAttribute(k, '');
    else el.setAttribute(k, v);
  }
  for (const kid of kids.flat()) if (kid != null && kid !== false) el.append(kid.nodeType ? kid : document.createTextNode(kid));
  return el;
}

// ── fechas ──
function parseISO(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || '');
  return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null;
}
const MES = d => MESES[d.getMonth()].toUpperCase();
function rangoCorto(desde, hasta) {            // para la cinta: "DEL 12 AL 18 DE OCTUBRE"
  const a = parseISO(desde), b = parseISO(hasta);
  if (a && b) {
    if (a.getTime() === b.getTime()) return `SOLO EL ${a.getDate()} DE ${MES(a)}`;
    if (a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear()) return `DEL ${a.getDate()} AL ${b.getDate()} DE ${MES(b)}`;
    return `DEL ${a.getDate()} DE ${MES(a)} AL ${b.getDate()} DE ${MES(b)}`;
  }
  if (b) return `HASTA EL ${b.getDate()} DE ${MES(b)}`;
  if (a) return `DESDE EL ${a.getDate()} DE ${MES(a)}`;
  return '';
}
function rangoLargo(desde, hasta) {            // para el pie legal: "del 12 al 18 de octubre de 2026"
  const a = parseISO(desde), b = parseISO(hasta);
  const f = d => `${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`;
  if (a && b) {
    if (a.getTime() === b.getTime()) return `el ${f(a)}`;
    if (a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear()) return `del ${a.getDate()} al ${f(b)}`;
    return `del ${f(a)} al ${f(b)}`;
  }
  if (b) return `hasta el ${f(b)}`;
  if (a) return `desde el ${f(a)}`;
  return '';
}

// ── precios (formato argentino: 18.540 / 1.250,50) ──
function formatMiles(s) { return s.replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }
function parsePrecio(v) {
  let s = String(v ?? '').replace(/[^\d.,]/g, '');
  if (!/\d/.test(s)) return null;
  let ent = '', dec = '';
  const lc = s.lastIndexOf(','), ld = s.lastIndexOf('.');
  if (lc >= 0) { ent = s.slice(0, lc).replace(/[.,]/g, ''); dec = s.slice(lc + 1).replace(/\D/g, '').slice(0, 2); }
  else if (ld >= 0) {
    const after = s.slice(ld + 1);
    if (after.length === 3 || (s.match(/\./g) || []).length > 1) ent = s.replace(/\./g, '');
    else { ent = s.slice(0, ld); dec = after.slice(0, 2); }
  } else ent = s;
  ent = ent.replace(/^0+(?=\d)/, '') || '0';
  return { num: parseFloat(ent + (dec ? '.' + dec : '')), int: formatMiles(ent), dec: dec ? dec.padEnd(2, '0') : '' };
}
function pesos(n) {
  const e = Math.round(n * 100) / 100;
  return '$' + (Number.isInteger(e) ? formatMiles(String(e)) : formatMiles(String(Math.trunc(e))) + ',' + String(Math.round((e % 1) * 100)).padStart(2, '0'));
}
/** Porcentaje de descuento, siempre redondeado hacia abajo: nunca se anuncia más descuento que el real. */
const pctReal = (antes, ahora) => (antes > 0 && ahora < antes ? Math.floor(((antes - ahora) / antes) * 100 + 1e-9) : 0);
/** Redondea a centavos (sin redondear a pesos: si da centavos, quedan; la persona lo ajusta si quiere). */
const aCentavos = n => Math.round(n * 100 + 1e-7) / 100;
/** Número → texto de precio como se escribe en el formulario: 18.540 · 1.250,50 */
function precioATexto(n) {
  const c = aCentavos(n), ent = Math.trunc(c), dec = Math.round((c - ent) * 100);
  return formatMiles(String(ent)) + (dec ? ',' + String(dec).padStart(2, '0') : '');
}
/** Precio de oferta a partir del precio anterior y un % (texto como lo escribe la persona), con centavos exactos. */
function ofertaDesde(regular, pct) {
  const R = parsePrecio(regular), p = parseFloat(String(pct || '').replace(',', '.'));
  if (!R || !(p > 0 && p < 100)) return null;
  return aCentavos(R.num * (100 - p) / 100);
}

// ── calendario de fechas comerciales de Argentina ──
function pascua(y) {                                  // domingo de Pascua (algoritmo de Meeus)
  const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
  const hh = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - hh - k) % 7, m = Math.floor((a + 11 * hh + 22 * l) / 451);
  const mes = Math.floor((hh + l - 7 * m + 114) / 31), dia = ((hh + l - 7 * m + 114) % 31) + 1;
  return new Date(y, mes - 1, dia);
}
const nDomingo = (y, mes, n) => { const d = new Date(y, mes, 1); d.setDate(1 + ((7 - d.getDay()) % 7) + 7 * (n - 1)); return d; };
const blackFriday = y => { const d = new Date(y, 10, 1); d.setDate(1 + ((4 - d.getDay() + 7) % 7) + 21 + 1); return d; };
/** Fechas de cada temática para un año (las móviles se calculan). */
function fechasDelAnio(y) {
  return [
    ['anionuevo', new Date(y, 0, 1)], ['reyes', new Date(y, 0, 6)], ['pascuas', pascua(y)], ['trabajador', new Date(y, 4, 1)],
    ['patrias', new Date(y, 4, 25)], ['padre', nDomingo(y, 5, 3)], ['patrias', new Date(y, 6, 9)], ['nino', nDomingo(y, 7, 3)],
    ['primavera', new Date(y, 8, 21)], ['madre', nDomingo(y, 9, 3)], ['halloween', new Date(y, 9, 31)], ['blackfriday', blackFriday(y)],
    ['navidad', new Date(y, 11, 25)], ['anionuevo', new Date(y + 1, 0, 1)],
  ];
}
/** Próximas fechas especiales a partir de hoy (hasta `dias` días). */
function proximasFechas(hoy = new Date(), dias = 60) {
  const h0 = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()), out = [], vistos = new Set();
  for (const [tema, d] of [...fechasDelAnio(h0.getFullYear()), ...fechasDelAnio(h0.getFullYear() + 1)]) {
    const falta = Math.round((d - h0) / 86400000), key = tema + d.getTime();
    if (falta >= 0 && falta <= dias && !vistos.has(key)) { vistos.add(key); out.push({ tema, fecha: d, falta }); }
  }
  return out.sort((a, b) => a.fecha - b.fecha);
}
const isoDe = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const fechaLinda = d => `${DIAS[d.getDay()]} ${d.getDate()} de ${MESES[d.getMonth()]}`;

// ── almacenamiento (IndexedDB con respaldo silencioso) ──
const KV = (() => {
  let dbp = null;
  const open = () => dbp || (dbp = new Promise((res, rej) => {
    try {
      const r = indexedDB.open('rivero-ofertas', 1);
      r.onupgradeneeded = () => r.result.createObjectStore('kv');
      r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
    } catch (e) { rej(e); }
  }));
  return {
    async get(k) { try { const db = await open(); return await new Promise(r => { const q = db.transaction('kv').objectStore('kv').get(k); q.onsuccess = () => r(q.result); q.onerror = () => r(undefined); }); } catch (e) { return undefined; } },
    async set(k, v) { try { const db = await open(); await new Promise(r => { const t = db.transaction('kv', 'readwrite'); t.objectStore('kv').put(v, k); t.oncomplete = r; t.onerror = r; }); return true; } catch (e) { return false; } },
  };
})();

// ── guardar archivos: capacidad "downloads" del visor, o descarga común en el archivo local ──
async function guardarArchivo(blob, nombre) {
  if (typeof API !== 'undefined' && API.activo) {                  // programa local: va directo al Escritorio
    const ext = (nombre.split('.').pop() || 'png').toLowerCase();
    guardarArchivo.ultimo = await API.guardarArchivo(blob, nombre, ext);
    return 'ok';
  }
  try {
    if (window.claude && typeof window.claude.use === 'function') {
      const dl = await window.claude.use('downloads');
      if (dl) { await dl.save({ filename: nombre, data: blob }); return 'ok'; }
    }
  } catch (e) {
    if (e && e.code === 'declined') return 'cancelado';
    if (e && e.code && e.code !== 'unavailable') return 'error:' + e.code;
  }
  if (window.claude && window.claude.use && window.top !== window.self) return 'no-disponible';   // dentro del visor sin capacidad
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = nombre; document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  return 'ok';
}

const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
