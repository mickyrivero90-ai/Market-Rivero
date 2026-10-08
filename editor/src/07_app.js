// ───────────────────────── aplicación (interfaz) ─────────────────────────
let S = null;                          // estado del folleto
let ACTIVO = { tipo: 'producto', i: 0 };   // casillero activo: se resalta en la vista previa y recibe las fotos pegadas
let verGuias = true;                   // guías de vista previa (no salen en el archivo)
let CAT = {};                          // memoria de precios por foto (programa local o nube)
const DOM = {};
const GRUPOS_FORMATO = [
  ['Folletos de ofertas', 'A4 para imprimir; al terminar elegís también la versión para redes', ['a4_10', 'a4_12', 'a4_16', 'a4_8', 'a4_star4']],
  ['Redes sociales', 'Facebook, Instagram, WhatsApp', ['post_4', 'post_star4', 'story_3', 'story_4']],
  ['Mensaje o anuncio', 'sin productos: promos de pago, descuentos, avisos', ['mensaje_a4', 'mensaje_post', 'mensaje_story']],
  ['Un solo producto', 'liquidación, fardos, solo efectivo', ['destacado_a4', 'destacado_post', 'destacado_story']],
  ['Mostrar productos', 'sin precios: para dar a conocer lo que tenés', ['coleccion_a4', 'coleccion_post', 'coleccion_story']],
];
const DESC_FORMATO = { a4_10: '2 columnas', a4_12: '3 columnas', a4_16: '4 columnas', a4_8: 'Cartas grandes', a4_star4: '1 estrella + 4', post_4: 'Más legible', post_star4: 'Estrella + 4', story_3: 'Estados · Historias', story_4: 'Estados · sin estrella',
  mensaje_a4: 'Para imprimir', mensaje_post: 'Facebook · canal WA', mensaje_story: 'Estados · Historias',
  destacado_a4: 'Para imprimir', destacado_post: 'Facebook · Instagram', destacado_story: 'WhatsApp · Instagram', coleccion_a4: 'Para imprimir', coleccion_post: 'Facebook · Instagram', coleccion_story: 'WhatsApp · Instagram' };
const NOMBRE_GRUPO_TEMA = { marca: 'Colores de la marca', fecha: 'Fechas especiales y promos', impacto: 'Estilos de impacto' };
const INSIGNIAS = ['2x1', '3x2', '2DA AL 50%', '2DA AL 70%', 'LLEVÁ 3', 'NUEVO', 'EXCLUSIVO'];
const MENSAJES_KICKER = ['¡Aprovechá!', 'Promo del mes', 'Solo por esta semana', '¡Atención!', 'Nuevo en el local'];
const MENSAJES_TITULO = ['Descuento en todos los productos', 'Pagá con QR y ahorrá', 'Cuotas sin interés en todo el local', 'Ahorrá pagando en efectivo', 'Nuevo horario de atención'];
const UNIDADES = ['c/u', 'x kg', 'x 100 g', 'x 200 g', 'x pack', 'x docena', 'x litro', 'x fardo', 'x caja'];
const MENSAJES1 = ['OFERTA IMPERDIBLE', 'LIQUIDACIÓN TOTAL', 'ÚLTIMOS FARDOS', 'PRECIO DE REMATE', 'SOLO HOY'];
const MENSAJES2 = ['SOLO EN EFECTIVO', 'HASTA AGOTAR STOCK', 'FARDO CERRADO', 'ÚLTIMAS UNIDADES'];
const MENSAJES_COLECCION = ['Aquí tenemos todos los productos para tus recetas', 'Todo para tu torta y tus postres', 'Tu repostería empieza acá', 'Encontrá todo lo que necesitás para endulzar el día'];
const MAX_FOTOS = 4;
const L_ACTUAL = () => LAYOUTS[S.formato] || LAYOUTS.a4_10;
const esColeccion = () => L_ACTUAL().grupo === 'coleccion';
const sinProductos = () => ['coleccion', 'mensaje'].includes(L_ACTUAL().grupo);
const lista = tipo => (tipo === 'foto' ? S.coleccion.fotos : S.productos);

function svgEl(tag, attrs = {}) {
  const n = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  return n;
}

// ── avisos ──
let _avisoT;
function aviso(msg, ms = 4400) {
  const box = $('#avisos'); box.replaceChildren(h('div', { class: 'toast', role: 'status' }, msg));
  clearTimeout(_avisoT); _avisoT = setTimeout(() => box.replaceChildren(), ms);
}

// ── cambios: dibujo + guardado automático ──
let _dib = false, _pend = false;
async function dibujar() {
  if (_dib) { _pend = true; return; }
  _dib = true;
  try {
    await prepararImagenes(S);
    const L = L_ACTUAL(), box = DOM.stageBox, mobile = matchMedia('(max-width: 900px)').matches;
    const aw = Math.max(160, box.clientWidth - (mobile ? 16 : 40)), ah = Math.max(140, box.clientHeight - (mobile ? 16 : 40));
    const fit = Math.min(aw / L.w, ah / L.h) * ZOOM, dpr = window.devicePixelRatio || 1;
    renderFlyer(DOM.canvas, S, { scale: clamp(fit * dpr, 0.2, 2.6), getImg, preview: verGuias, activo: verGuias ? ACTIVO : null });
    DOM.canvas.style.width = Math.round(L.w * fit) + 'px'; DOM.canvas.style.height = Math.round(L.h * fit) + 'px';
    DOM.info.textContent = `${L.nombre} · ${L.w}×${L.h} px`;
    pintarBarraPrev(); pintarSelloPrev();
    if (DOM.zoomTxt) DOM.zoomTxt.textContent = ZOOM === 1 ? 'Ajustado' : Math.round(ZOOM * 100) + ' %';
    if (IMG.error.size) refrescarLecturas();
  } catch (e) { console.error(e); aviso('Hubo un error al dibujar: ' + (e && e.message || e)); }
  _dib = false;
  if (_pend) { _pend = false; dibujar(); }
}
const programarDibujo = debounce(dibujar, 70);

// ── zoom de la vista previa (1 = la hoja entera a la vista) ──
let ZOOM = 1;
function zoomA(z, centro) {
  const box = DOM.stageBox, viejo = ZOOM; ZOOM = clamp(Math.round(z * 100) / 100, 1, 5);
  if (ZOOM === viejo) return;
  // mantiene en pantalla el punto que se estaba mirando
  const r = box.getBoundingClientRect(), cx = centro ? centro.x - r.left : box.clientWidth / 2, cy = centro ? centro.y - r.top : box.clientHeight / 2;
  const fx = (box.scrollLeft + cx) / Math.max(1, box.scrollWidth), fy = (box.scrollTop + cy) / Math.max(1, box.scrollHeight);
  DOM.stage.classList.toggle('con-zoom', ZOOM > 1);
  dibujar().then(() => { box.scrollLeft = fx * box.scrollWidth - cx; box.scrollTop = fy * box.scrollHeight - cy; });
}

// ── deshacer / rehacer ──
const HIST = { pila: [], pos: -1 };
const fotoEstado = () => JSON.stringify(estadoParaGuardar(S));
function reiniciarHistorial() { HIST.pila = [fotoEstado()]; HIST.pos = 0; pintarDeshacer(); }
const registrarHistorial = debounce(() => {
  const f = fotoEstado(); if (HIST.pila[HIST.pos] === f) return;
  HIST.pila = HIST.pila.slice(0, HIST.pos + 1); HIST.pila.push(f);
  if (HIST.pila.length > 60) HIST.pila.shift();
  HIST.pos = HIST.pila.length - 1; pintarDeshacer();
}, 450);
async function moverHistorial(d) {
  const f = fotoEstado();
  if (HIST.pila[HIST.pos] !== f) { HIST.pila = HIST.pila.slice(0, HIST.pos + 1); HIST.pila.push(f); HIST.pos = HIST.pila.length - 1; }   // lo último que se escribió también se puede rehacer
  const j = HIST.pos + d; if (j < 0 || j >= HIST.pila.length) { aviso(d < 0 ? 'No hay nada para deshacer.' : 'No hay nada para rehacer.'); return; }
  HIST.pos = j; S = normalizarEstado(JSON.parse(HIST.pila[j]), { compactar: false });
  await prepararImagenes(S); construirPanel(); programarDibujo(); guardarAuto(); pintarDeshacer();
}
function pintarDeshacer() { if (DOM.btnDeshacer) { DOM.btnDeshacer.disabled = HIST.pos <= 0; DOM.btnRehacer.disabled = HIST.pos >= HIST.pila.length - 1; } }
let _falloGuardado = false;
const guardarAuto = debounce(async () => {
  try {
    const e = estadoParaGuardar(S);
    if (API.activo) await API.put('/api/estado', e);
    else { await KV.set('estado', e); await KV.set('estado_ts', Date.now()); if (NUBE.activo && NUBE.puedeEscribir) NUBE.programarBorrador(); }
    _falloGuardado = false;
  } catch (err) { if (!_falloGuardado) { _falloGuardado = true; aviso('No pude guardar tu trabajo automáticamente: ' + err.message); } }
}, 900);
function cambio() { refrescarLecturas(); programarDibujo(); guardarAuto(); registrarHistorial(); }

// ── piezas de formulario ──
function texto(obj, key, o = {}) {
  return h('input', { type: 'text', value: obj[key] ?? '', placeholder: o.ph || '', inputmode: o.mode || null, autocomplete: 'off', spellcheck: o.mode ? 'false' : 'true', list: o.list || null, maxlength: o.max || null, id: o.id || null,
    oninput: e => { obj[key] = e.target.value; (o.after || cambio)(); } });
}
function campo(etq, input, extra) { return h('label', { class: 'fld' }, h('span', null, etq, extra ? h('em', null, ' · ' + extra) : null), input); }
function check(etq, det, checked, fn) { return h('label', { class: 'chk' }, h('input', { type: 'checkbox', checked: checked || null, onchange: e => fn(e.target.checked) }), h('span', null, etq, det ? h('small', null, det) : null)); }
const paso = (n, t) => [h('span', { class: 'paso' }, String(n)), t];
function seccion(titulo, hint, ...hijos) { return h('section', { class: 'sec' }, h('h2', null, titulo, hint ? h('small', null, hint) : null), ...hijos); }
function detalles(titulo, ...hijos) { return h('details', { class: 'sec colap' }, h('summary', null, titulo), h('div', { class: 'colap-cuerpo' }, ...hijos)); }
function chipsRapidos(opciones, inputEl, obj, key) {
  return h('div', { class: 'quick' }, ...opciones.map(t => h('button', { type: 'button', class: 'q', onclick: () => { obj[key] = t; inputEl.value = t; cambio(); } }, t)));
}

// ── miniaturas de formato ──
function miniatura(id) {
  const L = LAYOUTS[id], vw = 60, vh = Math.round(60 * L.h / L.w);
  const svg = svgEl('svg', { viewBox: `0 0 ${vw} ${vh}`, 'aria-hidden': 'true' });
  const R = (x, y, w, hh, cls, rx = 1.6) => svg.append(svgEl('rect', { x, y, width: w, height: hh, rx, class: cls }));
  R(0, 0, vw, vh, 'bk', 2.5);
  const grid = (y0, rows, rh, gap) => { for (let r = 0; r < rows; r++) for (let c = 0; c < 2; c++) R(3 + c * 28, y0 + r * (rh + gap), 26, rh, 'wh'); };
  const gridN = (y0, cols, rows, rh, gap) => { const cw = (54 - (cols - 1) * 1.6) / cols; for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) R(3 + c * (cw + 1.6), y0 + r * (rh + gap), cw, rh, 'wh', 1.2); };
  if (id === 'a4_10') { R(3, 3, 54, 13, 'ac'); grid(19, 5, 9.4, 2.2); R(0, 77, 60, 8, 'pp', 0); }
  else if (id === 'a4_12') { R(3, 3, 54, 13, 'ac'); gridN(19, 3, 4, 12, 2); R(0, 77, 60, 8, 'pp', 0); }
  else if (id === 'a4_16') { R(3, 3, 54, 13, 'ac'); gridN(19, 4, 4, 12, 2); R(0, 77, 60, 8, 'pp', 0); }
  else if (id === 'post_4') { R(3, 3, 54, 13, 'ac'); gridN(19, 2, 2, 21, 2.4); R(0, 66, 60, 9, 'pp', 0); }
  else if (id.startsWith('mensaje_')) { R(3, 3, 54, 9, 'ac'); R(5, 15, 50, vh * 0.14, 'pp'); R(6, 17 + vh * 0.14, 48, vh - 30 - vh * 0.14, 'wh'); R(0, vh - 8, 60, 8, 'pp', 0); }
  else if (id === 'a4_10_tema') { R(3, 3, 54, 13, 'ac'); svg.append(svgEl('circle', { cx: 52, cy: 9, r: 4, class: 'pp' })); svg.append(svgEl('circle', { cx: 8, cy: 12, r: 2.4, class: 'wh' })); grid(19, 5, 9.4, 2.2); R(0, 77, 60, 8, 'pp', 0); }
  else if (id === 'a4_8') { R(3, 3, 54, 16, 'ac'); grid(22, 4, 11.6, 2); R(0, 76, 60, 9, 'pp', 0); }
  else if (id === 'a4_star4') { R(3, 3, 54, 16, 'ac'); R(3, 22, 54, 25, 'pp'); grid(50, 2, 10.6, 1.8); R(0, 76, 60, 9, 'pp', 0); }
  else if (id === 'post_star4') { R(3, 3, 54, 14, 'ac'); R(3, 19, 54, 20, 'pp'); grid(41, 2, 9.4, 1.6); R(0, 65, 60, 10, 'pp', 0); }
  else if (id === 'story_4') { R(3, 12, 54, 18, 'ac'); for (let r = 0; r < 4; r++) R(3, 33 + r * 13.5, 54, 11.5, 'wh'); R(0, 90, 60, 7, 'pp', 0); }
  else if (id === 'story_3') { R(3, 12, 54, 18, 'ac'); R(3, 32, 54, 34, 'pp'); R(3, 69, 54, 8, 'wh'); R(3, 79, 54, 8, 'wh'); R(0, 90, 60, 7, 'pp', 0); }
  else if (id === 'destacado_a4') { R(0, 14, 60, 12, 'ac', 0); R(4, 31, 52, 42, 'pp'); R(0, 77, 60, 8, 'pp', 0); svg.append(svgEl('circle', { cx: 12, cy: 38, r: 5, class: 'wh' })); }
  else if (id === 'destacado_post') { R(0, 12, 60, 11, 'ac', 0); R(4, 27, 52, 34, 'pp'); R(0, 66, 60, 9, 'pp', 0); svg.append(svgEl('circle', { cx: 12, cy: 34, r: 5, class: 'wh' })); }
  else if (id === 'destacado_story') { R(0, 22, 60, 14, 'ac', 0); R(4, 40, 52, 46, 'pp'); R(0, 90, 60, 7, 'pp', 0); svg.append(svgEl('circle', { cx: 12, cy: 48, r: 5, class: 'wh' })); }
  else if (id === 'coleccion_a4') { R(3, 3, 54, 7, 'ac'); R(3, 12, 54, 13, 'pp'); R(6, 29, 48, 20, 'wh'); R(6, 52, 48, 20, 'wh'); R(0, 77, 60, 8, 'pp', 0); }
  else if (id === 'coleccion_post') { R(3, 3, 54, 6, 'ac'); R(3, 11, 54, 11, 'pp'); R(6, 25, 48, 17, 'wh'); R(6, 45, 48, 17, 'wh'); R(0, 66, 60, 9, 'pp', 0); }
  else { R(3, 12, 54, 6, 'ac'); R(3, 20, 54, 14, 'pp'); R(6, 38, 48, 22, 'wh'); R(6, 63, 48, 22, 'wh'); R(0, 90, 60, 7, 'pp', 0); }
  return svg;
}
function pintarFormatos() {
  DOM.fmts.replaceChildren(...GRUPOS_FORMATO.flatMap(([titulo, sub, ids]) => [
    h('p', { class: 'lab grp' }, titulo, h('em', null, ' · ' + sub)),
    h('div', { class: 'fmts' }, ...ids.filter(id => LAYOUTS[id]).map(id => {
      const L = LAYOUTS[id];
      return h('button', { class: 'fmt', type: 'button', 'aria-pressed': String(S.formato === id), onclick: () => elegirFormato(id) },
        miniatura(id), h('span', { class: 't' }, L.corto), h('span', { class: 'd' }, DESC_FORMATO[id] || ''));
    }))]));
}
function temaPorDefecto(L) { const g = L.temas[0]; return g === 'marca' ? 'naranja' : g === 'fecha' ? 'madre' : 'liquidacion'; }
function aplicarTextosDeTema(id) {
  const T = THEMES[id];
  if (TITULOS_POR_DEFECTO.has(S.titulo)) S.titulo = T.titulo || 'Ofertas de la semana';
  if (SUBTITULOS_POR_DEFECTO.has(S.subtitulo)) S.subtitulo = T.subtitulo !== undefined && T.grupo !== 'marca' ? T.subtitulo : 'Los precios más bajos del barrio';
  if (DOM.inpTitulo) DOM.inpTitulo.value = S.titulo; if (DOM.inpSub) DOM.inpSub.value = S.subtitulo;
}
function elegirFormato(id) {
  const L = LAYOUTS[id]; S.formato = id;
  if (!L.temas.includes(THEMES[S.tema].grupo)) { S.tema = temaPorDefecto(L); aplicarTextosDeTema(S.tema); }
  ACTIVO = { tipo: L.grupo === 'coleccion' ? 'foto' : 'producto', i: 0 };
  construirPanel(); cambio();
}
function elegirTema(id) { S.tema = id; aplicarTextosDeTema(id); pintarTemas(); if (DOM.sugerencias) DOM.sugerencias.replaceChildren(...chipsSugerencias()); cambio(); }
/** Miniatura del fondo de cada temática (con su decoración), para elegir viéndolo. Se dibuja una sola vez. */
const _miniTemas = new Map();
function miniTema(id) {
  if (_miniTemas.has(id)) return _miniTemas.get(id);
  const T = THEMES[id], W = 1240, H = 1754, esc = 0.1, c = document.createElement('canvas');
  c.width = Math.round(W * esc); c.height = Math.round(H * esc);
  const ctx = c.getContext('2d'), scBak = SC; setSC(esc); ctx.setTransform(esc, 0, 0, esc, 0, 0);
  try {
    drawBackground(ctx, W, H, T, 0.3, 0.06, 392);
    drawRibbon(ctx, 44, 226, W - 88, 104, T.titulo || 'Ofertas', T, { max: 100 });
    for (let r = 0; r < 4; r++) for (let k = 0; k < 2; k++) {
      rrPath(ctx, 44 + k * 588, 400 + r * 250, 564, 226, 26); ctx.fillStyle = T.card; ctx.fill();
      rrPath(ctx, 300 + k * 588, 560 + r * 250, 220, 56, 12); ctx.fillStyle = T.price[0]; ctx.fill();
    }
    ctx.fillStyle = T.footer; ctx.fillRect(0, 1420, W, 334);
  } catch (e) { console.error(e); }
  setSC(scBak);
  const url = c.toDataURL('image/png'); _miniTemas.set(id, url); return url;
}
function pintarTemas() {
  const L = L_ACTUAL();
  DOM.temas.replaceChildren(...[cajaProximasFechas()].filter(Boolean), ...L.temas.flatMap(g => {
    const ids = Object.keys(THEMES).filter(id => THEMES[id].grupo === g);
    return [h('p', { class: 'lab grp' }, NOMBRE_GRUPO_TEMA[g]),
      h('div', { class: 'temas-galeria' }, ...ids.map(id => h('button', { class: 'tema', type: 'button', title: 'Fondo: ' + THEMES[id].nombre, 'aria-pressed': String(S.tema === id), onclick: () => elegirTema(id) },
        h('img', { src: miniTema(id), alt: '' }), h('span', null, THEMES[id].nombre))))];
  }));
}
/** "Se viene el Día de la Madre (domingo 18 de octubre)": un clic pone la temática y las fechas. */
function cajaProximasFechas() {
  const prox = proximasFechas(new Date(), 45).filter(f => THEMES[f.tema]).slice(0, 2);
  if (!prox.length) return null;
  return h('div', { class: 'proximas' }, h('b', null, '📅 Se vienen estas fechas'),
    ...prox.map(f => h('div', { class: 'prox' },
      h('span', null, h('strong', null, THEMES[f.tema].nombre), ` · ${fechaLinda(f.fecha)} `, h('em', null, f.falta === 0 ? '(¡es hoy!)' : f.falta === 1 ? '(mañana)' : `(faltan ${f.falta} días)`)),
      h('button', { class: 'btn small' + (S.tema === f.tema ? ' on' : ''), type: 'button', onclick: () => usarFecha(f) }, S.tema === f.tema ? '✓ En uso' : 'Usar este fondo'))));
}
function usarFecha(f) {
  S.tema = f.tema; aplicarTextosDeTema(f.tema);
  if (!S.vigencia.desde) S.vigencia.desde = isoDe(new Date());
  if (!S.vigencia.hasta) S.vigencia.hasta = isoDe(f.fecha);
  construirPanel(); cambio();
  aviso(`Fondo «${THEMES[f.tema].nombre}» elegido. Vigencia hasta el ${fechaLinda(parseISO(S.vigencia.hasta))}: revisala en el paso 3.`);
}

// ── casilleros: elegir foto, activar, asignar ──
function setActivo(tipo, i) {
  if (ACTIVO.tipo === tipo && ACTIVO.i === i) return;
  ACTIVO = { tipo, i };
  $$('.prow', DOM.panel).forEach(f => f.classList.toggle('act', f.dataset.tipo === tipo && +f.dataset.i === i));
  programarDibujo();
}
const casilleroVacio = (tipo, i) => (tipo === 'foto' ? !srcDe(S.coleccion.fotos[i]) : productoVacio(S.productos[i]));
function textoCasillero(h_) {
  if (h_.tipo === 'barra') return 'Barra de la promo y fechas · clic para editar';
  if (h_.tipo === 'sello') return 'Sello · clic para cambiar lo que dice';
  if (h_.tipo === 'pie') return 'Pie del folleto · clic para cambiar la letra chica o la banda';
  const vacio = casilleroVacio(h_.tipo, h_.i), que = h_.tipo === 'foto' ? 'foto' : 'casillero';
  return `${que[0].toUpperCase() + que.slice(1)} ${h_.i + 1} · clic para ${vacio ? 'elegir ' + (h_.tipo === 'foto' ? 'la foto' : 'el producto') : 'editarlo'}`;
}
function hitEn(e) {
  const L = L_ACTUAL(), r = DOM.canvas.getBoundingClientRect();
  const x = (e.clientX - r.left) / r.width * L.w, y = (e.clientY - r.top) / r.height * L.h;
  for (let k = LAST_HITS.length - 1; k >= 0; k--) { const t = LAST_HITS[k]; if (x >= t.x && x <= t.x + t.w && y >= t.y && y <= t.y + t.h) return t; }
  return null;
}
function activarCasillero(tipo, i) {
  if (tipo === 'sello') { const b = $('#caja-sello', DOM.panel); if (b) { b.scrollIntoView({ block: 'center', behavior: 'smooth' }); b.classList.add('resalta'); setTimeout(() => b.classList.remove('resalta'), 1600); const inp = $('input[type=text]', b); if (inp && !inp.closest('[hidden]')) inp.focus({ preventScroll: true }); } return; }
  if (tipo === 'pie') { const b = $('#caja-pie', DOM.panel); if (b) { b.scrollIntoView({ block: 'center', behavior: 'smooth' }); b.classList.add('resalta'); setTimeout(() => b.classList.remove('resalta'), 1600); } return; }
  if (tipo === 'barra') { const b = $('#caja-barra', DOM.panel); if (b) { b.scrollIntoView({ block: 'center', behavior: 'smooth' }); b.classList.add('resalta'); setTimeout(() => b.classList.remove('resalta'), 1600); const inp = $('input[type=text]', b); if (inp) inp.focus({ preventScroll: true }); } return; }
  setActivo(tipo, i);
  if (casilleroVacio(tipo, i)) { elegirParaCasillero(i, tipo); return; }
  const fila = $(`.prow[data-tipo="${tipo}"][data-i="${i}"]`, DOM.panel);
  if (fila) { fila.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); const inp = $('.in-foco', fila); if (inp) inp.focus({ preventScroll: true }); }
}
/** Primer casillero libre a partir de `desde`. */
function primerLibre(tipo, desde = 0) {
  const arr = lista(tipo), lim = tipo === 'foto' ? arr.length : Math.min(L_ACTUAL().slots, arr.length);
  for (let k = desde; k < lim; k++) if (casilleroVacio(tipo, k)) return k;
  return -1;
}
/** Índices donde van `n` elementos: el casillero elegido y después los libres que le siguen. */
function destinosLibres(tipo, i, n) {
  const dest = [i]; let k = i + 1;
  const lim = tipo === 'foto' ? Math.min(MAX_FOTOS, S.coleccion.fotos.length + MAX_FOTOS) : Math.min(L_ACTUAL().slots, S.productos.length);
  while (dest.length < n && k < lim) {
    if (tipo === 'foto' && k >= S.coleccion.fotos.length && k < MAX_FOTOS) S.coleccion.fotos.push(nuevaFoto());
    if (k < lista(tipo).length && casilleroVacio(tipo, k)) dest.push(k);
    k++;
  }
  return dest;
}

async function elegirParaCasillero(i, tipo = 'producto', op = {}) {
  setActivo(tipo, i);
  if (CARPETA.activa) {
    const L = L_ACTUAL(), cuantos = tipo === 'foto' ? MAX_FOTOS : L.slots;
    const elegidos = await abrirSelector({ titulo: tipo === 'foto' ? `Foto ${i + 1} · elegí una foto ${CARPETA.nube ? 'de la nube' : 'de la carpeta'}` : `Casillero ${i + 1} · elegí el producto`, multi: !!op.multi, max: Math.max(1, cuantos - i) });
    if (elegidos && elegidos.length) await aplicarSeleccion(tipo, i, elegidos);
  } else {
    DOM.selArchivo.multiple = !!op.multi; DOM.selArchivo._destino = { tipo, i }; DOM.selArchivo.click();
  }
}
async function aplicarSeleccion(tipo, i, items) {
  const dest = destinosLibres(tipo, i, items.length);
  const n = Math.min(dest.length, items.length);
  for (let k = 0; k < n; k++) await (tipo === 'foto' ? asignarFoto(S.coleccion.fotos[dest[k]], items[k]) : asignarProducto(S.productos[dest[k]], items[k]));
  construirListaCasilleros(tipo === 'foto' ? 'foto' : 'producto', dest[0]);
  cambio();
  if (n < items.length) aviso(`Solo había lugar para ${n} de los ${items.length} elegidos. Los demás no se cargaron.`);
  else if (tipo === 'producto') { const f = $(`.prow[data-tipo="producto"][data-i="${dest[0]}"] .in-foco`, DOM.panel); if (f && n === 1) f.focus(); }
}
/** Precio recordado de una foto. Si la foto cambió de extensión (la IA la pasa de .jpg a .png), lo busca por el nombre. */
function recordadoDe(ruta) {
  if (!ruta || CAT[ruta]) return CAT[ruta] || null;
  const sinExt = r => String(r).replace(/\.[^./]+$/, ''), base = sinExt(ruta);
  let mejor = null;
  for (const [k, v] of Object.entries(CAT)) if (sinExt(k) === base && (!mejor || (v.ts || 0) > (mejor.ts || 0))) mejor = v;
  return mejor;
}
async function asignarProducto(p, it) {
  let info = { alfa: false, claro: false };
  try { info = await analizarFoto(urlImagen(it.ruta, it.mtime)); } catch (e) { /* se marca como faltante al dibujar */ }
  const m = recordadoDe(it.ruta);
  Object.assign(p, { archivo: it.ruta, mtime: it.mtime, img: null, demo: null, imgV: (p.imgV || 0) + 1, alfa: info.alfa, quitarFondo: !info.alfa && info.claro, zoom: 1, dx: 0, dy: 0, tol: 40,
    nombre: (m && m.nombre) || it.nombre, desc: (m && m.desc) || '', regular: (m && m.regular) || '', final: (m && m.final) || '', unidad: (m && m.unidad) || '', etiqueta: (m && m.etiqueta) || '', nota: (m && m.nota) || '', pct: '', pago: '', recordado: !!(m && m.final) });
}
async function asignarFoto(f, it) {
  let info = { alfa: false, claro: false };
  try { info = await analizarFoto(urlImagen(it.ruta, it.mtime)); } catch (e) { /* idem */ }
  Object.assign(f, { archivo: it.ruta, mtime: it.mtime, img: null, demo: null, imgV: (f.imgV || 0) + 1, alfa: info.alfa, quitarFondo: !info.alfa && info.claro, tol: 40, titulo: f.titulo || it.nombre });
}
/** Página suelta (sin carpeta): las fotos elegidas con el selector del sistema se incrustan en el folleto. */
async function cargarArchivos(files, tipo, i) {
  const imgs = [...files].filter(f => /^image\//.test(f.type));
  if (!imgs.length) return;
  const dest = destinosLibres(tipo, i, imgs.length);
  let n = 0;
  for (let k = 0; k < Math.min(dest.length, imgs.length); k++) {
    try {
      const r = await leerArchivoImagen(imgs[k]), o = lista(tipo)[dest[k]], base = nombreLindo(imgs[k].name.replace(/\.[^.]+$/, ''));
      Object.assign(o, { img: r.url, archivo: null, demo: null, imgV: (o.imgV || 0) + 1, alfa: r.alfa, quitarFondo: !!r.claro, zoom: 1, dx: 0, dy: 0 });
      if (tipo === 'foto') o.titulo = o.titulo || base; else Object.assign(o, { nombre: esNombreDeCamara(base) ? '' : base, desc: '', regular: '', final: '', recordado: false });
      n++;
    } catch (e) { console.error(e); }
  }
  construirListaCasilleros(tipo, dest[0]); cambio();
  aviso(n ? (n === 1 ? 'Foto cargada.' : n + ' fotos cargadas.') : 'No pude leer esa imagen. Probá con un archivo JPG o PNG.');
}
const esNombreDeCamara = s => /^(img|dsc|pxl|mvimg|vid|wa|screenshot|captura|whatsapp image|imagen|image|foto|photo|pic)\b/i.test(s.trim()) || /\d{8,}/.test(s) || !s.trim();
const nombreLindo = s => s.replace(/[_]+/g, ' ').replace(/\s+/g, ' ').trim();

// ── filas de casilleros ──
const resumenPrecio = p => { const F = parsePrecio(p.final); return F ? '$' + F.int + (F.dec ? ',' + F.dec : '') : ''; };
function campoMini(etq, input) { return h('label', { class: 'mini' }, h('span', null, etq), h('span', { class: 'peso' }, input)); }
function irAlPrecio(i) {
  const sig = $(`.prow[data-tipo="producto"][data-i="${i}"] .in-foco`, DOM.panel);
  if (sig) { sig.focus(); sig.select(); } else if (document.activeElement) document.activeElement.blur();
}

/** Nota automática para las promos por cantidad (por unidad, hacia arriba: nunca menos de lo que se cobra). */
function notaDeInsignia(et, final) {
  const F = parsePrecio(final); if (!F) return '';
  const cu = (total, n) => '$' + precioATexto(Math.ceil(total * 100 / n) / 100);
  const t = et.toUpperCase();
  if (t === '2X1') return `Llevando 2 pagás 1: ${cu(F.num, 2)} c/u`;
  if (t === '3X2') return `Llevando 3 pagás 2: ${cu(F.num * 2, 3)} c/u`;
  const m = /^2DA AL (\d+)%$/.exec(t);
  if (m) return `Llevando 2, la 2.ª al ${m[1]}%: ${cu(F.num * (2 - +m[1] / 100), 2)} c/u`;
  return '';
}
function cuerpoMas(p, i) {
  const inEtq = texto(p, 'etiqueta', { ph: 'Auto (-10%) o 2x1, LLEVÁ 3', max: 24 }), inNota = texto(p, 'nota', { ph: 'Ej.: Stock: 24 u. · Llevando 3: $6.200 c/u', max: 60 });
  const usarInsignia = t => {
    p.etiqueta = p.etiqueta === t ? '' : t; inEtq.value = p.etiqueta;
    const n = p.etiqueta ? notaDeInsignia(p.etiqueta, p.final) : '';
    if (n && (!p.nota || p.notaAuto)) { p.nota = n; p.notaAuto = true; inNota.value = n; }
    else if (!p.etiqueta && p.notaAuto) { p.nota = ''; p.notaAuto = false; inNota.value = ''; }
    cambio();
  };
  inNota.addEventListener('input', () => { p.notaAuto = false; });
  const campos = h('div', { class: 'stack' },
    campo('Descripción', texto(p, 'desc', { ph: 'Ej.: Feteado fino · pieza entera', max: 90 }), 'opcional'),
    h('div', { class: 'grid2' },
      campo('Unidad', texto(p, 'unidad', { ph: 'x kg, c/u, x fardo…', list: 'lista-unidades', max: 14 }), 'opcional'),
      campo('Insignia', inEtq, 'opcional')),
    h('div', { class: 'insignias' }, h('span', { class: 'lab' }, 'Promos por cantidad y etiquetas (tocá una):'),
      h('div', { class: 'insig-lista' }, ...INSIGNIAS.map(t => h('button', { type: 'button', class: 'insig', 'aria-pressed': String(String(p.etiqueta || '').toUpperCase() === t.toUpperCase()), onclick: e => { usarInsignia(t); $$('.insig', e.currentTarget.parentNode).forEach(b => b.setAttribute('aria-pressed', String(String(p.etiqueta || '').toUpperCase() === b.textContent.toUpperCase()))); } }, t)))),
    campo('Nota bajo el precio', inNota, 'opcional'),
    check('No mostrar “Ahorrás $…” en este producto', null, !!p.noAhorro, v => { p.noAhorro = v; cambio(); }));
  return h('div', { class: 'stack' }, campos, controlesFoto(p, i, 'producto'), accionesFila(i));
}
/** Fondo, tamaño y posición de la foto (sirve para productos y para fotos de colección). */
function controlesFoto(p, i, tipo) {
  const tol = h('input', { type: 'range', min: '8', max: '110', step: '2', value: String(p.tol || 40), 'aria-label': 'Sensibilidad para quitar el fondo', oninput: e => { p.tol = +e.target.value; cambio(); } });
  const fondoBox = h('div', { class: 'stack', hidden: !p.quitarFondo || null }, h('label', { class: 'fld' }, h('span', null, 'Sensibilidad del fondo ', h('em', null, '· subila si quedan restos de fondo')), tol));
  const chkFondo = check('Quitar fondo blanco', 'Funciona con fotos de fondo liso y claro.', p.quitarFondo, v => { p.quitarFondo = v; fondoBox.hidden = !v; cambio(); });
  const botIA = p.esperaIA ? h('button', { class: 'btn small', type: 'button', disabled: true }, 'Quitando el fondo… (1 a 3 min)')
    : (CARPETA.hayIA && CARPETA.puedeSubir && p.archivo && !p.alfa && !/\(sin fondo\)/i.test(p.archivo))
      ? h('button', { class: 'btn small', type: 'button', onclick: ev => recortarConIA(p, i, tipo, ev.currentTarget) }, 'Quitar fondo con IA')
      : null;
  const zoom = h('input', { type: 'range', min: '0.5', max: '1.7', step: '0.02', value: String(p.zoom || 1), 'aria-label': 'Tamaño de la foto', oninput: e => { p.zoom = +e.target.value; cambio(); } });
  const dx = h('input', { type: 'range', min: '-0.4', max: '0.4', step: '0.01', value: String(p.dx || 0), 'aria-label': 'Mover foto a los costados', oninput: e => { p.dx = +e.target.value; cambio(); } });
  const dy = h('input', { type: 'range', min: '-0.3', max: '0.3', step: '0.01', value: String(p.dy || 0), 'aria-label': 'Subir o bajar la foto', oninput: e => { p.dy = +e.target.value; cambio(); } });
  const reset = h('button', { class: 'btn small ghost', type: 'button', onclick: () => { p.zoom = 1; p.dx = 0; p.dy = 0; construirListaCasilleros(tipo, i); cambio(); } }, 'Centrar');
  const ajustes = tipo === 'producto' ? h('details', { class: 'more' }, h('summary', null, 'Ajustar tamaño y posición de la foto'),
    h('div', { class: 'stack', style: 'margin-top:8px' }, campo('Tamaño', zoom), h('div', { class: 'grid2' }, campo('Izquierda ↔ derecha', dx), campo('Arriba ↕ abajo', dy)), reset)) : null;
  return h('div', { class: 'stack' }, chkFondo, fondoBox, botIA ? h('div', { class: 'row-actions' }, botIA, h('small', { class: 'hint' }, CARPETA.nube ? 'GitHub crea una copia sin fondo y la foto se cambia sola en el folleto.' : 'Crea una copia sin fondo en la carpeta de productos.')) : null, ajustes);
}
async function recortarConIA(p, i, tipo, btn) {
  const orig = btn.textContent; btn.disabled = true; btn.textContent = CARPETA.nube ? 'Pidiendo el recorte…' : 'Recortando… (unos segundos)';
  if (CARPETA.nube) {
    try {
      const r = await NUBE.encolarRecorte(p.archivo);
      p.esperaIA = r.final; p.esperaIAentrada = r.entrada; btn.textContent = 'Quitando el fondo… (1 a 3 min)'; guardarAuto();
      aviso('Listo: GitHub le está quitando el fondo. En 1 a 3 minutos la foto se cambia sola en el folleto.', 6500);
    } catch (e) { aviso(e.message); btn.disabled = false; btn.textContent = orig; }
    return;
  }
  try {
    const r = await API.recortar(p.archivo);
    Object.assign(p, { archivo: r.ruta, mtime: r.mtime, imgV: (p.imgV || 0) + 1, alfa: true, quitarFondo: false });
    aviso(`Listo: guardé «${r.nombre} (sin fondo)» en la carpeta de productos.`);
    construirListaCasilleros(tipo, i); cambio();
  } catch (e) { aviso(e.message); btn.disabled = false; btn.textContent = orig; }
}
function accionesFila(i) {
  const mover = d => { const j = i + d; if (j < 0 || j >= S.productos.length) return; [S.productos[i], S.productos[j]] = [S.productos[j], S.productos[i]]; ACTIVO = { tipo: 'producto', i: j }; construirListaCasilleros('producto', j); cambio(); };
  const quitar = () => { S.productos.splice(i, 1); S.productos.push(nuevoProducto()); construirListaCasilleros('producto'); cambio(); };
  return h('div', { class: 'row-actions' },
    h('button', { class: 'btn small', type: 'button', disabled: i === 0 || null, onclick: () => mover(-1) }, 'Subir ↑'),
    h('button', { class: 'btn small', type: 'button', disabled: i >= S.productos.length - 1 || null, onclick: () => mover(1) }, 'Bajar ↓'),
    h('button', { class: 'btn small danger ghost', type: 'button', onclick: quitar }, 'Quitar este producto'));
}

/** Condición del descuento de cada producto: la del folleto, ninguna, o un medio de pago propio (MP, efectivo, tarjeta…). */
function selectorCondicion(p) {
  const PG = promoInfo(S), gen = PG ? PG.nombre : 'sin condición';
  const sel = h('select', { class: 'cond', 'aria-label': 'Condición del descuento de este producto', onchange: e => { p.pago = e.target.value; cambio(); } },
    h('option', { value: '' }, `Como el folleto (${gen})`), h('option', { value: 'ninguno' }, 'Para todos (sin condición de pago)'),
    ...Object.entries(PAGOS).filter(([k]) => k !== 'texto' && (!PG || PG.tipo !== k)).map(([k, P]) => h('option', { value: k }, P.nombre)));
  sel.value = p.pago && (p.pago === 'ninguno' || (PAGOS[p.pago] && (!PG || PG.tipo !== p.pago))) ? p.pago : '';
  return h('label', { class: 'cond-fila' }, h('span', null, 'Descuento válido:'), sel);
}
function filaProducto(p, i) {
  const L = L_ACTUAL(), usado = i < L.slots, vacio = productoVacio(p), mini = srcMini(p);
  const fila = h('div', { class: 'prow' + (usado ? '' : ' off') + (p.recordado ? ' recordado' : '') + (ACTIVO.tipo === 'producto' && ACTIVO.i === i ? ' act' : ''), 'data-tipo': 'producto', 'data-i': String(i) });
  const thumb = h('button', { class: 'pthumb' + (mini ? '' : ' vacio'), type: 'button', title: mini ? 'Cambiar producto' : 'Elegir producto', 'aria-label': `Casillero ${i + 1}: ${mini ? 'cambiar producto' : 'elegir producto'}`, onclick: () => elegirParaCasillero(i) },
    mini ? h('img', { src: mini, alt: '' }) : [h('b', null, '+'), h('span', null, 'Elegir')]);
  const nombre = texto(p, 'nombre', { ph: vacio ? 'Elegí un producto o escribí el nombre' : 'Nombre del producto', max: 60 });
  // Antes · % · Oferta: con el precio anterior y el %, la oferta se calcula sola (con centavos, sin redondear)
  const sinRecordado = () => { if (p.recordado) { p.recordado = false; fila.classList.remove('recordado'); } };
  const pctPh = () => { const I = infoProducto(p); return I.pct ? String(I.pct) : ''; };
  const recalcular = () => { const v = ofertaDesde(p.regular, p.pct); if (v != null) { p.final = precioATexto(v); oferta.value = p.final; sinRecordado(); } };
  const antes = texto(p, 'regular', { ph: 'ej. 20.000', mode: 'decimal', max: 14, after: () => { if (p.pct) recalcular(); pct.placeholder = pctPh(); cambio(); } });
  const pct = h('input', { type: 'text', value: p.pct || '', placeholder: pctPh(), inputmode: 'decimal', autocomplete: 'off', maxlength: 5, 'aria-label': 'Porcentaje de descuento',
    oninput: e => { p.pct = e.target.value.replace(/[^\d.,]/g, ''); if (p.pct && !parsePrecio(p.regular)) { refrescarLecturas(); return; } recalcular(); cambio(); } });
  const oferta = texto(p, 'final', { ph: 'ej. 18.000', mode: 'decimal', max: 14, after: () => { sinRecordado(); if (p.pct) { p.pct = ''; pct.value = ''; } pct.placeholder = pctPh(); cambio(); } });
  oferta.classList.add('in-foco');
  oferta.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); irAlPrecio(i + 1); } });
  pct.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); irAlPrecio(i + 1); } });
  fila.append(h('span', { class: 'pnum' }, String(i + 1)), thumb,
    h('div', { class: 'pcampos' }, nombre,
      h('div', { class: 'pprecios' }, campoMini('Precio normal', antes), h('label', { class: 'mini' }, h('span', null, '% desc.'), h('span', { class: 'pct' }, pct)), campoMini('Precio final', oferta)),
      selectorCondicion(p),
      h('div', { class: 'calc', 'data-calc': String(i) })),
    h('details', { class: 'pmas' }, h('summary', null, 'Más opciones: 2x1, 3x2, 2.ª al 50 %, unidad, nota, foto'), cuerpoMas(p, i)));
  fila.addEventListener('focusin', () => setActivo('producto', i));
  return fila;
}
function filaFoto(f, i) {
  const mini = srcMini(f);
  const fila = h('div', { class: 'prow foto' + (ACTIVO.tipo === 'foto' && ACTIVO.i === i ? ' act' : ''), 'data-tipo': 'foto', 'data-i': String(i) });
  const thumb = h('button', { class: 'pthumb' + (mini ? '' : ' vacio'), type: 'button', title: mini ? 'Cambiar foto' : 'Elegir foto', 'aria-label': `Foto ${i + 1}: ${mini ? 'cambiar' : 'elegir'}`, onclick: () => elegirParaCasillero(i, 'foto') },
    mini ? h('img', { src: mini, alt: '' }) : [h('b', null, '+'), h('span', null, 'Elegir')]);
  const titulo = texto(f, 'titulo', { ph: 'Texto sobre la foto (opcional)', max: 40 });
  titulo.classList.add('in-foco');
  const quitar = () => { S.coleccion.fotos.splice(i, 1); while (S.coleccion.fotos.length < 3) S.coleccion.fotos.push(nuevaFoto()); construirListaCasilleros('foto'); cambio(); };
  fila.append(h('span', { class: 'pnum' }, String(i + 1)), thumb,
    h('div', { class: 'pcampos' }, campo('Etiqueta de la foto', titulo), h('div', { class: 'calc', 'data-calc': 'f' + i })),
    h('details', { class: 'pmas' }, h('summary', null, 'Más opciones'), h('div', { class: 'stack' },
      controlesFoto(f, i, 'foto'), h('div', { class: 'row-actions' }, h('button', { class: 'btn small danger ghost', type: 'button', onclick: quitar }, 'Quitar esta foto')))));
  fila.addEventListener('focusin', () => setActivo('foto', i));
  return fila;
}
function construirListaCasilleros(tipo, foco) {
  const cont = DOM.prods; if (!cont) return;
  if (tipo === 'foto') cont.replaceChildren(...S.coleccion.fotos.map((f, i) => filaFoto(f, i)));
  else {
    const L = L_ACTUAL(), usados = S.productos.slice(0, L.slots).map((p, i) => filaProducto(p, i)), resto = S.productos.slice(L.slots).filter(p => !productoVacio(p)).map((p, k) => filaProducto(p, k + L.slots));
    const kids = [...usados];
    if (resto.length) kids.push(h('details', { class: 'more guardados' }, h('summary', null, `Otros productos guardados (${resto.length})`), h('p', { class: 'hint' }, 'No entran en este formato, pero quedan guardados por si cambiás de formato.'), ...resto));
    cont.replaceChildren(...kids);
  }
  if (foco != null) { const f = $(`.prow[data-tipo="${tipo}"][data-i="${foco}"]`, cont); if (f) { ACTIVO = { tipo, i: foco }; f.classList.add('act'); } }
  refrescarLecturas();
}
const pintarProductos = () => construirListaCasilleros(esColeccion() ? 'foto' : 'producto');

// ── lecturas en vivo (descuento, advertencias, revisión) ──
function refrescarLecturas() {
  if (!DOM.panel) return;
  $$('.prow[data-tipo="producto"]', DOM.panel).forEach(f => {
    const i = +f.dataset.i, p = S.productos[i]; if (!p) return;
    const c = $('[data-calc]', f); if (!c) return;
    c.classList.remove('bad');
    if (faltaArchivo(p)) { c.classList.add('bad'); c.textContent = 'No encuentro esa foto en la carpeta de productos. Elegí el producto de nuevo.'; return; }
    const I = infoProducto(p), cp = chipProducto(p, S);
    const tx = s => document.createTextNode(s);
    const conPromo = cp ? (cp.price ? [tx(' · ' + cp.label.toLowerCase() + ' '), h('b', null, cp.price + (cp.P.extra ? '' : ' c/u'))] : [tx(' · ' + cp.label.toLowerCase())]) : [];
    const pv = parseFloat(String(p.pct || '').replace(',', '.'));
    if (p.pct && !(pv > 0 && pv < 100)) { c.classList.add('bad'); c.textContent = 'El % de descuento tiene que ser mayor que 0 y menor que 100.'; return; }
    if (p.pct && !I.R) { c.classList.add('bad'); c.textContent = 'Para calcular con el %, escribí primero el precio normal.'; }
    else if (I.F && I.R) {
      if (I.R.num > I.F.num) c.replaceChildren(tx('Normal '), h('s', null, txtPrecio(I.R)), tx(p.pct ? ` − ${p.pct}% = final ` : ' → final '), h('b', null, txtPrecio(I.F)), tx(p.pct ? '' : ` (${I.pct}% OFF)`), tx(' · ahorra '), h('b', null, pesos(I.ahorro)), ...conPromo);
      else { c.classList.add('bad'); c.textContent = 'El precio anterior es menor o igual al de oferta: no se muestra descuento.'; }
    } else if (I.F) { if (p.recordado) c.textContent = 'Es el precio de la última vez: revisalo.'; else c.replaceChildren(...(conPromo.length ? [tx('Final '), h('b', null, txtPrecio(I.F)), ...conPromo] : [])); }
    else c.textContent = productoVacio(p) ? '' : 'Escribí el precio normal y el % (o directamente el precio final).';
  });
  $$('.prow[data-tipo="foto"]', DOM.panel).forEach(f => {
    const i = +f.dataset.i, o = S.coleccion.fotos[i]; if (!o) return;
    const c = $('[data-calc]', f); if (!c) return; c.classList.remove('bad');
    if (faltaArchivo(o)) { c.classList.add('bad'); c.textContent = 'No encuentro esa foto en la carpeta de productos. Elegila de nuevo.'; }
    else if (srcDe(o) && !o.alfa && !o.quitarFondo) c.textContent = 'La foto tiene fondo: sale dentro de un marco blanco. Probá «Quitar fondo».';
    else c.textContent = '';
  });
  pintarRevision(); pintarPieVista();
}
function calcularRevision() {
  const L = L_ACTUAL(), g = L.grupo, V = S.vigencia, out = [];
  const ok = (t, d) => out.push({ k: 'ok', t, d }), warn = (t, d) => out.push({ k: 'warn', t, d }), info = (t, d) => out.push({ k: 'info', t, d });
  if (g === 'coleccion') {
    const hay = S.coleccion.fotos.filter(f => srcDe(f)).length;
    if (!hay) warn('Todavía no hay fotos', 'Elegí al menos una foto de la carpeta de productos.');
    else ok(hay + (hay === 1 ? ' foto elegida' : ' fotos elegidas'));
    if (S.coleccion.fotos.some(f => srcDe(f) && !f.alfa && !f.quitarFondo)) info('Hay fotos con fondo', 'Salen dentro de un marco blanco. Si querés que se vean recortadas, usá fotos sin fondo.');
    if (S.coleccion.alcohol) ok('Leyenda de alcohol incluida', 'Ley 24.788: “Beber con moderación” y “Prohibida su venta a menores de 18 años”.');

  } else {
    const prods = S.productos.slice(0, L.slots), usados = prods.filter(p => !productoVacio(p));
    if (V.desde && V.hasta) ok('Fechas de inicio y fin cargadas', 'La Ley 24.240 (art. 7) pide fecha precisa de comienzo y de finalización.');
    else warn('Falta la fecha de ' + (V.hasta ? 'inicio' : 'inicio y fin'), 'La Ley 24.240 (art. 7) pide las dos fechas, y además generan urgencia. Completalas en el paso 3.');
    if (V.agotar && !String(S.legal.stock || '').trim() && !usados.every(p => /stock|unid|u\.|fardo/i.test(p.nota || '')))
      warn('“Hasta agotar stock” sin cantidad', 'El Dto. 1798/94 (art. 7) pide informar con cuántas unidades contás. Escribilo en Legales o en la nota de cada producto.');
    const P = promoInfo(S);
    if (P) info('Promo de pago: ' + (P.pct ? (P.extra ? '+' : '') + P.pct + '% ' : '') + P.texto.toLowerCase(), (P.extra ? 'OJO: está como descuento ADICIONAL: se resta otra vez sobre el precio final. Si el % ya está en el precio final, cambialo a “Ya está en el precio final”. ' : 'El % ya está en el precio final de cada producto (no se descuenta dos veces); vale pagando de esa forma. ') + 'Dejá claras las condiciones y la fecha de vigencia en el lugar donde consultar.');
    const hayAlcohol = usados.some(p => RE_ALCOHOL.test((p.nombre || '') + ' ' + (p.desc || '')));
    if (alcoholActivo(S)) ok('Leyenda de alcohol incluida', 'Ley 24.788: “Beber con moderación” y “Prohibida su venta a menores de 18 años”.');
    else if (hayAlcohol) info('Leyenda de alcohol apagada', 'Si alguna vez la querés, se activa en «Legales» (Ley 24.788: “Beber con moderación. Prohibida su venta a menores de 18 años”).');
    const sinPrecio = usados.filter(p => !parsePrecio(p.final)).length, sinFoto = usados.filter(p => !srcDe(p)).length, vacios = prods.length - usados.length;
    const rotas = usados.filter(faltaArchivo);
    if (rotas.length) warn((rotas.length === 1 ? 'Una foto no cargó: ' : rotas.length + ' fotos no cargaron: ') + rotas.slice(0, 4).map(p => String(p.nombre || 'sin nombre').trim()).join(', ') + (rotas.length > 4 ? '…' : ''),
      'Saldrían sin foto. Puede ser internet lento, o que la foto se haya borrado o cambiado de nombre en la otra computadora. Esperá un momento y volvé a tocar Finalizar, o elegí la foto de nuevo.');
    if (g === 'mensaje' && !String(S.mensaje.titulo || '').trim()) warn('Falta el título del mensaje', 'Escribilo en el paso 2.');
    const distintos = P && P.pct ? usados.filter(p => (!p.pago || p.pago === P.tipo) && infoProducto(p).R && infoProducto(p).pct !== P.pct && pctReal(infoProducto(p).R.num, infoProducto(p).F ? infoProducto(p).F.num : 0) !== P.pct).length : 0;
    if (distintos) warn(`${distintos} ${distintos === 1 ? 'producto tiene' : 'productos tienen'} un % distinto al de la barra (${P.pct}%)`, 'La barra dice ' + P.pct + '% y esos productos muestran otro descuento. Corregilos o usá “Descuento para todos”, así el folleto dice lo mismo en todos lados.');
    if (P && P.cuotas) ok('Cuotas sin interés: leyenda del CFT incluida', 'Res. 4/2025: con cuotas se informa precio de contado, cantidad de cuotas y CFT. Va al pie: “CFT 0,00 %”.');
    if (!usados.length && g !== 'mensaje') warn('Todavía no hay productos', 'Tocá un casillero del folleto (o el botón +) para elegir un producto de la carpeta.');
    if (vacios && usados.length) warn(vacios + (vacios === 1 ? ' casillero vacío' : ' casilleros vacíos'), 'En el folleto terminado se completan con una tarjeta de Rivero Market («Y muchas ofertas más en el local»). Si preferís otro formato con menos productos, cambialo en el paso 1.');
    if (sinPrecio) warn(sinPrecio + (sinPrecio === 1 ? ' producto sin precio' : ' productos sin precio'), 'Un precio vacío se imprime como $0.');
    if (sinFoto) warn(sinFoto + (sinFoto === 1 ? ' producto sin foto' : ' productos sin foto'), 'Sin foto se ve el logo en su lugar.');
    const sinDesc = usados.filter(p => { const I = infoProducto(p); return I.R && I.F && I.R.num <= I.F.num; }).length;
    if (sinDesc) warn(sinDesc + ' con “precio anterior” menor o igual a la oferta', 'No se muestra descuento en esos productos.');
    if (g !== 'mensaje') info('El precio “Antes” tiene que ser el real', 'Si nunca lo cobraste, es publicidad engañosa (Dto. 274/2019, art. 11). El % que se muestra se redondea hacia abajo, así nunca anunciás más descuento que el real.');
    if (g !== 'mensaje') info('Precios finales', 'Mostrá siempre el precio final (con impuestos incluidos). Si hay precio por kg o litro, ponelo en letra menor.');
  }
  if ((+(S.cuadros || {}).margen || 1) < 0.7 && L.pdf === 'A4' && L.grupo !== 'mensaje' && L.grupo !== 'coleccion') warn('Los cuadros quedaron muy pegados al borde de la hoja', 'Muchas impresoras no imprimen los últimos 4 o 5 mm: subí el margen a 70 % o más en «Cuadros de productos».');
  if (S.legal.banda && (+S.legal.bandaTam || 1) < 1 && (L.pdf === 'A4' || planDestino(S, 'a4').length)) warn('La letra de la banda quedó chica para A4', 'La Res. 446/2025 pide letras de al menos 4 mm en el folleto impreso: subí el tamaño a 100 % en «Pie del folleto».');
  if (S.legal.letraChica === false && g !== 'coleccion') info('Letra chica apagada', 'Las fechas y la condición de pago se siguen viendo en la barra de arriba. Las demás condiciones tienen que estar en: ' + (S.comercio.consulta || 'el lugar que indica la banda') + '.');
  if (S.legal.banda) ok('Banda legal al pie activada', 'Res. 446/2025: ancho completo, mínimo 5 % del alto y letras de 4 mm (en A4). Asegurate de que la info esté en: ' + (S.comercio.consulta || '—'));
  else warn('Banda legal desactivada', 'Para folletos, la Res. 446/2025 pide la leyenda “Para más información o limitaciones aplicables consulte en…” al pie.');
  if (S.comercio.waCanal && qrMatrix(S.comercio.waCanal)) ok('QR del canal de WhatsApp', 'Para redes: pegá también el link en el texto de la publicación, porque desde el mismo celular no se puede escanear.');
  else warn('Falta el link del canal de WhatsApp', 'Cargalo en «Datos del local» para que salga el QR.');
  return out;
}
function pintarRevision() {
  if (!DOM.checks) return;
  DOM.checks.replaceChildren(...calcularRevision().map(r => h('li', { class: r.k }, h('span', { class: 'ic', 'aria-hidden': 'true' }, r.k === 'ok' ? '✓' : r.k === 'warn' ? '!' : 'i'), h('span', null, r.t, r.d ? h('small', null, r.d) : null))));
}

// ── secciones del panel ──
function ejemploNota() {
  if (!(S.avisoEjemplo && (S.productos.some(p => p.demo) || S.coleccion.fotos.some(f => f.demo)))) return null;
  return h('div', { class: 'demo-note' }, h('b', null, 'Esto es un ejemplo. '), 'Los productos son botellas de muestra (no son fotos reales) y las fotos de repostería son las que me mandaste. Cuando quieras, empezá un folleto propio.',
    h('div', { class: 'row-actions', style: 'margin-top:8px' },
      CARPETA.activa ? h('button', { class: 'btn small primary', type: 'button', onclick: () => nuevoFolleto(true) }, 'Empezar un folleto nuevo') : null,
      h('button', { class: 'btn small', type: 'button', onclick: () => { S.avisoEjemplo = false; construirPanel(); guardarAuto(); } }, 'Entendido')));
}
function seccionProductos() {
  const L = L_ACTUAL();
  DOM.prods = h('div', { class: 'prods' });
  const acc = h('div', { class: 'row-actions' },
    h('button', { class: 'btn small primary', type: 'button', onclick: () => { const i = primerLibre('producto'); if (i < 0) { aviso('No hay casilleros libres. Tocá un casillero para cambiar su producto, o quitá alguno primero.'); return; } elegirParaCasillero(i, 'producto', { multi: true }); } }, CARPETA.activa ? (CARPETA.nube ? '＋ Elegir varios de la nube' : '＋ Elegir varios de la carpeta') : '＋ Elegir varias fotos'),
    h('button', { class: 'btn small ghost', type: 'button', onclick: async () => { if (await confirmar('¿Vaciar todos los casilleros?', 'Se quitan todos los productos de este folleto. Las fotos de la carpeta no se tocan.', 'Vaciar todo', 'Cancelar')) { S.productos = Array.from({ length: Math.max(10, S.productos.length) }, () => nuevoProducto()); construirListaCasilleros('producto'); cambio(); } } }, 'Vaciar todos'));
  const inputFotos = h('input', { type: 'file', id: 'input-fotos-lote', accept: 'image/png,image/jpeg,image/webp', multiple: true, hidden: true, onchange: async e => {
    const fs = [...e.target.files]; e.target.value = ''; if (!fs.length) return;
    const creados = await agregarFotosALaCarpeta(fs);
    if (creados && creados.length && !creados.enCola) aviso(`Guardé ${creados.length} ${creados.length === 1 ? 'foto' : 'fotos'} ${CARPETA.nube ? 'en la nube' : 'en tu carpeta de productos'}. Ya ${creados.length === 1 ? 'la podés' : 'las podés'} elegir en los casilleros.`);
  } });
  if (CARPETA.activa) acc.append(h('button', { class: 'btn small', type: 'button', onclick: () => { if (CARPETA.puedeSubir) inputFotos.click(); else { aviso('Para subir fotos a la nube, primero conectá tu cuenta de GitHub.'); abrirConectar(); } } }, CARPETA.hayIA ? '✂ Fotos nuevas · quitar fondo en lote' : '＋ Fotos nuevas a la carpeta'), inputFotos);
  acc.append(h('button', { class: 'btn small ghost', type: 'button', onclick: () => abrirPegarPlanilla() }, '📋 Pegar precios desde Excel'));
  const ayudaFotos = CARPETA.hayIA
    ? h('p', { class: 'hint' }, CARPETA.nube ? 'Sacá las fotos de tus productos como quieras (con el celular, sobre cualquier fondo), tocá «✂ Fotos nuevas» y poneles nombre: GitHub les quita el fondo con IA y en unos minutos quedan en la nube, listas para los folletos en cualquier computadora.' : 'Sacá las fotos de tus productos como quieras (sobre cualquier fondo), tocá «✂ Fotos nuevas», poneles nombre y el programa les quita el fondo con IA y las deja guardadas y bien presentadas para los folletos.')
    : null;
  return seccion(paso(2, 'Productos y precios'), `${L.slots} ${L.slots === 1 ? 'casillero' : 'casilleros'}`,
    h('p', { class: 'hint' }, CARPETA.activa ? `Tocá un casillero del folleto, o la foto de la lista, para elegir el producto ${CARPETA.nube ? 'de tus fotos en la nube' : 'de tu carpeta'}. El nombre y el último precio se cargan solos.` : 'Tocá un casillero para subir su foto. Podés pegar una imagen con Ctrl+V.'),
    cajaLeyendaPrecio(), cajaCuadros(), acc, ayudaFotos, DOM.prods, h('datalist', { id: 'lista-unidades' }, ...UNIDADES.map(u => h('option', { value: u }))));
}
// ── pegar precios desde una planilla (Excel, Google Sheets o texto) ──
const esNumeroPrecio = c => /^\$?\s*[\d.,]+\s*$/.test(String(c).trim()) && /\d/.test(c);
/** Lee filas "nombre · precio antes · precio oferta (· descripción)". Acepta tabulaciones (copiado de Excel), punto y coma o barra. */
function leerPlanilla(txt) {
  return String(txt || '').split(/\r?\n/).map(l => l.trim()).filter(Boolean).map(l => {
    const cel = (l.includes('\t') ? l.split('\t') : l.includes(';') ? l.split(';') : l.split('|')).map(c => c.trim());
    const nums = cel.filter(esNumeroPrecio), textos = cel.filter(c => c && !esNumeroPrecio(c) && !/^-?\d+([.,]\d+)?\s*%$/.test(c));
    const pctCel = cel.find(c => /^\d+([.,]\d+)?\s*%$/.test(c));
    if (!textos.length || /^(producto|nombre|art[ií]culo|descripci[oó]n)$/i.test(textos[0])) return null;   // fila de títulos o sin nombre
    const ps = nums.map(n => ({ t: n.replace(/[$\s]/g, ''), v: (parsePrecio(n) || { num: 0 }).num }));
    let regular = '', final = '';
    if (ps.length >= 2) { const [a, b] = ps; if (a.v >= b.v) { regular = a.t; final = b.t; } else { regular = b.t; final = a.t; } }
    else if (ps.length === 1) final = ps[0].t;
    const pct = pctCel ? pctCel.replace(/\s*%/, '') : '';
    if (pct && regular && !final) final = precioATexto(ofertaDesde(regular, pct));
    if (pct && !regular && final) { regular = final; final = precioATexto(ofertaDesde(regular, pct)); }
    return { nombre: textos[0], desc: textos[1] || '', regular, final, pct };
  }).filter(Boolean);
}
/** La foto de la carpeta que mejor coincide con el nombre (todas las palabras del nombre de la foto tienen que estar). */
function mejorFoto(nombre, fotos) {
  const pal = sinTildes(nombre).split(/[^a-z0-9ñ]+/).filter(w => w.length > 1);
  let best = null, bs = 0;
  for (const f of fotos) {
    const pf = sinTildes(f.nombre).split(/[^a-z0-9ñ]+/).filter(w => w.length > 1); if (!pf.length) continue;
    const comunes = pf.filter(w => pal.includes(w)).length, sc = comunes / Math.max(pf.length, pal.length);
    if (comunes >= Math.min(2, pf.length) && sc > bs) { bs = sc; best = f; }
  }
  return bs >= 0.5 ? best : null;
}
async function abrirPegarPlanilla() {
  let fotos = [];
  if (CARPETA.activa) try { fotos = (await CARPETA.productos()).productos; } catch (e) { /* sin fotos: se cargan solo los textos */ }
  const area = h('textarea', { rows: 9, class: 'planilla', placeholder: 'Fernet Branca 750 ml\t20600\t18540\nVino Colón Frutos Rojos\t7700\t6930\nGancia Americano\t8300\t10%' });
  const vista = h('div', { class: 'planilla-vista' });
  let filas = [], modo = 'vacios';
  const pintar = () => {
    filas = leerPlanilla(area.value).map(f => ({ ...f, foto: mejorFoto(f.nombre, fotos) }));
    vista.replaceChildren(...(filas.length ? [h('table', null, h('thead', null, h('tr', null, h('th', null, 'Producto'), h('th', null, 'Normal'), h('th', null, 'Final'), CARPETA.activa ? h('th', null, 'Foto') : null)),
      h('tbody', null, ...filas.map(f => h('tr', null, h('td', null, f.nombre), h('td', null, f.regular ? '$' + f.regular : '—'), h('td', null, f.final ? '$' + f.final : '—'),
        CARPETA.activa ? h('td', null, f.foto ? h('span', { class: 'ok' }, '✓ ' + f.foto.nombre) : h('span', { class: 'mut' }, 'sin foto')) : null))))] : [h('p', { class: 'hint', style: 'margin:0' }, 'Pegá las filas acá arriba para ver cómo quedan.')]));
    btn.disabled = !filas.length; btn.textContent = filas.length ? `Cargar ${filas.length} ${filas.length === 1 ? 'producto' : 'productos'}` : 'Cargar';
  };
  area.addEventListener('input', pintar);
  const selModo = h('select', { onchange: e => { modo = e.target.value; } }, h('option', { value: 'vacios' }, 'En los casilleros vacíos'), h('option', { value: 'desde1' }, 'Reemplazar desde el casillero 1'));
  const btn = h('button', { class: 'btn primary', type: 'button', disabled: true, onclick: async () => {
    const lim = Math.min(L_ACTUAL().slots, S.productos.length), dest = [];
    for (let k = 0; k < lim && dest.length < filas.length; k++) if (modo === 'desde1' || productoVacio(S.productos[k])) dest.push(k);
    btn.disabled = true; btn.textContent = 'Cargando…';
    for (let n = 0; n < dest.length; n++) {
      const f = filas[n], p = S.productos[dest[n]];
      if (f.foto) await asignarProducto(p, f.foto); else Object.assign(p, nuevoProducto({ id: p.id }));
      Object.assign(p, { nombre: f.nombre, desc: f.desc || p.desc || '', regular: f.regular, final: f.final, pct: f.pct || '', recordado: false });
    }
    m.cerrar(); construirListaCasilleros('producto'); cambio();
    aviso(dest.length < filas.length ? `Cargué ${dest.length} de ${filas.length}: no hay más casilleros en este formato (probá A4 · 12 o 16).` : `Listo: cargué ${dest.length} ${dest.length === 1 ? 'producto' : 'productos'}. Revisá los precios.`);
  } }, 'Cargar');
  const m = abrirModal({ titulo: 'Pegar precios desde Excel', ancho: 760,
    cuerpo: h('div', { class: 'stack' },
      h('p', { class: 'hint', style: 'margin:0' }, 'En Excel o Google Sheets, seleccioná las columnas Producto · Precio normal · Precio final, copiá (Ctrl+C) y pegá acá (Ctrl+V). Si en vez del precio final tenés el %, poné por ejemplo 10%. ' + (CARPETA.activa ? 'Busco la foto de cada uno por el nombre en tus fotos de productos.' : '')),
      area, campo('¿Dónde los cargo?', selModo), vista),
    acciones: [h('button', { class: 'btn ghost', type: 'button', onclick: () => m.cerrar() }, 'Cancelar'), btn] });
  pintar(); setTimeout(() => area.focus(), 30);
}

/** Control de tamaño en % (insignias, placa del precio, «Ahorrás», barra, banda), con botón para volver al normal. */
function sliderTam(etq, obj, key, min, max, def, o = {}) {
  const actual = () => (+obj[key] > 0 ? +obj[key] : def), val = () => Math.round(actual() * 100) + ' %';
  const etqV = h('b', null, val());
  const listo = () => { etqV.textContent = val(); if (o.alCambiar) o.alCambiar(); cambio(); };
  const r = h('input', { type: 'range', min: String(min), max: String(max), step: '0.05', value: String(actual()), 'aria-label': etq, oninput: e => { obj[key] = +e.target.value; listo(); } });
  const normal = h('button', { type: 'button', class: 'btn small ghost', title: 'Volver al tamaño normal', 'aria-label': 'Volver al tamaño normal: ' + etq, onclick: () => { obj[key] = def; r.value = String(def); listo(); } }, '↺');
  return h('div', { class: 'fld tam' }, h('span', null, etq + ': ', etqV, o.ayuda ? h('em', null, ' · ' + o.ayuda) : null), h('span', { class: 'tam-fila' }, r, normal));
}
/** Control del tamaño de las insignias (-10 %, 2x1, 3x2…) y de la nota bajo el precio. */
const tamInsignias = () => sliderTam('Insignias (2x1, 3x2, -10 %…) y notas', S.precio, 'insignia', 0.8, 2, 1.3);
/** Cómo se ve "antes vs. ahora" en todo el folleto, y el descuento para todos de un clic. */
function cajaLeyendaPrecio() {
  const PR = S.precio;
  const sel = (id, opciones, valor, fn) => { const s_ = h('select', { id, onchange: e => fn(e.target.value) }, ...opciones.map(([v, t]) => h('option', { value: v }, t))); s_.value = valor; return s_; };
  const ejemplo = h('div', { class: 'ley-ejemplo', 'aria-live': 'polite' });
  const pintarEjemplo = () => {
    const [pre, post] = ANTES_ESTILOS[PR.antes] || ANTES_ESTILOS.antes;
    llenar(ejemplo, h('span', { class: 'ley-antes' }, pre ? pre + ' ' : '', h('s', null, '$20.600'), post ? ' ' + post : ''),
      h('span', { class: 'ley-placa', style: `font-size:${Math.round(26 * (+PR.placa || 1))}px` }, '$18.540', PR.etiqueta ? h('small', null, PR.etiqueta) : null),
      PR.ahorro ? h('span', { class: 'ley-ahorro', style: `font-size:${Math.round(15 * (+PR.ahorroTam || 1))}px` }, 'AHORRÁS $2.060') : null);
  };
  pintarEjemplo();
  const upd = () => { pintarEjemplo(); cambio(); };
  const pctPromo = () => { const P = promoInfo(S); return P && P.pct && !P.extra ? String(P.pct) : ''; };
  const pctTodos = h('input', { type: 'text', inputmode: 'decimal', placeholder: pctPromo() || '10', maxlength: 5, value: PR.pctTodos || pctPromo(), 'aria-label': '% de descuento para todos', oninput: e => { PR.pctTodos = e.target.value; } });
  const aplicarTodos = () => {
    const pct = String(pctTodos.value || '').trim(); PR.pctTodos = pct;
    const pv = parseFloat(pct.replace(',', '.'));
    if (!(pv > 0 && pv < 100)) { aviso('Escribí un % de descuento entre 1 y 99 (por ejemplo 10).'); pctTodos.focus(); pctTodos.select(); return; }
    let n = 0, sinAntes = 0;
    S.productos.slice(0, L_ACTUAL().slots).forEach(p => { if (productoVacio(p)) return; const v = ofertaDesde(p.regular, pct); if (v == null) { sinAntes++; return; } p.pct = pct; p.final = precioATexto(v); p.recordado = false; n++; });
    construirListaCasilleros('producto'); cambio();
    aviso(n ? `Listo: precio final de ${n} ${n === 1 ? 'producto' : 'productos'} = precio normal − ${pct}%.` + (sinAntes ? ` ${sinAntes} no tienen precio normal.` : '') : 'Ningún producto tiene “precio normal”. Escribilo primero.');
  };
  return h('details', { class: 'caja-aparte leyenda', open: true },
    h('summary', null, 'Leyenda del precio: antes vs. ahora'),
    h('div', { class: 'stack', style: 'margin-top:10px' }, ejemplo,
      h('div', { class: 'grid2' },
        campo('Precio anterior', sel('ley-antes', [['antes', 'ANTES $20.600'], ['normal', 'PRECIO NORMAL $20.600'], ['lista', 'PRECIO DE LISTA $20.600'], ['de_a', 'DE $20.600 A'], ['solo', 'Solo tachado']], PR.antes, v => { PR.antes = v; upd(); })),
        campo('Palabra en la placa', sel('ley-etq', [['FINAL', 'FINAL'], ['AHORA', 'AHORA'], ['OFERTA', 'OFERTA'], ['', '(ninguna)']], PR.etiqueta, v => { PR.etiqueta = v; upd(); }))),
      check('Mostrar “AHORRÁS $…”', 'Hace la cuenta por el cliente: atrae más que el porcentaje solo.', PR.ahorro, v => { PR.ahorro = v; upd(); }),
      check('Precio anterior grande', 'Más fácil de leer en el celular.', PR.grande, v => { PR.grande = v; upd(); }),
      h('p', { class: 'lab', style: 'margin:6px 0 0' }, 'Tamaños'),
      sliderTam('Precio final (la placa con el número)', PR, 'placa', 0.7, 1.6, 1, { alCambiar: pintarEjemplo, ayuda: 'si no entra a lo ancho, crece hasta donde puede' }),
      sliderTam('«Ahorrás $…»', PR, 'ahorroTam', 0.6, 2, 1, { alCambiar: pintarEjemplo }),
      tamInsignias(),
      h('div', { class: 'todos' }, h('span', null, 'Descuento para todos:'), h('span', { class: 'pct' }, pctTodos), h('button', { class: 'btn small primary', type: 'button', onclick: aplicarTodos }, 'Calcular ofertas')),
      h('p', { class: 'hint', style: 'margin:0' }, 'Precio normal − % de descuento = precio final (con centavos si los hay, sin redondear). El precio final es el que paga el cliente: no se le resta nada más. También podés poner un % distinto en cada producto.')));
}
/** Cuadros de productos: separación, margen, fotos, producto estrella y dónde va el precio adentro de cada cuadro. */
let CUADROS_ABIERTO = false;
const CUADROS_NORMAL = { sep: 1, margen: 1, foto: 1, estrella: 1, alinear: 'auto', dx: 0, dy: 0 };
function cajaCuadros() {
  const C = S.cuadros || (S.cuadros = { ...CUADROS_NORMAL }), L = L_ACTUAL(), conEstrella = ['a4_star4', 'post_star4', 'story_3'].includes(S.formato);
  const alin = h('div', { class: 'quick', role: 'group', 'aria-label': 'Dónde va el precio' });
  const pintarAlin = () => alin.replaceChildren(...[['auto', 'Como venía'], ['izquierda', '⇤ Izquierda'], ['centro', 'Centro'], ['derecha', 'Derecha ⇥']].map(([v, t]) =>
    h('button', { type: 'button', class: 'q' + ((C.alinear || 'auto') === v ? ' on' : ''), 'aria-pressed': String((C.alinear || 'auto') === v), onclick: () => { C.alinear = v; pintarAlin(); cambio(); } }, t)));
  pintarAlin();
  const corrimiento = (etq, key, min, max, txt) => {
    const out = h('b', null), pintar = () => { out.textContent = txt(+C[key] || 0); };
    const r = h('input', { type: 'range', min: String(min), max: String(max), step: '1', value: String(+C[key] || 0), 'aria-label': etq, oninput: e => { C[key] = +e.target.value; pintar(); cambio(); } });
    pintar();
    return h('div', { class: 'fld tam' }, h('span', null, etq + ': ', out), h('span', { class: 'tam-fila' }, r,
      h('button', { type: 'button', class: 'btn small ghost', title: 'Volver a su lugar', 'aria-label': 'Volver a su lugar: ' + etq, onclick: () => { C[key] = 0; r.value = '0'; pintar(); cambio(); } }, '↺')));
  };
  return h('details', { class: 'caja-aparte cuadros', id: 'caja-cuadros', open: CUADROS_ABIERTO, ontoggle: e => { CUADROS_ABIERTO = e.target.open; } },
    h('summary', null, 'Cuadros de productos: tamaño y dónde va el precio'),
    h('div', { class: 'stack', style: 'margin-top:10px' },
      h('p', { class: 'hint', style: 'margin:0' }, 'Los cuadros son los recuadros de cada producto. Lo que elijas acá vale para todo el folleto y también para las imágenes de redes.'),
      h('p', { class: 'lab', style: 'margin:4px 0 0' }, 'Tamaño de los cuadros'),
      sliderTam('Separación entre cuadros', C, 'sep', 0.1, 3, 1, { ayuda: 'más separación = cuadros más chicos' }),
      sliderTam('Margen a los costados', C, 'margen', 0.4, 2, 1, { ayuda: L.pdf === 'A4' ? 'para imprimir, no menos de 70 %' : 'más margen = cuadros más angostos' }),
      conEstrella ? sliderTam('Producto estrella (el cuadro grande)', C, 'estrella', 0.7, 1.3, 1, { ayuda: 'los de abajo usan lo que queda' }) : null,
      sliderTam('Fotos de los productos', C, 'foto', 0.7, 1.3, 1, { ayuda: 'todas juntas; las botellas altas crecen hasta donde deja la separación' }),
      h('p', { class: 'lab', style: 'margin:8px 0 0' }, 'Dónde va el precio adentro de cada cuadro'),
      h('div', { class: 'fld tam' }, h('span', null, 'Alineación'), alin),
      corrimiento('Correr a los costados', 'dx', -30, 30, v => (v === 0 ? 'en su lugar' : v < 0 ? `${-v} % a la izquierda` : `${v} % a la derecha`)),
      corrimiento('Subir o bajar', 'dy', -10, 40, v => (v === 0 ? 'en su lugar' : v > 0 ? `${v} % más arriba` : `${-v} % más abajo`)),
      h('p', { class: 'hint', style: 'margin:0' }, 'El nombre del producto se acomoda en el lugar que deja el precio. Si algo no entra, el precio frena en el borde del cuadro.'),
      h('button', { class: 'btn small ghost', type: 'button', onclick: () => { Object.assign(C, CUADROS_NORMAL); CUADROS_ABIERTO = true; construirPanel(); cambio(); const c = $('#caja-cuadros', DOM.panel); if (c) c.scrollIntoView({ block: 'center' }); } }, '↺ Cuadros como venían')));
}
function seccionFotos() {
  DOM.prods = h('div', { class: 'prods' });
  const acc = h('div', { class: 'row-actions' },
    h('button', { class: 'btn small primary', type: 'button', onclick: () => { const i = primerLibre('foto'); if (i >= 0) elegirParaCasillero(i, 'foto', { multi: true }); else aviso('Ya hay ' + MAX_FOTOS + ' fotos. Quitá una para agregar otra.'); } }, CARPETA.activa ? (CARPETA.nube ? '＋ Elegir fotos de la nube' : '＋ Elegir fotos de la carpeta') : '＋ Elegir fotos'));
  return seccion(paso(2, 'Fotos de productos'), 'hasta ' + MAX_FOTOS,
    h('p', { class: 'hint' }, 'Usá fotos con varios productos juntos (de preferencia sin fondo). Salen una debajo de la otra, grandes, con una etiqueta opcional.'), acc, DOM.prods);
}
function seccionMensajes() {
  const C = S.coleccion, inM = texto(C, 'mensaje', { ph: MENSAJES_COLECCION[0], max: 80 });
  return seccion(paso(3, 'Mensajes del folleto'), null, h('div', { class: 'stack' },
    campo('Mensaje principal', inM), chipsRapidos(MENSAJES_COLECCION, inM, C, 'mensaje'),
    h('div', { class: 'grid2' }, campo('Ocasión', texto(C, 'ocasion', { ph: 'Especial Día de la Madre', max: 30 }), 'opcional'), campo('Para quién', texto(C, 'kicker', { ph: 'Para reposteras y reposteros', max: 40 }), 'opcional')),
    campo('Texto chico del pie', texto(C, 'pie', { ph: 'Imágenes ilustrativas. Consultá disponibilidad y precios en el local.', max: 140 })),
    check('En las fotos hay bebidas alcohólicas', 'Agrega “Beber con moderación. Prohibida su venta a menores de 18 años.” (Ley 24.788). Tildala si se ven licores, vinos, fernet, etc.', C.alcohol, v => { C.alcohol = v; cambio(); })));
}
function chipsSugerencias() {
  const [tits, subs] = sugerenciasDe(S.tema), b = (t, fn) => h('button', { type: 'button', class: 'q', onclick: fn }, t);
  return [h('span', { class: 'lab' }, 'Ideas:'), ...tits.map(t => b(t, () => { S.titulo = t; DOM.inpTitulo.value = t; cambio(); })),
    ...subs.map(t => b('· ' + t, () => { S.subtitulo = t; DOM.inpSub.value = t; cambio(); }))];
}
const FRASES_BARRA = ['EN TODOS LOS PRODUCTOS', 'EN TODO EL LOCAL', 'TODOS LOS DÍAS', 'SOLO ESTE FIN DE SEMANA', 'EN PRODUCTOS SELECCIONADOS'];
/** Vista previa en vivo de la barra de la promo (la misma que sale en el folleto). */
function pintarBarraPrev() {
  const c = DOM.barraPrev; if (!c || !document.contains(c)) return;
  const T = THEMES[S.tema] || THEMES.naranja, P = S.promo.verBarra === false ? null : promoInfo(S), h0 = 60;
  const m = document.createElement('canvas').getContext('2d');
  const corto = fechaPillTexto(S, true), med = P ? barraPromoMedidas(m, P, corto, h0, barraOpciones(S).letra) : null;
  const wLog = P ? med.total + 16 : Math.max(260, datePillAncho(m, fechaPillTexto(S), h0 * 0.8) + 16), hLog = h0 + 16;
  const ancho = Math.max(200, c.parentNode.clientWidth || 420), esc = ancho / wLog, dpr = window.devicePixelRatio || 1;
  c.width = Math.round(ancho * dpr); c.height = Math.round(hLog * esc * dpr); c.style.width = ancho + 'px'; c.style.height = Math.round(hLog * esc) + 'px';
  const ctx = c.getContext('2d'), scBak = SC; setSC(esc * dpr); ctx.setTransform(esc * dpr, 0, 0, esc * dpr, 0, 0);
  ctx.fillStyle = vGrad(ctx, 0, hLog, T.bg); ctx.fillRect(0, 0, wLog, hLog);
  if (P) drawBarraPromo(ctx, 8, 8, h0, P, corto, med, T); else drawDatePill(ctx, wLog / 2, 8 + h0 * 0.1, h0 * 0.8, fechaPillTexto(S) || 'SIN FECHAS', T);
  setSC(scBak);
}
/** "Barra de la promo": medio de pago, texto, %, cuotas y fechas, todo junto y con vista previa. */
function cajaBarra() {
  const g = L_ACTUAL().grupo, PT = PAGOS[S.promo.tipo] || null, conCuotas = !!(PT && PT.cuotas);
  const promoSel = h('select', { id: 'promo-tipo', 'aria-label': 'Medio de pago de la promo', onchange: e => {
    const t = e.target.value; S.promo.tipo = t; S.promo.modo = 'incluido'; S.promo.textoBarra = '';
    if ((t === 'mp' || t === 'modo') && !S.promo.pct) S.promo.pct = '10';
    construirPanel(); cambio(); } },
    ...Object.entries(PROMO_TIPOS).map(([v, t]) => h('option', { value: v }, v === 'ninguna' ? 'Sin promo (solo las fechas)' : t)));
  promoSel.value = S.promo.tipo;
  const inTexto = texto(S.promo, 'textoBarra', { ph: PT ? PT.texto : 'Elegí primero el medio de pago', max: 70, after: () => cambio() });
  const frases = PT ? [PT.texto, ...FRASES_BARRA.map(f => PT.texto + ' ' + f)] : [];
  const chipsTexto = h('div', { class: 'quick' }, ...[...new Set(frases)].slice(0, 7).map(t => h('button', { type: 'button', class: 'q', onclick: () => { S.promo.textoBarra = t === PT.texto ? '' : t; inTexto.value = S.promo.textoBarra; cambio(); } }, t)));
  const fecha = (k, etq) => campo(etq, h('input', { type: 'date', value: S.vigencia[k] || '', onchange: e => { S.vigencia[k] = e.target.value; cambio(); }, oninput: e => { S.vigencia[k] = e.target.value; cambio(); } }));
  DOM.barraPrev = h('canvas', { class: 'barra-prev', 'aria-label': 'Vista previa de la barra de la promo' });
  const caja = h('div', { class: 'stack caja-aparte caja-barra', id: 'caja-barra' },
    h('p', { class: 'lab', style: 'margin:0' }, g === 'mensaje' ? 'Promo y fechas' : 'Barra de la promo (debajo del título)'),
    h('div', { class: 'barra-prev-marco' }, DOM.barraPrev),
    campo('Medio de pago', promoSel),
    PT ? campo('Texto de la barra', inTexto, 'vacío = “' + PT.texto.toLowerCase() + '”') : null, PT ? chipsTexto : null,
    PT ? h('div', { class: conCuotas ? 'grid2' : 'grid2' },
      campo('% de descuento', h('span', { class: 'pct pct-grande' }, pctBarra()), 'vacío = sin %'),
      conCuotas ? campo('Cuotas sin interés', texto(S.promo, 'cuotas', { ph: '3, 6, 12', mode: 'numeric', max: 2 }), 'opcional') : h('span')) : null,
    h('div', { class: 'grid2' }, fecha('desde', 'Desde'), fecha('hasta', 'Hasta')),
    check('Agregar “hasta agotar stock”', 'Crea urgencia. Indicá la cantidad en Legales.', S.vigencia.agotar, v => { S.vigencia.agotar = v; cambio(); }),
    PT && g !== 'mensaje' ? check('Mostrar la barra de la promo', 'Si la apagás, debajo del título quedan solo las fechas.', S.promo.verBarra !== false, v => { S.promo.verBarra = v; cambio(); }) : null,
    g !== 'mensaje' ? disenoBarra() : null);
  setTimeout(pintarBarraPrev, 0);
  return caja;
}
/** Tamaño, letra, alineación y altura de la barra de la promo (o de las fechas, si no hay promo). */
function disenoBarra() {
  const B = S.promo.barra || (S.promo.barra = { tam: 1, letra: 'mont', alinear: 'centro', dy: 0 });
  const selLetra = h('select', { 'aria-label': 'Letra de la barra', onchange: e => { B.letra = e.target.value; cambio(); } },
    h('option', { value: 'mont' }, 'Redonda (Montserrat)'), h('option', { value: 'barlow' }, 'Angosta y en cursiva (Barlow): entra más texto'));
  selLetra.value = B.letra === 'barlow' ? 'barlow' : 'mont';
  const alin = h('div', { class: 'quick', role: 'group', 'aria-label': 'Alineación de la barra' });
  const pintarAlin = () => alin.replaceChildren(...[['izquierda', '⇤ Izquierda'], ['centro', 'Centro'], ['derecha', 'Derecha ⇥']].map(([v, t]) => h('button', { type: 'button', class: 'q' + ((B.alinear || 'centro') === v ? ' on' : ''), 'aria-pressed': String((B.alinear || 'centro') === v), onclick: () => { B.alinear = v; pintarAlin(); cambio(); } }, t)));
  pintarAlin();
  const dyTxt = h('b', null), pintarDy = () => { const v = +B.dy || 0; dyTxt.textContent = v === 0 ? 'en su lugar' : v < 0 ? `${-v} px más arriba` : `${v} px más abajo`; };
  const dy = h('input', { type: 'range', min: '-30', max: '40', step: '2', value: String(+B.dy || 0), 'aria-label': 'Subir o bajar la barra', oninput: e => { B.dy = +e.target.value; pintarDy(); cambio(); } });
  pintarDy();
  return h('div', { class: 'stack diseno-barra' }, h('p', { class: 'lab', style: 'margin:4px 0 0' }, 'Tamaño, letra y posición'),
    sliderTam('Tamaño', B, 'tam', 0.7, 1.4, 1, { ayuda: 'si no entra a lo ancho, se achica sola' }),
    h('div', { class: 'fld tam' }, h('span', null, 'Letra'), selLetra), h('div', { class: 'fld tam' }, h('span', null, 'Alineación'), alin),
    h('div', { class: 'fld tam' }, h('span', null, 'Altura: ', dyTxt), h('span', { class: 'tam-fila' }, dy, h('button', { type: 'button', class: 'btn small ghost', title: 'Volver a su lugar', onclick: () => { B.dy = 0; dy.value = '0'; pintarDy(); cambio(); } }, '↺'))),
    h('button', { class: 'btn small ghost', type: 'button', onclick: () => { Object.assign(B, { tam: 1, letra: 'mont', alinear: 'centro', dy: 0 }); construirPanel(); cambio(); const c = $('#caja-barra', DOM.panel); if (c) c.scrollIntoView({ block: 'center' }); } }, '↺ Toda la barra como venía'));
}
/** % de la barra: al cambiarlo, los productos que van "como el folleto" y tenían el % anterior pasan al nuevo (un solo dato en todo el folleto). */
function pctBarra() {
  let viejo = String(S.promo.pct || '');
  const sinc = debounce(() => {
    const nuevo = String(S.promo.pct || '').trim(), pv = parseFloat(nuevo.replace(',', '.'));
    if (!(pv > 0 && pv < 100) || nuevo === viejo) return;
    let n = 0;
    S.productos.slice(0, L_ACTUAL().slots).forEach(p => {
      if (productoVacio(p) || (p.pago && p.pago !== S.promo.tipo) || !parsePrecio(p.regular)) return;
      if (String(p.pct || '') !== viejo && p.pct) return;                   // tenía un % propio distinto: se respeta
      p.pct = nuevo; p.final = precioATexto(ofertaDesde(p.regular, nuevo)); p.recordado = false; n++;
    });
    viejo = nuevo;
    if (n) { construirListaCasilleros('producto'); cambio(); aviso(`Actualicé ${n} ${n === 1 ? 'producto' : 'productos'} al ${nuevo}% (precio normal − ${nuevo}% = precio final).`); }
  }, 700);
  return texto(S.promo, 'pct', { ph: '10', mode: 'decimal', max: 4, after: () => { cambio(); sinc(); } });
}
/** Sello (estrella de arriba a la derecha): vista previa y sus 3 renglones ya cargados para escribir encima. */
function pintarSelloPrev() {
  const c = DOM.selloPrev; if (!c || !document.contains(c)) return;
  const T = THEMES[S.tema] || THEMES.naranja, st = selloTexto(S), dpr = window.devicePixelRatio || 1, lado = 150;
  c.width = lado * dpr; c.height = lado * dpr; c.style.width = c.style.height = lado + 'px';
  const ctx = c.getContext('2d'), scBak = SC; setSC(dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = vGrad(ctx, 0, lado, T.bg); ctx.fillRect(0, 0, lado, lado);
  if (st) drawSello(ctx, lado / 2, lado / 2, lado * 0.44, st, T);
  else text(ctx, 'SIN SELLO', lado / 2, lado / 2 + 5, { font: FM(800, 13), fill: 'rgba(255,255,255,.85)', align: 'center' });
  setSC(scBak);
}
function cajaSello() {
  const auto = () => selloTexto({ ...S, sello: { modo: 'auto' } }) || { l1: '', l2: '', l3: '' };
  const actual = S.sello.modo === 'custom' ? S.sello : auto();
  const campos = {};
  const escribir = k => e => {
    if (S.sello.modo !== 'custom') { const a = auto(); Object.assign(S.sello, { l1: a.l1, l2: a.l2, l3: a.l3 }); }   // parte de lo que ya mostraba
    S.sello.modo = 'custom'; S.sello[k] = e.target.value; sel.value = 'custom'; cambio();
  };
  const fila = (k, etq, ph, max) => { campos[k] = h('input', { type: 'text', value: actual[k] || '', placeholder: ph, maxlength: max, autocomplete: 'off', oninput: escribir(k) }); return campo(etq, campos[k]); };
  const sel = h('select', { id: 'sello-modo', 'aria-label': 'Sello del encabezado', onchange: e => {
    S.sello.modo = e.target.value;
    if (e.target.value === 'auto') { const a = auto(); ['l1', 'l2', 'l3'].forEach(k => { campos[k].value = a[k] || ''; }); }
    else if (e.target.value === 'custom' && !(S.sello.l1 || S.sello.l2 || S.sello.l3)) Object.assign(S.sello, auto());
    textos.hidden = e.target.value === 'none'; cambio(); } },
    h('option', { value: 'auto' }, 'Automático (según el descuento y la promo)'), h('option', { value: 'custom' }, 'Texto propio'), h('option', { value: 'none' }, 'Sin sello'));
  sel.value = S.sello.modo;
  const textos = h('div', { class: 'stack', hidden: S.sello.modo === 'none' || null },
    fila('l1', 'Renglón de arriba', 'CON QR MP', 14), fila('l2', 'Grande', '10%', 9), fila('l3', 'Renglón de abajo', 'OFF', 14),
    h('div', { class: 'quick' }, ...[['CON QR MP', '10%', 'OFF'], ['SOLO EN', 'EFECTIVO', ''], ['LLEVÁ', '2x1', 'HOY'], ['HASTA', '30%', 'OFF'], ['3 CUOTAS', 'SIN', 'INTERÉS']].map(([a, b, c]) =>
      h('button', { type: 'button', class: 'q', onclick: () => { Object.assign(S.sello, { modo: 'custom', l1: a, l2: b, l3: c }); campos.l1.value = a; campos.l2.value = b; campos.l3.value = c; sel.value = 'custom'; cambio(); } }, [a, b, c].filter(Boolean).join(' · ')))),
    h('button', { class: 'btn small ghost', type: 'button', onclick: () => { S.sello.modo = 'auto'; sel.value = 'auto'; const a = auto(); ['l1', 'l2', 'l3'].forEach(k => { campos[k].value = a[k] || ''; }); cambio(); } }, '↺ Volver al automático'));
  DOM.selloPrev = h('canvas', { class: 'sello-prev', 'aria-label': 'Vista previa del sello' });
  setTimeout(pintarSelloPrev, 0);
  return h('div', { class: 'stack caja-aparte', id: 'caja-sello' }, h('p', { class: 'lab', style: 'margin:0' }, 'Sello (la estrella de arriba a la derecha)'),
    h('div', { class: 'sello-edit' }, DOM.selloPrev, h('div', { class: 'stack' }, campo('Qué muestra', sel), textos)));
}
/** Opciones menos usadas de la promo (plegadas). */
function opcionesPromo() {
  if (S.promo.tipo === 'ninguna') return null;
  const conCuotas = !!(PAGOS[S.promo.tipo] && PAGOS[S.promo.tipo].cuotas);
  const modoSel = h('select', { id: 'promo-modo', 'aria-label': 'Cómo se aplica el descuento', onchange: e => { S.promo.modo = e.target.value; cambio(); } },
    h('option', { value: 'incluido' }, 'Ya está en el precio final de cada producto (normal)'), h('option', { value: 'extra' }, 'Es un descuento adicional al precio final (poco común)'));
  modoSel.value = S.promo.modo === 'extra' ? 'extra' : 'incluido';
  const logoInput = h('input', { type: 'file', accept: 'image/*', hidden: true, onchange: async e => { const f = e.target.files[0]; e.target.value = ''; if (!f) return; try { const r = await leerArchivoImagen(f); S.promo.logo = r.url; construirPanel(); cambio(); aviso('Logo de la promo cargado.'); } catch (err) { aviso('No pude leer esa imagen.'); } } });
  return h('details', { class: 'more' }, h('summary', null, 'Más opciones de la promo'), h('div', { class: 'stack', style: 'margin-top:8px' },
    check('Mostrar debajo de cada precio la condición de pago', S.promo.modo === 'extra' ? 'Con descuento adicional muestra el precio con ese descuento (ojo: resta el % otra vez).' : conCuotas ? 'Por ejemplo 3 CUOTAS $6.180, o la leyenda “' + ((PAGOS[S.promo.tipo] || {}).leyenda || '') + '”.' : 'Por ejemplo “' + ((PAGOS[S.promo.tipo] || {}).leyenda || 'PAGANDO CON QR MP') + '”.', S.promo.verPrecio !== false, v => { S.promo.verPrecio = v; cambio(); }),
    L_ACTUAL().grupo === 'mensaje' ? null : campo('Cómo se aplica el descuento', modoSel),
    campo('Palabra en la cápsula del precio', texto(S.promo, 'etiqueta', { ph: (PAGOS[S.promo.tipo] || {}).etiqueta || 'CON MP', max: 10 }), 'opcional'),
    h('div', { class: 'row-actions' },
      h('button', { class: 'btn small', type: 'button', onclick: () => logoInput.click() }, S.promo.logo ? 'Cambiar logo de la promo' : 'Subir logo oficial (opcional)'),
      S.promo.logo ? h('button', { class: 'btn small danger ghost', type: 'button', onclick: () => { S.promo.logo = ''; construirPanel(); cambio(); } }, 'Quitar logo') : null, logoInput),
    h('p', { class: 'hint', style: 'margin:0' }, 'El % de la barra es el mismo que ponés en cada producto (precio normal − % = precio final): no se descuenta dos veces. Con cuotas sin interés se agrega sola la leyenda del CFT 0 % al pie.')));
}
/** Franja "Aceptamos: efectivo · débito · crédito…" arriba del pie, con un texto opcional por medio (p. ej. "3 cuotas sin interés"). */
function cajaMediosDePago() {
  const G = S.pagos, lista = h('div', { class: 'pagos-lista', hidden: !G.ver || null });
  Object.entries(PAGOS).filter(([k]) => k !== 'texto').forEach(([k, P]) => {
    const on = G.lista.includes(k);
    const txt = h('input', { type: 'text', value: (G.textos || {})[k] || '', placeholder: P.cuotas ? 'Ej.: 3 cuotas sin interés' : 'Texto opcional', maxlength: 30, disabled: !on || null, 'aria-label': 'Texto para ' + P.nombre,
      oninput: e => { G.textos[k] = e.target.value; cambio(); } });
    lista.append(h('label', { class: 'pago-fila' }, h('input', { type: 'checkbox', checked: on || null, onchange: e => { G.lista = e.target.checked ? [...G.lista, k] : G.lista.filter(x => x !== k); txt.disabled = !e.target.checked; cambio(); } }),
      h('i', { style: `background:linear-gradient(${P.c[0]},${P.c[1]})` }), h('span', null, P.nombre), txt));
  });
  return h('div', { class: 'stack caja-aparte' },
    check('Mostrar “Aceptamos” con los medios de pago', 'Franja arriba del pie, en todos los formatos.', G.ver, v => { G.ver = v; lista.hidden = !v; cambio(); }), lista);
}
function seccionFechasPromo() {
  const g = L_ACTUAL().grupo, unico = g === 'unico', mensaje = g === 'mensaje';
  DOM.inpTitulo = texto(S, 'titulo', { ph: 'Ofertas de la semana', max: 30 }); DOM.inpSub = texto(S, 'subtitulo', { ph: 'Los precios más bajos del barrio', max: 44 });
  DOM.sugerencias = h('div', { class: 'quick' }, ...chipsSugerencias());
  const inM1 = texto(S.destacado, 'mensaje', { ph: 'OFERTA IMPERDIBLE', max: 28 }), inM2 = texto(S.destacado, 'mensaje2', { ph: 'SOLO EN EFECTIVO', max: 24 });
  const destacado = unico ? h('div', { class: 'stack caja-aparte' }, h('p', { class: 'lab', style: 'margin:0' }, 'Mensajes del producto destacado'),
    campo('Cartel principal', inM1), chipsRapidos(MENSAJES1, inM1, S.destacado, 'mensaje'), campo('Sello secundario', inM2, 'opcional'), chipsRapidos(MENSAJES2, inM2, S.destacado, 'mensaje2'),
    h('p', { class: 'hint', style: 'margin:0' }, 'Pensado para liquidaciones, fardos u ofertas solo en efectivo: elegí un estilo de impacto en el paso 1 y, si querés, activá la promo “Efectivo”.')) : null;
  return seccion(paso(3, mensaje ? 'Promo, fechas y medios de pago' : 'Título, fechas y promo'), null,
    h('div', { class: 'stack' }, destacado, unico || mensaje ? null : campo('Título', DOM.inpTitulo), unico || mensaje ? null : campo('Frase debajo del logo', DOM.inpSub, 'opcional'), unico || mensaje ? null : DOM.sugerencias,
      cajaBarra(), opcionesPromo(), unico || mensaje ? null : cajaSello(),
      h('p', { class: 'lab grp' }, 'Medios de pago'), cajaMediosDePago()));
}
/** Folleto de mensaje: textos del anuncio. */
function seccionMensaje() {
  const M = S.mensaje, PF = promoInfo(S);
  const inK = texto(M, 'kicker', { ph: '¡Aprovechá!', max: 30 }), inT = texto(M, 'titulo', { ph: 'Descuento en todos los productos', max: 70 });
  return seccion(paso(2, 'Tu mensaje'), 'se edita todo', h('div', { class: 'stack' },
    h('p', { class: 'hint', style: 'margin:0' }, 'Ideal para avisar una promo: por ejemplo “10% de descuento en todos los productos pagando con QR de Mercado Pago”. El número grande y la condición salen solos de la promo de pago (paso 3); si querés otro texto, escribilo acá.'),
    campo('Arriba (etiqueta chica)', inK, 'opcional'), chipsRapidos(MENSAJES_KICKER, inK, M, 'kicker'),
    campo('Título', inT), chipsRapidos(MENSAJES_TITULO, inT, M, 'titulo'),
    h('div', { class: 'grid2' },
      campo('Número grande', texto(M, 'grande', { ph: PF && PF.pct ? PF.pct + '%' : 'Ej.: 10%', max: 12 }), 'vacío = el % de la promo'),
      campo('Debajo del número', texto(M, 'grande2', { ph: 'DE DESCUENTO', max: 30 }), 'opcional')),
    campo('Condición', texto(M, 'condicion', { ph: PF ? PF.texto : 'Ej.: PAGANDO CON QR DE MERCADO PAGO', max: 50 }), 'vacío = la de la promo'),
    campo('Texto', h('textarea', { rows: 3, maxlength: 220, placeholder: 'Ej.: Válido para todas tus compras en el local. No acumulable con otras promociones.', oninput: e => { M.texto = e.target.value; cambio(); } }, M.texto || ''), 'opcional')));
}
/** Pie del folleto: la letra chica (se arma sola, sin repetir) y la banda de la Res. 446/2025, con su tamaño. */
function seccionPie() {
  const L = S.legal, C = S.comercio;
  DOM.pieVista = h('p', { class: 'pie-vista', 'aria-live': 'polite' });
  const cajaChica = h('div', { class: 'stack', hidden: L.letraChica === false || null }, DOM.pieVista,
    campo('Agregar al final', textoLocal(C, 'legales', { ph: 'Imágenes ilustrativas.', max: 140 }), 'opcional'));
  const cajaBanda = h('div', { class: 'stack', hidden: !L.banda || null },
    campo('Dónde consultar', textoLocal(C, 'consulta', { ph: 'Facebook: Fiambrería Rivero', max: 70 }), 'web, WhatsApp o 0800'),
    sliderTam('Tamaño de la letra de la banda', L, 'bandaTam', 0.6, 1.8, 1, { ayuda: 'en A4, con menos de 100 % queda más chica que los 4 mm que pide la norma' }));
  setTimeout(pintarPieVista, 0);
  return h('section', { class: 'sec', id: 'caja-pie' }, h('h2', null, 'Pie del folleto', h('small', null, 'letra chica y banda de abajo')),
    h('div', { class: 'stack' },
      check('Letra chica (fechas y condiciones)', 'Va arriba de la banda. Se arma sola con la vigencia y la promo, sin repetir datos.', L.letraChica !== false, v => { L.letraChica = v; cajaChica.hidden = !v; cambio(); }), cajaChica,
      check('Banda «Para más información o limitaciones aplicables consulte en…»', 'La pide la Res. 446/2025 en los folletos. Si la sacás, te lo recuerdo antes de terminar.', !!L.banda, v => { L.banda = v; cajaBanda.hidden = !v; cambio(); }), cajaBanda,
      h('p', { class: 'hint', style: 'margin:0' }, 'Tip: tocando el pie en la vista previa venís directo acá.')));
}
function pintarPieVista() {
  const v = DOM.pieVista; if (!v || !document.contains(v)) return;
  const t = letraChica(S); v.textContent = t ? 'Así sale: «' + t + '»' : 'No hay nada para mostrar en la letra chica.';
}
function seccionRevision() {
  DOM.checks = h('ul', { class: 'checks' });
  return seccion('Revisión antes de terminar', null, DOM.checks,
    h('div', { class: 'stack', style: 'margin-top:14px' },
      L_ACTUAL().pdf ? check('También guardar el PDF para imprimir (A4)', API.activo ? 'Se guarda junto a la imagen, en el Escritorio.' : 'Sale junto a la imagen.', S.opciones.pdf !== false, v => { S.opciones.pdf = v; guardarAuto(); }) : null,
      h('div', { class: 'row-actions' }, h('button', { class: 'btn primary grande', type: 'button', onclick: () => finalizarFolleto() }, API.activo ? '✔ Finalizar y guardar en el Escritorio' : '✔ Finalizar y descargar'),
        h('button', { class: 'btn', type: 'button', onclick: () => abrirMarketing('textos') }, '📣 Textos para publicar'))),
    h('p', { class: 'note' }, 'Armado con normas argentinas leídas en fuentes oficiales (Ley 24.240, Dto. 1798/94, Res. 4/2025 y 446/2025, Ley 24.788). Es una guía: no reemplaza el consejo de un contador o abogado.'));
}
/** Campo de los datos del local: anota cuándo se cambió (al abrir un folleto viejo se quedan los más nuevos). */
const textoLocal = (C, key, o = {}) => texto(C, key, { ...o, after: () => { C.ts = Date.now(); cambio(); } });
function seccionLocalYLegales() {
  const C = S.comercio;
  const selAlcohol = h('select', { id: 'alcohol-modo', 'aria-label': 'Leyenda de alcohol', onchange: e => { S.legal.alcohol = e.target.value; cambio(); } },
    h('option', { value: 'auto' }, 'Automática (si hay vino, fernet, cerveza…)'), h('option', { value: 'si' }, 'Siempre'), h('option', { value: 'no' }, 'Nunca'));
  selAlcohol.value = S.legal.alcohol === true ? 'si' : S.legal.alcohol === false ? 'no' : (S.legal.alcohol || 'auto');
  return [detalles('Datos del local (casi nunca cambian)', h('div', { class: 'stack' },
      campo('Dirección', textoLocal(C, 'direccion', { ph: 'Barrio, calle y número', max: 70 })),
      campo('Facebook', textoLocal(C, 'facebook', { ph: 'Nombre de tu página', max: 40 })),
      campo('WhatsApp o teléfono', textoLocal(C, 'telefono', { ph: 'Ej.: 11 5555-5555', mode: 'tel', max: 30 }), 'opcional'),
      campo('Link del canal de WhatsApp', textoLocal(C, 'waCanal', { ph: 'https://whatsapp.com/channel/…', mode: 'url', max: 200 }), 'sale como QR'),
      campo('Link de Facebook', textoLocal(C, 'qrUrl', { ph: 'https://www.facebook.com/tu-pagina', mode: 'url', max: 200 }), 'opcional · 2.º QR'),
      campo('Link de Google Maps', textoLocal(C, 'mapa', { ph: 'https://maps.app.goo.gl/…', mode: 'url', max: 200 }), 'opcional · para «cómo llegar» en los textos')),
      h('p', { class: 'note' }, 'Estos datos se guardan solos y salen en todos los folletos. El QR del canal de WhatsApp se leyó de la foto del cartel del local.')),
    detalles('Legales', h('div', { class: 'stack' },
      h('p', { class: 'hint', style: 'margin:0' }, 'La banda de abajo y la letra chica se cambian en «Pie del folleto» (arriba).'),
      campo('Leyenda de alcohol', selAlcohol, 'Ley 24.788'),
      campo('Stock por producto', texto(S.legal, 'stock', { ph: 'Ej.: 24 unidades por producto', max: 50 }), 'opcional'),
      h('div', { class: 'grid2' }, campo('Razón social', textoLocal(C, 'razon', { ph: 'Opcional', max: 50 })), campo('CUIT', textoLocal(C, 'cuit', { ph: 'XX-XXXXXXXX-X', mode: 'numeric', max: 14 })))))];
}
function seccionConsejos() {
  return detalles('Consejos para vender más', h('ul', { class: 'tips' },
    ...[['Producto gancho primero.', 'Poné de estrella lo que todos buscan (yerba, aceite, un fiambre). Frena el dedo y trae gente al local.'],
      ['Entre 8 y 12 ofertas.', 'Más que eso satura y la gente no lee. Lo importante, arriba.'],
      ['Precios que terminen en 90 o 99.', 'Es lo que usan Maxi, Yaguar y Nini: se perciben más baratos.'],
      ['Fechas siempre.', 'La urgencia vende y la ley la exige. Si hay límite de unidades, decí cuántas.'],
      ['Fotos de frente y sin fondo.', 'Fondo blanco liso y el programa lo saca solo. Evitá fotos oscuras o torcidas.'],
      ['Ahorro a la vista.', 'El porcentaje y el “Ahorrás $X” hacen la cuenta por el cliente.'],
      ['Promos de pago claras.', 'Si el descuento es con Mercado Pago, decilo en grande y poné hasta cuándo.'],
      ['Sumá cantidad.', 'Con la nota “Llevando 3: $X c/u” o la insignia 2x1 subís el ticket promedio.'],
      ['El canal de WhatsApp.', 'En redes, poné el link en el texto de la publicación; el QR sirve para el folleto impreso y para quien lo ve desde otra pantalla.'],
      ['Mismo día, mismo formato.', 'Si siempre lo publicás el mismo día, la gente lo espera.']]
      .map(([b, t]) => h('li', null, h('b', null, b + ' '), t))));
}
function seccionProyecto() {
  if (API.activo) {
    const i = API.info, fila = (etq, valor, accion) => h('div', { class: 'info-fila' }, h('span', { class: 'lab' }, etq), h('code', null, valor), accion);
    return detalles('Programa: carpetas y cierre', h('div', { class: 'stack' },
      fila('Fotos de productos', i.productos, h('button', { class: 'btn small', type: 'button', onclick: () => API.abrirCarpeta('productos').catch(e => aviso(e.message)) }, 'Abrir carpeta')),
      fila('Folletos terminados', i.escritorio, h('button', { class: 'btn small', type: 'button', onclick: () => API.abrirCarpeta('escritorio').catch(e => aviso(e.message)) }, 'Abrir carpeta')),
      h('p', { class: 'note' }, 'Recorte automático con IA: ' + (i.ia ? 'disponible.' : 'no instalado (el recorte de fondo blanco funciona igual).')),
      h('div', { class: 'row-actions' }, h('button', { class: 'btn small danger', type: 'button', onclick: () => cerrarPrograma() }, 'Cerrar programa'))));
  }
  const cont = h('span', { class: 'confirm' });
  const b = h('button', { class: 'btn small danger ghost', type: 'button', onclick: () => {
    cont.replaceChildren(h('span', { class: 'lab' }, '¿Volver al ejemplo?'), h('button', { class: 'btn small danger', type: 'button', onclick: async () => { S = estadoDemo(); await prepararImagenes(S); construirPanel(); cambio(); aviso('Volviste al folleto de ejemplo.'); } }, 'Sí'), h('button', { class: 'btn small ghost', type: 'button', onclick: () => cont.replaceChildren(b) }, 'No')); } }, 'Volver al ejemplo');
  cont.append(b);
  return detalles('Tu proyecto', h('div', { class: 'row-actions' },
    h('button', { class: 'btn small', type: 'button', onclick: guardarProyecto }, 'Guardar proyecto (.json)'),
    h('button', { class: 'btn small', type: 'button', onclick: () => DOM.abrir.click() }, 'Abrir proyecto'), cont),
    h('p', { class: 'note' }, CARPETA.nube ? 'El folleto en curso se guarda solo en este navegador y, si estás conectado, también en la nube (para seguirlo en la otra computadora). El .json es una copia extra en un archivo.' : 'El folleto se guarda solo en este navegador. Descargá el proyecto para tener una copia o para llevarlo a otra computadora.'));
}
function construirPanel() {
  const st = DOM.panel.scrollTop, g = L_ACTUAL().grupo;
  DOM.fmts = h('div'); DOM.temas = h('div');
  const secs = [seccion(paso(1, 'Tipo de folleto y temática'), 'dónde lo vas a usar', ejemploNota(), DOM.fmts, h('div', { style: 'height:14px' }), DOM.temas)];
  if (g === 'coleccion') secs.push(seccionFotos(), seccionMensajes());
  else if (g === 'mensaje') secs.push(seccionMensaje(), seccionFechasPromo());
  else secs.push(seccionProductos(), seccionFechasPromo());
  secs.push(seccionPie(), seccionRevision(), seccionMarketing(), ...seccionLocalYLegales(), ...(CARPETA.nube ? [seccionNube()] : []), seccionProyecto());
  DOM.panel.replaceChildren(...secs);
  pintarFormatos(); pintarTemas(); if (g !== 'mensaje') pintarProductos(); else { DOM.prods = null; refrescarLecturas(); }
  DOM.panel.scrollTop = st;
}

// ── exportar (descarga en la página suelta · Escritorio en el programa) ──
function nombreBase(sinFormato = false) {
  const L = L_ACTUAL(), titulo = L.grupo === 'coleccion' ? (S.coleccion.ocasion || 'Productos') : L.grupo === 'mensaje' ? (S.mensaje.titulo || 'Mensaje') : (S.titulo || 'Ofertas');
  const fecha = S.vigencia.hasta || isoDe(new Date());
  const corto = L.corto.replace(/\s*·\s*/g, ' ').replace(/(\d):(\d)/g, '$1x$2');
  return sinFormato ? `Rivero Market - ${titulo} - ${fecha}` : `Rivero Market - ${titulo} - ${corto} - ${fecha}`;
}
function lienzoExport(escala) { const c = document.createElement('canvas'); renderFlyer(c, S, { scale: escala, getImg, preview: false, exportar: true }); return c; }
const aBlob = (c, tipo, q) => new Promise(r => c.toBlob(r, tipo, q));
/** PDF de una página. formato: el del dibujo que se pasa en canvas (si no, el que está en pantalla). */
async function generarPDF(escala = 2, canvas = null, formato = null) {
  const L = LAYOUTS[formato] || L_ACTUAL(), c = canvas || lienzoExport(escala), jpg = new Uint8Array(await (await aBlob(c, 'image/jpeg', 0.93)).arrayBuffer());
  const wpt = L.pdf === 'A4' ? 595.28 : L.w * 0.75, hpt = L.pdf === 'A4' ? 841.89 : L.h * 0.75;
  return crearPDF(jpg, c.width, c.height, wpt, hpt);
}
async function exportar(tipo) {
  cerrarMenu();
  try {
    await prepararImagenes(S);
    let blob, nombre;
    if (tipo === 'png' || tipo === 'png2') { blob = await aBlob(lienzoExport(tipo === 'png2' ? 2 : 1), 'image/png'); nombre = nombreBase() + '.png'; }
    else if (tipo === 'pdf') { blob = await generarPDF(2); nombre = nombreBase() + '.pdf'; }
    const r = await guardarArchivo(blob, nombre);
    aviso(r === 'ok' ? (API.activo && guardarArchivo.ultimo ? `Guardé «${guardarArchivo.ultimo.nombre}» en el Escritorio.` : 'Listo: ' + nombre) : r === 'cancelado' ? 'Descarga cancelada.' : r === 'no-disponible' ? 'Este visor no permite descargar. Abrí el archivo ofertas_rivero_market.html en tu computadora.' : 'No se pudo guardar (' + r + ').');
  } catch (e) { console.error(e); aviso('No pude generar el archivo: ' + (e && e.message || e)); }
}
function crearPDF(jpeg, wpx, hpx, wpt, hpt) {
  const enc = new TextEncoder(), parts = [], off = []; let pos = 0;
  const put = x => { const b = typeof x === 'string' ? enc.encode(x) : x; parts.push(b); pos += b.length; };
  put('%PDF-1.4\n');
  off[1] = pos; put('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');
  off[2] = pos; put('2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n');
  off[3] = pos; put(`3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${wpt.toFixed(2)} ${hpt.toFixed(2)}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>\nendobj\n`);
  off[4] = pos; put(`4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${wpx} /Height ${hpx} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`); put(jpeg); put('\nendstream\nendobj\n');
  const cont = `q ${wpt.toFixed(2)} 0 0 ${hpt.toFixed(2)} 0 0 cm /Im0 Do Q`;
  off[5] = pos; put(`5 0 obj\n<< /Length ${cont.length} >>\nstream\n${cont}\nendstream\nendobj\n`);
  const xref = pos; let x = 'xref\n0 6\n0000000000 65535 f \n';
  for (let i = 1; i <= 5; i++) x += String(off[i]).padStart(10, '0') + ' 00000 n \n';
  put(x); put(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`);
  return new Blob(parts, { type: 'application/pdf' });
}
async function guardarProyecto() {
  cerrarMenu();
  const blob = new Blob([JSON.stringify(estadoParaGuardar(S))], { type: 'application/json' });
  const r = await guardarArchivo(blob, nombreBase() + ' (proyecto).json');
  aviso(r === 'ok' ? 'Proyecto guardado.' : r === 'cancelado' ? 'Descarga cancelada.' : 'No se pudo guardar (' + r + ').');
}
async function abrirProyecto(file) {
  try { const j = JSON.parse(await file.text()), local = S.comercio; S = normalizarEstado(j); S.comercio = comercioAlAbrir(S.comercio, local); await prepararImagenes(S); construirPanel(); cambio(); aviso('Proyecto abierto.'); }
  catch (e) { aviso('Ese archivo no es un proyecto válido.'); }
}

// ── menú de arriba ──
function cerrarMenu() { if (DOM.menu) DOM.menu.hidden = true; }
function menuAcciones() {
  const L = L_ACTUAL(), dim = esc => `${L.w * esc}×${L.h * esc} px`;
  const item = (t, d, fn) => h('button', { type: 'button', onclick: fn }, t, h('small', null, d));
  const lugar = API.activo ? 'en el Escritorio' : 'se descarga';
  const items = [
    item('📲 Descargar para WhatsApp, Facebook o A4…', 'cada destino con su medida (Estados, Historias, posts, canal, impresión)', () => { cerrarMenu(); finalizarFolleto(); }),
    h('hr'), h('p', { class: 'menu-lab' }, 'Solo lo que ves en pantalla'),
    item('Imagen PNG', dim(1) + ' · ' + lugar, () => exportar('png')),
    item('Imagen PNG de alta calidad', dim(2) + (L.pdf ? ' · A4 a 300 dpi' : ''), () => exportar('png2')),
    item('PDF', L.pdf ? 'A4 listo para imprimir' : 'mismo tamaño que la imagen', () => exportar('pdf')),
    h('hr'), item('📣 Marketing: textos, plan, calculadora…', 'para publicar el folleto y vender más', () => { cerrarMenu(); abrirMarketing(); }),
    h('hr'), item('Guardar copia del folleto', API.activo ? 'archivo .json que podés volver a abrir' : 'archivo .json para seguir editando después', guardarProyecto)];
  if (CARPETA.nube) items.push(
    item('Abrir una copia (.json)', 'un folleto que guardaste como archivo', () => { cerrarMenu(); DOM.abrir.click(); }),
    h('hr'), h('p', { class: 'menu-lab' }, 'Nube (GitHub)'),
    NUBE.puedeEscribir ? item('⇪ Traer lo de esta PC', 'fotos, precios y folletos del programa viejo o de una carpeta', () => { cerrarMenu(); abrirTraer(); }) : item('☁ Conectar con GitHub', 'para guardar fotos, precios y folletos en la nube', () => { cerrarMenu(); abrirConectar(); }),
    item('Programa para usar sin internet', 'descarga el .zip para Windows o Linux', () => { cerrarMenu(); location.href = 'descargas/Rivero-Market-Folletos.zip'; }),
    NUBE.puedeEscribir ? item('Desconectar esta computadora', 'borra la llave de GitHub de este navegador', () => { cerrarMenu(); desconectarNube(); }) : null);
  if (API.activo) items.push(item('Abrir carpeta de productos', API.info.productos, () => { cerrarMenu(); API.abrirCarpeta('productos').catch(e => aviso(e.message)); }),
    item('Abrir carpeta del Escritorio', API.info.escritorio, () => { cerrarMenu(); API.abrirCarpeta('escritorio').catch(e => aviso(e.message)); }),
    h('hr'), item('Cerrar programa', 'apaga el programa de folletos', () => { cerrarMenu(); cerrarPrograma(); }));
  DOM.menu.replaceChildren(...items);
}

// ── versión (arriba a la izquierda) y novedades ──
function verNovedades() {
  abrirModal({ titulo: 'Versión ' + APP_VERSION.v + ' · ' + APP_VERSION.fecha, ancho: 640,
    cuerpo: h('div', { class: 'stack' },
      h('p', { class: 'hint', style: 'margin:0' }, CARPETA.nube ? 'Esta es la versión online: siempre es la última. Cuando se publica una nueva, aparece un aviso arriba para actualizar.' : 'Para saber si una copia (por ejemplo la del trabajo) está al día, compará este número con el de la otra computadora. El archivo CAMBIOS.txt de la carpeta tiene la misma lista.'),
      API.activo && API.info.version ? h('p', { class: 'confirm-texto', style: 'margin:0' }, 'Programa (servidor): versión ' + API.info.version + (API.info.version === APP_VERSION.v ? ' ✓ coincide con la pantalla.' : ' ⚠ no coincide con la pantalla.')) : null,
      h('pre', { class: 'novedades' }, APP_VERSION.cambios || '')) });
}
function avisoVersionDistinta(vs) {
  abrirModal({ titulo: 'Versiones distintas', ancho: 520, cuerpo: h('p', { class: 'confirm-texto' }, `La pantalla es la versión ${APP_VERSION.v} y el programa que la abre es la ${vs}. Seguramente se copió solo una parte de la carpeta. Copiá la carpeta completa de la última versión y volvé a abrir el programa.`) });
}

// ── estructura de la pantalla ──
function armarEstructura() {
  const app = $('#app');
  DOM.menu = h('div', { class: 'menu', hidden: true, role: 'menu' });
  DOM.abrir = h('input', { type: 'file', accept: '.json,application/json', hidden: true, onchange: e => { const f = e.target.files[0]; if (f) abrirProyecto(f); e.target.value = ''; } });
  DOM.selArchivo = h('input', { type: 'file', accept: 'image/*', hidden: true, onchange: e => { const d = e.target._destino || { tipo: 'producto', i: 0 }; const fs = [...e.target.files]; e.target.value = ''; if (fs.length) cargarArchivos(fs, d.tipo, d.i); } });
  const btnMas = h('button', { class: 'btn' + (CARPETA.activa ? '' : ' primary'), type: 'button', 'aria-haspopup': 'true', onclick: ev => { ev.stopPropagation(); if (DOM.menu.hidden) menuAcciones(); DOM.menu.hidden = !DOM.menu.hidden; } }, CARPETA.activa ? '⋯ Más' : 'Descargar ▾');
  const btnMarketing = h('button', { class: 'btn', type: 'button', title: 'Textos para publicar, plan de la semana, calculadora de ofertas, fechas que vienen e ideas para vender más', onclick: () => abrirMarketing() }, '📣', h('span', { class: 'txt-largo' }, ' Marketing'));
  DOM.info = h('div', { class: 'info' });
  DOM.canvas = h('canvas', { 'aria-label': 'Vista previa del folleto' });
  DOM.canvas.addEventListener('click', e => {
    const t = hitEn(e);
    if (t) activarCasillero(t.tipo, t.i);
    else if (matchMedia('(max-width: 900px)').matches) { DOM.stage.classList.toggle('expanded'); setTimeout(programarDibujo, 230); }
  });
  DOM.canvas.addEventListener('mousemove', e => { const t = hitEn(e); DOM.canvas.style.cursor = t ? 'pointer' : 'default'; DOM.canvas.title = t ? textoCasillero(t) : ''; });
  DOM.stageBox = h('div', { class: 'stage-box' }, h('div', { class: 'hoja' }, DOM.canvas));
  DOM.panel = h('aside', { class: 'panel' });
  const guias = check('Guías', null, verGuias, v => { verGuias = v; programarDibujo(); });
  guias.style.margin = '0';
  const acciones = h('div', { class: 'actions' });
  DOM.btnDeshacer = h('button', { class: 'btn icono', type: 'button', title: 'Deshacer (Ctrl+Z)', 'aria-label': 'Deshacer', onclick: () => moverHistorial(-1) }, '↶');
  DOM.btnRehacer = h('button', { class: 'btn icono', type: 'button', title: 'Rehacer (Ctrl+Y)', 'aria-label': 'Rehacer', onclick: () => moverHistorial(1) }, '↷');
  const btnTerminar = h('button', { class: 'btn primary', type: 'button', onclick: () => finalizarFolleto() }, CARPETA.activa ? '✔ Finalizar' : '⬇ Descargar');
  if (CARPETA.activa) acciones.append(DOM.btnDeshacer, DOM.btnRehacer,
    h('button', { class: 'btn', type: 'button', onclick: () => nuevoFolleto() }, 'Nuevo folleto'),
    h('button', { class: 'btn', type: 'button', onclick: () => abrirMisFolletos() }, 'Mis folletos'),
    btnMarketing, btnMas, DOM.menu, btnTerminar);
  else { btnMas.classList.remove('primary'); btnMas.textContent = '⋯ Más'; acciones.append(DOM.btnDeshacer, DOM.btnRehacer, btnMarketing, btnMas, DOM.menu, btnTerminar); }
  // zoom: botones sobre la hoja, Ctrl + rueda del mouse, y las teclas + y −
  DOM.zoomTxt = h('span', { class: 'zoom-txt' }, 'Ajustado');
  const zoomBar = h('div', { class: 'zoom-bar', role: 'group', 'aria-label': 'Zoom de la vista previa' },
    h('button', { type: 'button', title: 'Alejar (−)', 'aria-label': 'Alejar', onclick: () => zoomA(ZOOM / 1.35) }, '−'), DOM.zoomTxt,
    h('button', { type: 'button', title: 'Acercar (+)', 'aria-label': 'Acercar', onclick: () => zoomA(ZOOM * 1.35) }, '+'),
    h('button', { type: 'button', class: 'txt', title: 'Ver la hoja entera', onclick: () => zoomA(1) }, 'Hoja entera'),
    h('button', { type: 'button', class: 'txt', title: 'Ver como en el celular', onclick: () => zoomA(2.2) }, '🔍 Leer'));
  DOM.stageBox.addEventListener('wheel', e => { if (!(e.ctrlKey || e.metaKey)) return; e.preventDefault(); zoomA(ZOOM * (e.deltaY < 0 ? 1.15 : 1 / 1.15), { x: e.clientX, y: e.clientY }); }, { passive: false });
  DOM.version = h('button', { class: 'version', type: 'button', title: 'Ver qué tiene esta versión', onclick: () => verNovedades() }, 'Versión ' + APP_VERSION.v, h('small', null, ' · ' + APP_VERSION.fecha));
  app.replaceChildren(
    h('header', { class: 'top' },
      h('div', { class: 'brand' }, h('img', { src: ASSETS.logos.insignia, alt: '' }), h('div', { style: 'min-width:0' }, h('b', null, 'Ofertas'), h('span', null, API.activo ? 'Rivero Market · programa de folletos' : CARPETA.nube ? 'Rivero Market · folletos online' : 'Rivero Market · armá tu folleto'), h('div', { class: 'brand-fila' }, DOM.version, CARPETA.nube ? chipNube() : null))), acciones),
    h('main', { class: 'work' }, DOM.panel, DOM.stage = h('section', { class: 'stage' }, DOM.stageBox, h('div', { class: 'stage-bar' }, zoomBar, DOM.info, guias,
      h('button', { class: 'btn small primary', type: 'button', onclick: () => finalizarFolleto() }, CARPETA.activa ? '✔ Finalizar' : '⬇ Descargar')))),
    DOM.abrir, DOM.selArchivo);
  document.addEventListener('click', e => { if (!DOM.menu.hidden && !DOM.menu.contains(e.target)) cerrarMenu(); });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') cerrarMenu();
    const escribiendo = e.target && /^(input|textarea|select)$/i.test(e.target.tagName);
    if (MODALES.length || escribiendo) return;                      // en un campo de texto, Ctrl+Z deshace lo escrito (lo maneja el navegador)
    const mod = e.ctrlKey || e.metaKey, k = e.key.toLowerCase();
    if (mod && k === 'z' && !e.shiftKey) { e.preventDefault(); moverHistorial(-1); }
    else if (mod && (k === 'y' || (k === 'z' && e.shiftKey))) { e.preventDefault(); moverHistorial(1); }
    else if (!mod && (e.key === '+' || e.key === '=')) zoomA(ZOOM * 1.35);
    else if (!mod && (e.key === '-' || e.key === '_')) zoomA(ZOOM / 1.35);
    else if (!mod && e.key === '0') zoomA(1);
  });
  document.addEventListener('paste', async e => {
    if (e.target && /^(input|textarea|select)$/i.test(e.target.tagName) && !(e.clipboardData && [...e.clipboardData.files].length)) return;
    const f = [...(e.clipboardData && e.clipboardData.files || [])].find(x => x.type.startsWith('image/'));
    if (!f) return;
    e.preventDefault();
    if (CARPETA.activa && CARPETA.puedeSubir) { const items = await agregarFotosALaCarpeta([f]); if (items && items.length) await aplicarSeleccion(ACTIVO.tipo, ACTIVO.i, items); }
    else cargarArchivos([f], ACTIVO.tipo, ACTIVO.i);
  });
  new ResizeObserver(() => programarDibujo()).observe(DOM.stageBox);
  addEventListener('resize', programarDibujo);
}

async function iniciar() {
  try {
    await cargarRecursos();
    if (NUBE.activo) await NUBE.iniciar(); else await API.iniciar();
    let guardado = API.activo ? await API.json('/api/estado').catch(() => null) : await KV.get('estado');
    if (guardado && guardado.vacio) guardado = null;
    S = guardado && guardado.v ? normalizarEstado(guardado) : estadoDemo();
    if (CARPETA.activa) CAT = (await CARPETA.leerCatalogo().catch(() => null)) || {};
    ACTIVO = { tipo: esColeccion() ? 'foto' : 'producto', i: 0 };
    armarEstructura(); construirPanel(); await dibujar(); reiniciarHistorial();
    if (API.activo && API.info.version && API.info.version !== APP_VERSION.v) avisoVersionDistinta(API.info.version);
    if (CARPETA.nube) despuesDeIniciarNube();
    if (new URLSearchParams(location.search).get('autotest')) await autotest();
  } catch (e) { console.error(e); const a = $('#app'); a.textContent = 'No se pudo iniciar: ' + (e && e.message || e); }
}
addEventListener('error', e => { const m = document.createElement('pre'); m.style.cssText = 'position:fixed;left:0;right:0;bottom:0;z-index:99;background:#300;color:#fff;padding:8px;margin:0;font:12px monospace;white-space:pre-wrap'; m.textContent = 'ERROR JS: ' + e.message + ' @' + (e.lineno || '?'); document.body.append(m); });
Object.defineProperty(window, '__estado', { get: () => S });   // solo para pruebas automáticas
window.__api = { tema: id => THEMES[id], elegirFormato: id => elegirFormato(id), elegirTema: id => elegirTema(id), lienzo: esc => lienzoExport(esc),
  destino: (dest, i, esc = 1) => { const pg = planDestino(S, dest)[i], c = document.createElement('canvas'); renderFlyer(c, estadoParaPagina(S, pg), { scale: esc, getImg, preview: false, exportar: true }); return c; }, dibujar: () => dibujar(), cat: () => CAT,
  hits: () => LAST_HITS.map(t => ({ tipo: t.tipo, i: t.i, x: t.x, y: t.y, w: t.w, h: t.h })), dim: () => { const L = L_ACTUAL(); return { w: L.w, h: L.h }; },
  temas: () => Object.fromEntries(Object.entries(THEMES).map(([k, T]) => [k, { grupo: T.grupo, titulo: T.titulo || '', subtitulo: T.subtitulo || '' }])),
  nube: () => NUBE, carpeta: () => CARPETA, marketing: () => MKT };
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();

// ── autoprueba (solo con ?autotest=1; se usa para verificar el armado) ──
async function autotest() {
  const out = []; const t = (n, c, x = '') => out.push((c ? 'OK   ' : 'FALLA ') + n + (x ? ' → ' + x : ''));
  try {
    t('parsePrecio 18.540', parsePrecio('18.540').int === '18.540' && parsePrecio('18.540').num === 18540);
    t('parsePrecio 1250,5', parsePrecio('1250,5').int === '1.250' && parsePrecio('1250,5').dec === '50');
    t('rango corto', rangoCorto('2026-10-12', '2026-10-18') === 'DEL 12 AL 18 DE OCTUBRE');
    t('rango hasta', rangoCorto('', '2026-10-18') === 'HASTA EL 18 DE OCTUBRE');
    t('nombre de cámara', esNombreDeCamara('IMG_20261003_141500') && !esNombreDeCamara('Fernet Branca 750 ml'));
    t('nombre de archivo', nombreBase().startsWith('Rivero Market - '), nombreBase());
    const bak = { f: S.formato, th: S.tema };
    for (const id of Object.keys(LAYOUTS)) { S.formato = id; const c = lienzoExport(1); t('render ' + id, c.width === LAYOUTS[id].w && c.height === LAYOUTS[id].h, c.width + '×' + c.height); }
    for (const id of Object.keys(THEMES)) { S.tema = id; const c = lienzoExport(0.3); t('tema ' + id, c.width > 100); }
    S.formato = bak.f; S.tema = bak.th;
    const png = await aBlob(lienzoExport(2), 'image/png'); t('PNG alta calidad', png.size > 150000, Math.round(png.size / 1024) + ' KB');
    const pdf = await generarPDF(1), head = new TextDecoder().decode(new Uint8Array(await pdf.slice(0, 8).arrayBuffer())); t('PDF', head.startsWith('%PDF-1.4') && pdf.size > 50000, Math.round(pdf.size / 1024) + ' KB');
    const q = document.createElement('canvas'); q.width = 60; q.height = 60; const g = q.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, 60, 60); g.fillStyle = '#c00'; g.fillRect(20, 20, 20, 20);
    const r = quitarFondo(q, 40), px = r.getContext('2d').getImageData(0, 0, 60, 60).data; t('quitar fondo', px[3] === 0 && px[(30 * 60 + 30) * 4 + 3] === 255);
    t('revisión legal', calcularRevision().length >= 6, calcularRevision().map(x => x.k).join(','));
    t('QR canal WhatsApp', !!qrMatrix(S.comercio.waCanal), (qrMatrix(S.comercio.waCanal) || []).length + ' módulos');
    { const PI = promoInfo(S), p0 = S.productos[0];
      t('promo MP sin descuento doble', !!PI && PI.tipo === 'mp' && !PI.extra && precioPromoTexto(p0, PI) === null, PI && PI.modo);
      t('normal − 10% = final', p0.regular === '20.600' && p0.final === '18.540' && infoProducto(p0).pct === 10, p0.regular + ' → ' + p0.final);
      t('leyenda de pago bajo el precio', (chipDe(p0, PI) || {}).label === 'PAGANDO CON QR MP' && !(chipDe(p0, PI) || {}).price);
      t('misma cuenta con cualquier medio', ['visa', 'mastercard', 'efectivo', 'debito', 'transferencia'].every(tp => { const Q = promoInfo({ promo: { tipo: tp, pct: '10', modo: 'incluido' } }); return Q && !Q.extra && precioPromoTexto(p0, Q) === null && chipDe(p0, Q).label === PAGOS[tp].leyenda; }));
      { const S2 = { ...S, formato: 'a4_10', promo: { tipo: 'ninguna' }, productos: S.productos.map((q, i) => ({ ...q, pago: ['mp', 'efectivo', 'visa', 'ninguno'][i] || '' })) };
        const ls = S2.productos.slice(0, 4).map(q => (chipProducto(q, S2) || {}).label || '-');
        t('condición distinta por producto', ls.join('|') === 'PAGANDO CON QR MP|SOLO EN EFECTIVO|CON TARJETA VISA|-' && hayCondicionPorProducto(S2), ls.join('|')); }
      t('texto propio en la barra', promoInfo({ promo: { tipo: 'mp', pct: '10', textoBarra: 'Con QR MP en todo el local' } }).texto === 'CON QR MP EN TODO EL LOCAL');
      t('estados viejos sin doble descuento', normalizarEstado({ v: 5, promo: { tipo: 'mp', pct: '10', modo: 'extra' } }).promo.modo === 'incluido'); }
    t('precio con MP', precioConPromo({ final: '18540' }, { verPrecio: true, extra: true, pct: 10 }) === 16686);
    t('oferta desde antes y %', ofertaDesde('20600', '10') === 18540);
    t('oferta con centavos (sin redondear)', ofertaDesde('1999', '15') === 1699.15 && precioATexto(1699.15) === '1.699,15', precioATexto(ofertaDesde('1999', '15')));
    t('% hacia abajo', pctReal(20600, 18540) === 10 && pctReal(1000, 905) === 9);
    t('promo MP con centavos', precioConPromo({ final: '1.999' }, { verPrecio: true, extra: true, pct: 10 }) === 1799.1);
    t('cuota por producto', precioPromoTexto({ final: '18540' }, { verPrecio: true, extra: false, cuotas: 3 }) === '$6.180');
    t('Pascua 2026', isoDe(pascua(2026)) === '2026-04-05', isoDe(pascua(2026)));
    t('Día de la Madre 2026', isoDe(nDomingo(2026, 9, 3)) === '2026-10-18');
    t('Día del Padre 2026', isoDe(nDomingo(2026, 5, 3)) === '2026-06-21');
    t('Black Friday 2026', isoDe(blackFriday(2026)) === '2026-11-27', isoDe(blackFriday(2026)));
    t('próximas fechas', proximasFechas(new Date(2026, 9, 3), 30)[0].tema === 'madre');
    const pl = leerPlanilla('Producto\tAntes\tOferta\nFernet Branca 750 ml\t$20.600\t18.540\nVino Colón\t7700\t10%\nGancia;8300;7470');
    t('pegar planilla', pl.length === 3 && pl[0].regular === '20.600' && pl[0].final === '18.540' && pl[1].final === '6.930' && pl[2].regular === '8300', JSON.stringify(pl.map(x => [x.regular, x.final])));
    t('insignia 2x1', notaDeInsignia('2x1', '1.999') === 'Llevando 2 pagás 1: $999,50 c/u', notaDeInsignia('2x1', '1.999'));
    const bakF = S.formato; S.formato = 'a4_10';
    t('reparto para redes', planDestino(S, 'post').length === 3 && planDestino(S, 'story').length === 3 && planDestino(S, 'a4').length === 1, [planDestino(S, 'post').length, planDestino(S, 'story').length].join('/'));
    { const pl1 = planDestino(S, 'story1'), sp = estadoParaPagina(S, pl1[2]);
      t('un producto por imagen', pl1.length === 10 && pl1.every(x => x.individual && x.productos.length === 1) && sp.formato === 'destacado_story' && sp.productos[0] === S.productos[2] && sp.destacado.mensaje === S.titulo, pl1.length + ' imágenes'); }
    t('sin "un producto por imagen" en mensajes', planDestino({ ...S, formato: 'mensaje_post' }, 'story1').length === 0);
    S.formato = bakF;
    t('versión', !!APP_VERSION.v, APP_VERSION.v + ' ' + APP_VERSION.fecha);
    const n = estadoNuevo(S); t('folleto nuevo vacío', n.productos.every(productoVacio) && n.coleccion.fotos.every(f => !srcDe(f)) && n.formato === S.formato);
    const m = normalizarEstado({ productos: [nuevoProducto(), nuevoProducto({ nombre: 'A', final: '1' })] }); t('casilleros vacíos al final', m.productos[0].nombre === 'A' && productoVacio(m.productos[1]));
    const es = estadoParaGuardar(S); t('estado liviano', JSON.stringify(es).length < 400000, Math.round(JSON.stringify(es).length / 1024) + ' KB');
    { // v3.1: tamaños, letra chica, banda y barra
      const cx = document.createElement('canvas').getContext('2d'), pr = { int: '2.520', dec: '' };
      const PCbak = PRECIO_CFG; PRECIO_CFG = { ...PCbak, placa: 1.4 };
      const [hp, op] = altoPlaca(70); t('placa más grande si entra', plateGeom(cx, 900, hp, pr, op).H > 70 && plateGeom(cx, 900, hp, pr, op).H <= 98, plateGeom(cx, 900, hp, pr, op).H.toFixed(1));
      t('placa: si no entra a lo ancho, no se deforma', plateGeom(cx, 160, hp, pr, op).H === 70, plateGeom(cx, 160, hp, pr, op).H.toFixed(1));
      PRECIO_CFG = { ...PCbak, placa: 0.8 }; t('placa más chica', altoPlaca(70)[0] === 56);
      PRECIO_CFG = PCbak;
      const S2 = { ...S, formato: 'a4_10', vigencia: { desde: '', hasta: '2026-10-18', agotar: false }, promo: { ...S.promo, tipo: 'mp', pct: '10', modo: 'incluido', textoBarra: 'PAGANDO CON QR DE MERCADO PAGO (DINERO EN CUENTA)' }, comercio: { ...S.comercio, legales: 'Imágenes ilustrativas.' }, legal: { ...S.legal, letraChica: true } };
      const lc = letraChica(S2);
      t('letra chica sin repetir la fecha', (lc.match(/18 de octubre/g) || []).length === 1 && (lc.match(/[Pp]recios finales/g) || []).length === 1, lc);
      t('letra chica usa el texto de la barra', /pagando con QR de Mercado Pago \(dinero en cuenta\)/.test(lc), lc);
      t('letra chica apagada', letraChica({ ...S2, legal: { ...S2.legal, letraChica: false } }) === '');
      const f1 = footerPlan(cx, { ...S2, legal: { ...S2.legal, banda: true, bandaTam: 1 } }, 1080, 1350, 'post'), f2 = footerPlan(cx, { ...S2, legal: { ...S2.legal, banda: true, bandaTam: 1.5 } }, 1080, 1350, 'post');
      t('banda: tamaño de letra', f2.fs > f1.fs && f2.legalH >= f1.legalH, f1.fs + ' → ' + f2.fs);
      t('banda: se puede sacar', footerPlan(cx, { ...S2, legal: { ...S2.legal, banda: false } }, 1080, 1350, 'post').legalH === 0);
      const PI = promoInfo(S2), mM = barraPromoMedidas(cx, PI, 'HASTA EL 18 DE OCTUBRE', 60, 'mont'), mB = barraPromoMedidas(cx, PI, 'HASTA EL 18 DE OCTUBRE', 60, 'barlow');
      t('barra: letra angosta ocupa menos', mB.total < mM.total, Math.round(mM.total) + ' / ' + Math.round(mB.total));
      t('barra: opciones con límites', barraOpciones({ promo: { barra: { tam: 9, dy: -99, alinear: 'x' } } }).tam === 1.4 && barraOpciones({ promo: { barra: { tam: 9, dy: -99 } } }).dy === -30 && barraOpciones({ promo: {} }).alinear === 'centro');
      t('legales viejos sin repetir', normalizarEstado({ v: 6, comercio: { legales: 'Imágenes ilustrativas. Precios finales en pesos argentinos.' } }).comercio.legales === 'Imágenes ilustrativas.');
      PRECIO_CFG = { ...PCbak, antes: 'normal' }; const wN = measureAntes(cx, { int: '20.600', dec: '' }, 28); PRECIO_CFG = { ...PCbak, antes: 'antes' }; const wA = measureAntes(cx, { int: '20.600', dec: '' }, 28); PRECIO_CFG = PCbak;
      t('mide bien «PRECIO NORMAL» (una sola medida)', wN > wA, Math.round(wN) + ' > ' + Math.round(wA));
    }
    { // v3.2: cuadros de productos y precio movible
      const c = document.createElement('canvas'), CUbak = S.cuadros;
      t('cuadros: valores de fábrica', JSON.stringify(normalizarEstado({ v: 7 }).cuadros) === JSON.stringify(CUADROS_NORMAL));
      const cajas = (formato, cu) => { renderFlyer(c, { ...S, formato, cuadros: { ...CUADROS_NORMAL, ...cu } }, { scale: 0.2, getImg, exportar: true }); return HITS.filter(x => x.tipo === 'producto'); };
      const r0 = cajas('a4_8', {}), r2 = cajas('a4_8', { sep: 2 }), rm = cajas('a4_8', { margen: 0.5 });
      t('cuadros: de fábrica no cambia nada', !precioMovido() && r0[0].x === 44 && Math.round(r0[1].x - r0[0].x - r0[0].w) === 22, r0[0].x + ' · ' + (r0[1].x - r0[0].x - r0[0].w));
      t('cuadros: separación', Math.round(r2[1].x - r2[0].x - r2[0].w) === 44 && Math.round(r2[2].y - r2[0].y - r2[0].h) === 36);
      t('cuadros: margen a los costados', rm[0].x === 22 && Math.round(rm[1].x + rm[1].w) === 1240 - 22, rm[0].x + ' · ' + (rm[1].x + rm[1].w));
      const e0 = cajas('a4_star4', {}), e1 = cajas('a4_star4', { estrella: 1.2 });
      t('cuadros: producto estrella más grande', e1[0].h > e0[0].h && e1[1].h < e0[1].h, Math.round(e0[0].h) + ' → ' + Math.round(e1[0].h));
      const hm = cajas('destacado_post', { margen: 1.5 });
      t('cuadros: margen también en un solo producto', hm[0] && Math.round(hm[0].x) === 51, hm[0] && hm[0].x);
      // el bloque del precio: alineación, corrimiento y topes
      const CFGbak = CUADROS_CFG, pos = (a, cu = {}) => { CUADROS_CFG = { ...CUADROS_NORMAL, ...cu }; let x0 = null, y0 = null;
        const b = bloqueFilas([{ h: 40, items: [{ w: 50, dib: (x, y) => { x0 = x; y0 = y; } }] }], { x: 100, w: 200, bottom: 300, lim: { l: 20, r: 400, t: 120, b: 320 } }, a, 1000, 1000);
        CUADROS_CFG = CFGbak; return { x0, y0, b }; };
      t('precio: izquierda / centro / derecha', pos('izquierda').x0 === 100 && pos('centro').x0 === 175 && pos('derecha').x0 === 250);
      t('precio: correr a los costados', pos('izquierda', { dx: 5 }).x0 === 150 && pos('derecha', { dx: 30 }).x0 === 350, pos('derecha', { dx: 30 }).x0);
      t('precio: subir y bajar', pos('izquierda', { dy: 10 }).y0 === 160 && pos('izquierda', { dy: 40 }).b.top === 120 && pos('izquierda', { dy: -10 }).b.bottom === 320, pos('izquierda', { dy: 40 }).b.top);
      t('precio: «como venía» no se mueve', !(CUADROS_CFG = { ...CUADROS_NORMAL }, precioMovido()) && (CUADROS_CFG = { ...CUADROS_NORMAL, alinear: 'derecha' }, precioMovido()));
      CUADROS_CFG = CFGbak;
      // todos los formatos con productos, con valores extremos, sin errores
      let malos = [];
      const fmts = Object.keys(LAYOUTS).filter(f => !LAYOUTS[f].oculto && !['coleccion', 'mensaje'].includes(LAYOUTS[f].grupo));
      for (const f of fmts) for (const cu of [{ alinear: 'derecha', dx: 30, dy: 40, sep: 3, margen: 2, foto: 1.3, estrella: 1.3 }, { alinear: 'centro', dx: -30, dy: -10, sep: 0.1, margen: 0.4, foto: 0.7, estrella: 0.7 }, { alinear: 'izquierda', dy: 15 }]) {
        try { const r = cajas(f, cu); if (r.some(x => !(x.w > 40 && x.h > 40 && Number.isFinite(x.x + x.y)))) malos.push(f); } catch (e) { malos.push(f + ': ' + e.message); }
      }
      t('cuadros: todos los formatos con valores extremos', !malos.length, malos.join(' · ') || fmts.length + ' formatos');
      S.cuadros = CUbak; renderFlyer(c, S, { scale: 0.2, getImg, exportar: true });
    }
    { // v3.3: errores del relevamiento
      const c = document.createElement('canvas'); c.getContext('2d', { willReadFrequently: true });
      // 1) ninguna imagen queda con agujeros transparentes (salían negros en el PDF y al pasar a JPG):
      //    todos los fondos en los tres tipos de encabezado, y todos los formatos con dos fondos
      const agujeros = [], combos = [...['a4_10', 'story_3', 'post_4'].flatMap(f => Object.keys(THEMES).map(tema => [f, tema])), ...Object.keys(LAYOUTS).flatMap(f => ['mercadopago', 'naranja'].map(tema => [f, tema]))];
      for (const [f, tema] of combos) {
        renderFlyer(c, { ...S, formato: f, tema, promo: { ...S.promo, tipo: 'mp', logo: '' } }, { scale: 0.12, getImg, exportar: true });
        const d = c.getContext('2d').getImageData(0, 0, c.width - 1, c.height - 1).data; let n = 0;   // sin el último renglón y columna (a esta escala quedan a medio pintar)
        for (let i = 3; i < d.length; i += 4) if (d[i] < 255) n++;
        if (n) agujeros.push(f + '/' + tema + ': ' + n);
      }
      t('sin agujeros transparentes en ningún formato ni fondo', !agujeros.length, agujeros.slice(0, 4).join(' · ') || combos.length + ' imágenes');
      // 2) el PDF del A4 tiene tamaño A4 aunque el folleto se arme en un formato de redes
      { const bakF = S.formato; S.formato = 'post_4'; const ca = document.createElement('canvas'); renderFlyer(ca, { ...S, formato: 'a4_10' }, { scale: 0.3, getImg, exportar: true });
        const txt = new TextDecoder('latin1').decode(new Uint8Array(await (await generarPDF(0.3, ca, 'a4_10')).arrayBuffer()));
        S.formato = bakF; t('PDF A4 desde un formato de redes', /MediaBox \[0 0 595\.28 841\.89\]/.test(txt), (txt.match(/MediaBox \[[^\]]+\]/) || [''])[0]); }
      // 3) reparto para redes: lo que se ve, sin estrellas inventadas y parejo
      const conProds = (formato, n) => ({ ...S, formato, productos: Array.from({ length: 16 }, (_, i) => i < n ? nuevoProducto({ nombre: 'P' + i, final: '100' }) : nuevoProducto()) });
      const resumen = pl => pl.map(x => x.formato + ':' + (x.productos || []).length).join(' ');
      t('repartir parejo', JSON.stringify(repartir([0, 1, 2, 3, 4, 5, 6, 7, 8, 9], 4).map(g => g.length)) === '[4,3,3]' && JSON.stringify(repartir([0, 1, 2, 3, 4], 4).map(g => g.length)) === '[3,2]');
      const a10 = conProds('a4_10', 10);
      t('A4 de 10 → posts e historias parejos', resumen(planDestino(a10, 'post')) === 'post_4:4 post_4:3 post_4:3' && resumen(planDestino(a10, 'story')) === 'story_4:4 story_4:3 story_4:3', resumen(planDestino(a10, 'story')));
      const est = conProds('a4_star4', 5);
      t('A4 estrella → la estrella solo en la primera', resumen(planDestino(est, 'post')) === 'post_star4:5' && resumen(planDestino(est, 'story')) === 'story_3:3 story_4:2', resumen(planDestino(est, 'story')));
      const pe = conProds('post_star4', 5);
      t('Post estrella → sale el mismo post (con estrella)', resumen(planDestino(pe, 'post')) === 'post_star4:5' && resumen(planDestino(pe, 'canal')) === 'post_star4:5' && resumen(planDestino(pe, 'a4')) === 'a4_star4:5');
      const p4 = conProds('post_4', 10);
      t('solo los productos que entran en el formato', resumen(planDestino(p4, 'post')) === 'post_4:4' && resumen(planDestino(p4, 'story')) === 'story_4:4' && planDestino(p4, 'post1').length === 4);
      const uno = planDestino(conProds('a4_star4', 4), 'story');
      t('historia con un solo producto: grande y sin «SOLO EN EFECTIVO»', resumen(uno) === 'story_3:3 destacado_story:1' && estadoParaPagina(conProds('a4_star4', 4), uno[1]).destacado.mensaje2 === '', resumen(uno));
      { const S4 = conProds('story_4', 3); renderFlyer(c, S4, { scale: 0.2, getImg, exportar: true }); const n3 = HITS.filter(x => x.tipo === 'producto').length; renderFlyer(c, S4, { scale: 0.2, getImg, preview: true }); const n4 = HITS.filter(x => x.tipo === 'producto').length;
        renderFlyer(c, S, { scale: 0.2, getImg, preview: true }); t('historia de 4: renglones según los productos', n3 === 3 && n4 === 4, n3 + ' / ' + n4); }
      // 4) los datos del local no vuelven atrás al abrir un folleto viejo
      const fab = estadoDemo().comercio, nuevo = { ...fab, direccion: 'Sarli Pizarro 1430', ts: 2000 }, viejo = { ...fab, direccion: 'Solís Pizarro 1430' };
      t('datos del local: quedan los más nuevos', comercioAlAbrir(viejo, nuevo).direccion === 'Sarli Pizarro 1430' && comercioAlAbrir({ ...nuevo, ts: 3000, direccion: 'X' }, nuevo).direccion === 'X'
        && comercioAlAbrir(viejo, { ...fab }).direccion === 'Solís Pizarro 1430' && comercioAlAbrir({ ...fab, telefono: '1' }, { ...fab, telefono: '2' }).telefono === '2');
      // 5) una foto que no cargó se avisa en la revisión
      { const p = S.productos.find(q => !productoVacio(q) && srcDe(q)); if (p) { const k = claveImg(p); IMG.error.set(k, Date.now()); const r = calcularRevision().some(x => x.k === 'warn' && /no carg/.test(x.t)); IMG.error.delete(k); t('foto que no cargó: aviso antes de terminar', r); } }
      // 6) foto que la IA pasó de .jpg a .png: se encuentra con su precio
      { const CATbak = CAT; CAT = { 'Bebidas/Fernet.jpg': { final: '18.540', ts: 1 } };
        const ok6 = (recordadoDe('Bebidas/Fernet.png') || {}).final === '18.540' && !recordadoDe('Bebidas/Otro.png'); CAT = CATbak;
        const real = NUBE.rutaReal.call({ arbol: new Map([['productos/Bebidas/Fernet.png', {}]]) }, 'Bebidas/Fernet.jpg');
        t('foto con IA: precio recordado y foto con el nombre nuevo', ok6 && real === 'Bebidas/Fernet.png', real); }
    }
  } catch (e) { t('excepción', false, e.message + ' ' + (e.stack || '').split('\n')[1]); }
  const pre = document.createElement('pre'); pre.id = 'autotest'; pre.textContent = out.join('\n'); pre.style.cssText = 'position:fixed;left:0;top:0;z-index:99;background:#111;color:#9f9;padding:10px;margin:0;font:13px monospace;max-width:100vw;overflow:auto;max-height:100vh'; document.body.append(pre);
  window.__autotest = out;
}
