// ───────────────────────── marketing: textos para publicar, plan, calculadora, fechas e ideas ─────────────────────────
// Todo sale del folleto que se está armando (productos, precios, fechas, promo y datos del local).
// Nada de esto sale en la imagen: son ayudas para publicarla y vender más.
const EMOJI_TEMA = { pizza: '🍕', panchos: '🌭', hamburguesa: '🍔', naranja: '🧡', rojo: '❤️', verde: '💚', azul: '💙', madre: '💐', padre: '👔', halloween: '🎃', argentina: '⚽', navidad: '🎄', mercadopago: '📱', blackfriday: '🖤', reyes: '👑', patrias: '🇦🇷', trabajador: '🛠️', nino: '🧸', pascuas: '🐣', primavera: '🌸', anionuevo: '🥂', liquidacion: '💥', fuego: '🔥', efectivo: '💵' };
const HASHTAG_TEMA = { madre: '#DíaDeLaMadre', padre: '#DíaDelPadre', halloween: '#Halloween', argentina: '#VamosArgentina', navidad: '#Navidad', mercadopago: '#MercadoPago', blackfriday: '#BlackFriday', reyes: '#ReyesMagos', patrias: '#FiestasPatrias', trabajador: '#DíaDelTrabajador', nino: '#DíaDelNiño', pascuas: '#Pascuas', primavera: '#Primavera', anionuevo: '#AñoNuevo', liquidacion: '#Liquidación' };
const LEYENDA_ALCOHOL_TXT = 'Beber con moderación. Prohibida su venta a menores de 18 años.';
const lsJSON = (k, def) => { try { return JSON.parse(localStorage.getItem(k) || 'null') ?? def; } catch (e) { return def; } };
const lsGuardar = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* sin almacenamiento */ } };
const masDias = (d, n) => { const x = new Date(d.getFullYear(), d.getMonth(), d.getDate() + n); return x; };
const hoy0 = () => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), d.getDate()); };
const precioTxt = F => (F ? txtPrecio(F) : '');
const mayus = s => String(s || '').toLocaleUpperCase('es-AR');

async function copiarTexto(t) {
  try { await navigator.clipboard.writeText(t); aviso('Copiado. Ahora pegalo en WhatsApp o en Facebook (Ctrl+V).'); return true; }
  catch (e) {
    const ta = h('textarea', { style: 'position:fixed;left:-9999px;top:0', 'aria-hidden': 'true' }); ta.value = t; document.body.append(ta); ta.select();
    let ok = false; try { ok = document.execCommand('copy'); } catch (e2) { ok = false; }
    ta.remove(); aviso(ok ? 'Copiado. Ahora pegalo en WhatsApp o en Facebook (Ctrl+V).' : 'No pude copiar solo: seleccioná el texto y copialo con Ctrl+C.'); return ok;
  }
}

// ───────── datos del folleto para armar los textos ─────────
/** "del lunes 12 al domingo 18 de octubre", "hasta el domingo 18 de octubre", "solo por hoy"… */
function fechasSociales(V) {
  const a = parseISO(V.desde), b = parseISO(V.hasta), h0 = hoy0();
  const dia = d => `${DIAS[d.getDay()]} ${d.getDate()}`, diaMes = d => `${dia(d)} de ${MESES[d.getMonth()]}`;
  if (a && b) {
    if (+a === +b) return +a === +h0 ? 'solo por hoy' : `solo el ${diaMes(a)}`;
    return a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear() ? `del ${dia(a)} al ${diaMes(b)}` : `del ${diaMes(a)} al ${diaMes(b)}`;
  }
  if (b) return `hasta el ${diaMes(b)}`;
  if (a) return `desde el ${diaMes(a)}`;
  return '';
}
const capitalizar = s => (s ? s[0].toLocaleUpperCase('es-AR') + s.slice(1) : s);
function datosDelFolleto(S) {
  const L = LAYOUTS[S.formato] || LAYOUTS.a4_10, g = L.grupo, C = S.comercio || {}, V = S.vigencia || {}, P = promoInfo(S);
  const usados = g === 'coleccion' || g === 'mensaje' || g === 'comida' ? [] : S.productos.slice(0, L.slots).filter(p => !productoVacio(p));
  const porProducto = hayCondicionPorProducto(S);
  const prods = usados.map(p => {
    const I = infoProducto(p), PP = promoDeProducto(p, S);
    return { p, nombre: String(p.nombre || '').trim() || 'Producto', unidad: String(p.unidad || '').trim(), F: I.F, R: I.F && I.R && I.R.num > I.F.num ? I.R : null, pct: I.pct, ahorro: I.ahorro,
      etiqueta: String(p.etiqueta || '').trim(), nota: String(p.nota || '').trim(), cond: !porProducto ? null : PP ? (P && PP.tipo === P.tipo ? null : PP.frase) : (P ? 'con cualquier medio de pago' : null),
      alcohol: RE_ALCOHOL.test((p.nombre || '') + ' ' + (p.desc || '')) };
  });
  const titulo = g === 'comida' ? (S.comida || {}).nombre : g === 'mensaje' ? (S.mensaje || {}).titulo : g === 'coleccion' ? (S.coleccion || {}).mensaje : g === 'unico' ? (S.destacado || {}).mensaje || S.titulo : S.titulo;
  const dir = String(C.direccion || '').trim(), barrio = (/^\s*(barrio [^,]+)/i.exec(dir) || [])[1] || '', calle = dir.replace(/^\s*barrio [^,]+,\s*/i, '');
  const b = parseISO(V.hasta), faltan = b ? Math.round((b - hoy0()) / 86400000) : null;
  return { S, g, C, V, P, prods, titulo: String(titulo || 'Ofertas de la semana').trim(), emoji: EMOJI_TEMA[S.tema] || '🧡', fechas: fechasSociales(V), faltan, dir, barrio, calle,
    nombre: String(C.nombre || 'Rivero Market').trim(), alcohol: prods.some(x => x.alcohol) || (g === 'coleccion' && !!(S.coleccion || {}).alcohol) };
}
/** Frase de la promo general: "Precios con 10% OFF pagando con QR de Mercado Pago." */
function frasePromo(D) {
  const P = D.P; if (!P) return '';
  if (P.pct && P.extra) return `Además, ${P.pctTxt}% OFF extra ${P.frase}.`;
  if (P.pct) return `Precios con ${P.pctTxt}% OFF ${P.frase}.`;
  if (P.cuotas) return `${P.cuotas} cuotas sin interés ${P.frase}.`;
  return capitalizar(`${P.tipo === 'efectivo' ? 'Precios' : 'Válido'} ${P.frase}.`);
}
function lineaStock(D) { const st = String(D.S.legal.stock || '').trim(); return D.V.agotar && st ? `Stock: ${st}.` : ''; }
/** Una línea por producto. wa = formato de WhatsApp (*negrita* y ~tachado~). */
function lineaProducto(x, o = {}) {
  const b = s => (o.wa ? `*${s}*` : s), t = s => (o.wa ? `~${s}~` : s);
  const precio = x.F ? b(precioTxt(x.F)) + (x.unidad ? ' ' + x.unidad : '') : '';
  let ln = `${o.vinieta || '•'} ${b(x.nombre)}`;
  if (precio) ln += (o.dosPuntos ? ': ' : ' a ') + precio;
  if (x.R && o.antes !== false) ln += o.wa ? (x.R.separado ? ` (por separado ${t(precioTxt(x.R))})` : ` ${t(precioTxt(x.R))}`) : ` (${x.R.separado ? 'por separado' : 'antes'} ${precioTxt(x.R)}${x.pct ? `, ${x.pct}% OFF` : ''})`;
  if (x.R && x.pct && o.wa && o.pct !== false) ln += ` (-${x.pct}%)`;
  if (o.ahorro && x.ahorro) ln += ` · ahorrás ${pesos(x.ahorro)}`;
  if (x.etiqueta && !/^-?\d+%?$/.test(x.etiqueta)) ln += ` · ${mayus(x.etiqueta)}`;
  if (x.nota && o.notas !== false) ln += ` · ${x.nota}`;
  if (x.cond) ln += ` (${x.cond})`;
  return ln;
}
const CTA_CANAL = ['📲 ¿Conocés a alguien que le sirva? ¡Reenviáselo!', '📲 Compartilo con tu familia y tus vecinos 🙌', '📲 Reenvialo a quien esté haciendo las compras 😉'];
const CTA_GRUPO = ['📣 Enterate primero de todas las ofertas en nuestro canal de WhatsApp:', '📣 Sumate a nuestro canal y recibí las ofertas antes que nadie:', '📣 ¿Todavía no estás en nuestro canal? Sumate acá:'];
const INTRO_VECINAL = ['¡Hola, {vecinos}! 👋', '¡Buen día, {vecinos}! ☀️', '¡Hola, {vecinos}! ¿Cómo andan? 👋'];
const elegirV = (arr, k) => arr[((k % arr.length) + arr.length) % arr.length];

/** Arma el texto para publicar. destino: canal | grupos | facebook | estado. tono: clasico | urgente | vecinal. */
/** Palabra que el cliente dice en la caja para saber de qué canal vino (se anota en «Mis folletos» → «¿Cómo te fue?»). */
const CLAVES = { canal: 'CANAL', grupos: 'GRUPO', estado: 'ESTADO', facebook: 'FACE' };
const lineaClave = (S, destino) => { const c = CLAVES[destino], pr = String((S.medir || {}).premio || '').trim(); return c ? `🗣 Decí «${c}» en la caja${pr ? ' ' + pr : ''}.` : ''; };
function textoPublicacion(S, destino = 'canal', tono = 'clasico', op = {}) {
  const D = datosDelFolleto(S), k = op.variante || 0, wa = destino !== 'facebook';
  const b = s => (wa ? `*${s}*` : s), out = [];
  const hor = String(D.C.horario || '').trim(), numWA = waNumero(D.C.whatsapp), pedir = numWA ? waLink(numWA) : '';
  const lugar = D.dir ? `📍 ${D.dir}` + (hor ? `\n🕘 ${hor}` : '') + (op.mapa && D.C.mapa ? `\n🗺️ Cómo llegar: ${D.C.mapa}` : '') : '';
  const cierre = () => {
    const c = [];
    if (destino === 'canal') c.push(elegirV(CTA_CANAL, k));
    if ((destino === 'grupos' || destino === 'facebook') && D.C.waCanal) c.push(`${elegirV(CTA_GRUPO, k)} ${D.C.waCanal}`);
    if (pedir) c.push(`💬 Pedí por WhatsApp: ${pedir}`);                              // el link abre el chat (desde el celular el QR no sirve)
    else if (D.C.telefono && destino !== 'facebook') c.push(`💬 Consultas y pedidos: ${D.C.telefono}`);
    if (destino === 'facebook') {
      const ig = String(D.C.instagram || '').trim();
      if (ig) c.push(`📸 Seguinos en Instagram: ${ig.startsWith('@') ? ig : '@' + ig}`);
      if (D.C.telefono && !pedir) c.push(`💬 Consultas y pedidos por WhatsApp: ${D.C.telefono}`);
      if (op.hashtags !== false) c.push('\n' + ['#' + D.nombre.replace(/\s+/g, ''), D.barrio ? '#' + D.barrio.replace(/\s+/g, '') : '', '#Ofertas', HASHTAG_TEMA[S.tema] || ''].filter(Boolean).join(' '));
    }
    if (op.clave) c.push(lineaClave(S, destino));
    if (op.alcohol) c.push((wa ? '_' : '') + LEYENDA_ALCOHOL_TXT + (wa ? '_' : ''));
    return c;
  };
  const vigencia = [D.fechas ? capitalizar(D.fechas) : '', D.V.agotar ? 'hasta agotar stock' : ''].filter(Boolean).join(' · ');
  // ── combo de comida: el nombre, lo que trae y el precio ──
  if (D.g === 'comida') {
    const Cm = S.comida || {}, pr = parsePrecio(Cm.precio);
    out.push(`${D.emoji} ${b(mayus(String(Cm.cartel || '¡Súper oferta!')))}`, `${b(mayus(D.titulo))}${pr ? ' · ' + b('$' + Cm.precio) : ''}`, '');
    (Cm.items || []).filter(x => String(x.texto || '').trim()).forEach(x => out.push(`▪️ ${[String(x.cant || '').trim(), String(x.texto).trim()].filter(Boolean).join(' ')}`));
    if (D.P) out.push('', `${D.emoji} ${capitalizar(D.P.frase)}`);
    if (vigencia) out.push(`📅 ${vigencia}`);
    out.push('', `${D.nombre}${lugar ? '\n' + lugar : ''}`, ...cierre());
    return out.join('\n').replace(/\n{3,}/g, '\n\n').trim();
  }
  // ── folletos de mensaje (sin productos) ──
  if (D.g === 'mensaje') {
    const M = S.mensaje || {}, grande = String(M.grande || (D.P && D.P.pct ? D.P.pctTxt + '%' : '')).trim(), cond = String(M.condicion || '').trim() || (D.P ? D.P.frase : '');
    out.push(`📢 ${b(mayus(D.titulo))}`);
    if (grande) out.push(`${D.emoji} ${b(grande + ' ' + (String(M.grande2 || '').trim() || 'de descuento'))}${cond ? ' ' + cond : ''}`);
    else if (cond) out.push(`${D.emoji} ${capitalizar(cond)}`);
    if (M.texto) out.push(String(M.texto).trim());
    if (vigencia) out.push(`📅 ${vigencia}`);
    out.push('', `${D.nombre}${lugar ? '\n' + lugar : ''}`, ...cierre());
    return out.join('\n').replace(/\n{3,}/g, '\n\n').trim();
  }
  // ── «mostrar productos» (sin precios) ──
  if (D.g === 'coleccion') {
    const Co = S.coleccion || {};
    out.push(`${D.emoji} ${b(D.titulo)}`);
    if (Co.ocasion || Co.kicker) out.push([Co.ocasion, Co.kicker].filter(Boolean).join(' · '));
    out.push('', `🛒 Lo encontrás en ${D.nombre}.`, lugar, ...cierre());
    return out.filter(x => x !== undefined).join('\n').replace(/\n{3,}/g, '\n\n').trim();
  }
  // ── folletos con productos y precios ──
  let lista = D.prods;
  if (tono === 'urgente' && lista.length > 6) lista = [...lista].sort((x, y) => (y.pct || 0) - (x.pct || 0)).slice(0, 5);
  const promo = frasePromo(D), stock = tono === 'urgente' ? '' : lineaStock(D);
  if (tono === 'urgente') {
    const f = D.faltan, dHasta = parseISO(D.V.hasta);
    const cuando = f === 0 ? '¡ÚLTIMO DÍA!' : f === 1 ? '¡TERMINAN MAÑANA!' : f != null && f > 1 && f <= 7 ? `¡QUEDAN ${f} DÍAS!` : '¡APROVECHÁ AHORA!';
    out.push(`⏰ ${b(cuando)} ${dHasta ? `Las ofertas de ${D.nombre} terminan ${f === 0 ? 'hoy' : 'el ' + DIAS[dHasta.getDay()] + ' ' + dHasta.getDate() + ' de ' + MESES[dHasta.getMonth()]}` : `Ofertas de ${D.nombre} hasta agotar stock`}`, '');
    lista.forEach(x => out.push(lineaProducto(x, { wa, vinieta: '💥', antes: false, ahorro: true, notas: false, dosPuntos: true })));
    if (D.prods.length > lista.length) out.push(`👉 Y ${D.prods.length - lista.length} ofertas más en el local.`);
    out.push('', promo, `🏃 Pasá antes de que se terminen.${D.dir ? ' Te esperamos en ' + (D.calle || D.dir) + '.' : ''}`);
  } else if (tono === 'vecinal') {
    out.push(elegirV(INTRO_VECINAL, k).replace('{vecinos}', D.barrio ? 'vecinos de ' + D.barrio : 'vecinos'), `Esta semana en ${D.nombre} les preparamos estas ofertas ${D.emoji}:`, '');
    lista.forEach(x => out.push(lineaProducto(x, { wa, vinieta: '•', dosPuntos: true })));
    out.push('', promo, D.fechas ? `Valen ${D.fechas}${D.V.agotar ? ' o hasta agotar stock' : ''}.` : D.V.agotar ? 'Hasta agotar stock.' : '', stock, D.calle || D.dir ? `¡Los esperamos en ${D.calle || D.dir}! 🧡` : '¡Los esperamos! 🧡');
    if (op.mapa && D.C.mapa) out.push(`🗺️ Cómo llegar: ${D.C.mapa}`);
    out.push(...cierre());
    return out.join('\n').replace(/\n{3,}/g, '\n\n').trim();
  } else {
    out.push(`${D.emoji} ${b(mayus(D.titulo))} en ${D.nombre}`);
    if (vigencia) out.push(`📅 ${vigencia}`);
    out.push('');
    lista.forEach(x => out.push(lineaProducto(x, wa ? { wa, vinieta: '🔥' } : { vinieta: '✅', dosPuntos: true })));
    out.push('', promo, stock);
  }
  out.push(lugar, ...cierre());
  return out.filter(x => x != null).join('\n').replace(/\n{3,}/g, '\n\n').trim();
}
/** Textos cortos para los Estados (uno general y uno por producto). Sin formato: los Estados no lo muestran. */
function textosEstados(S, op = {}) {
  const D = datosDelFolleto(S), hasta = parseISO(D.V.hasta), fin = hasta ? `hasta el ${DIAS[hasta.getDay()]} ${hasta.getDate()}` : D.V.agotar ? 'hasta agotar stock' : '';
  const firma = `📍 ${D.nombre}${D.calle ? ', ' + D.calle : ''}`;
  const cond = D.P && D.P.pct && !D.P.extra ? ` (${D.P.pctTxt}% OFF ${D.P.frase})` : D.P ? ` (${D.P.frase})` : '';
  const general = D.g === 'mensaje' ? `📢 ${D.titulo}${D.fechas ? ' · ' + D.fechas : ''} · ${firma}`
    : D.g === 'coleccion' ? `${D.emoji} ${D.titulo} · ${firma}`
    : `${D.emoji} ${D.titulo}: ¡${D.prods.length} ${D.prods.length === 1 ? 'oferta' : 'ofertas'}${fin ? ' ' + fin : ''}! ${firma}`;
  const porProducto = D.prods.map(x => {
    let t = `🔥 ${x.nombre}${x.F ? ' a ' + precioTxt(x.F) + (x.unidad ? ' ' + x.unidad : '') : ''}`;
    if (x.R) t += ` (antes ${precioTxt(x.R)})`;
    if (x.cond) t += ` · ${x.cond}`; else if (cond && x.R) t += cond;
    if (fin) t += ` · ${fin}`;
    t += ` · ${firma}`;
    if (op.alcohol && x.alcohol) t += ` · ${LEYENDA_ALCOHOL_TXT}`;
    return { nombre: x.nombre, texto: t };
  });
  return { general: general + (op.clave ? ' ' + lineaClave(S, 'estado') : '') + (op.alcohol && D.alcohol ? ' · ' + LEYENDA_ALCOHOL_TXT : ''), porProducto };
}

// ───────── plan de publicación ─────────
const HORA = (h, m = 0) => `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
function armarPlan(S, op = {}) {
  const D = datosDelFolleto(S), V = S.vigencia || {};
  let ini = parseISO(V.desde) || hoy0(), fin = parseISO(V.hasta) || masDias(ini, 6);
  if (fin < ini) fin = ini;
  const dias = Math.min(14, Math.round((fin - ini) / 86400000) + 1), cadaH = op.cadaHoras || 1, desdeH = op.desde ?? 10, hastaH = op.hasta ?? 20;
  const conProductos = D.prods.length > 0, out = [];
  const item = (dia, hora, canal, que, texto, extra = {}) => ({ id: `${isoDe(dia)} ${hora} ${canal} ${que}`, dia, hora, canal, que, texto, ...extra });
  for (let n = 0; n < dias; n++) {
    const dia = masDias(ini, n), items = [], ultimo = n === dias - 1 && dias > 1;
    if (n === 0) {
      items.push(item(dia, '08:30', 'canal', 'Folleto completo (imagen «Canal WhatsApp») con el texto del canal', () => textoPublicacion(S, 'canal', 'clasico', op)));
      items.push(item(dia, '09:00', 'estado', 'Folleto en formato Historia (imagen «Estado e Historia»)', () => textosEstados(S, op).general));
      items.push(item(dia, '12:30', 'facebook', 'Publicación con el folleto (imagen «Post Facebook») y el texto de Facebook', () => textoPublicacion(S, 'facebook', 'clasico', op)));
      if (conProductos) {
        const T = textosEstados(S, op).porProducto; let h0 = desdeH;
        T.forEach((x, i) => { if (h0 + i * cadaH <= hastaH) items.push(item(dia, HORA(h0 + i * cadaH), 'estado', `Un producto: ${x.nombre} (imagen «UN PRODUCTO POR IMAGEN» n.º ${String(i + 1).padStart(2, '0')})`, () => x.texto)); });
      }
      items.push(item(dia, '20:30', 'grupos', 'Mandalo a tus grupos y listas de difusión', () => textoPublicacion(S, 'grupos', 'vecinal', op)));
    } else if (ultimo) {
      items.push(item(dia, '09:00', 'canal', '«¡Último día!»: recordatorio con los mejores precios', () => textoPublicacion(S, 'canal', 'urgente', op)));
      items.push(item(dia, '12:00', 'estado', 'Folleto en formato Historia con «¡Último día!»', () => '⏰ ¡ÚLTIMO DÍA! ' + textosEstados(S, op).general));
      items.push(item(dia, '18:00', 'facebook', 'Historia de Facebook: «¡Último día!»', () => textoPublicacion(S, 'facebook', 'urgente', op)));
    } else {
      items.push(item(dia, '09:00', 'estado', 'Recordatorio: el folleto en formato Historia', () => textosEstados(S, op).general));
      if (conProductos) {
        const T = textosEstados(S, op).porProducto, a = T[(n * 2) % T.length], b2 = T[(n * 2 + 1) % T.length];
        items.push(item(dia, '13:00', 'estado', `Dos productos estrella: ${a.nombre}${b2 && b2 !== a ? ' y ' + b2.nombre : ''}`, () => [a.texto, b2 && b2 !== a ? b2.texto : ''].filter(Boolean).join('\n')));
      }
      items.push(item(dia, '19:30', 'facebook', 'Historia de Facebook con el folleto', () => textosEstados(S, op).general));
    }
    items.sort((a, b) => (a.hora < b.hora ? -1 : a.hora > b.hora ? 1 : 0));
    out.push({ dia, items });
  }
  return out;
}
const ICONO_CANAL = { canal: '📢', estado: '📱', facebook: '📰', grupos: '👥' };
const NOMBRE_CANAL = { canal: 'Canal de WhatsApp', estado: 'Estado de WhatsApp', facebook: 'Facebook / Instagram', grupos: 'Grupos y difusión' };
function icsDelPlan(plan) {
  const z = n => String(n).padStart(2, '0'), f = d => `${d.getFullYear()}${z(d.getMonth() + 1)}${z(d.getDate())}T${z(d.getHours())}${z(d.getMinutes())}00`;
  const esc = s => String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
  const plegar = l => { const cp = Array.from(l), out = []; for (let i = 0; i < cp.length; i += 40) out.push((i ? ' ' : '') + cp.slice(i, i + 40).join('')); return out.join('\r\n'); };   // renglones cortos (sin partir emojis)
  const L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Rivero Market//Folletos//ES', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH'], ahora = f(new Date());
  plan.forEach(d => d.items.forEach((it, i) => {
    const [hh, mm] = it.hora.split(':').map(Number), ini = new Date(d.dia.getFullYear(), d.dia.getMonth(), d.dia.getDate(), hh, mm);
    L.push('BEGIN:VEVENT', `UID:${f(ini)}-${i}-${uid()}@rivero-market`, `DTSTAMP:${ahora}`, `DTSTART:${f(ini)}`, `DTEND:${f(new Date(+ini + 15 * 60000))}`,
      plegar(`SUMMARY:${esc(ICONO_CANAL[it.canal] + ' Publicar: ' + NOMBRE_CANAL[it.canal])}`), plegar(`DESCRIPTION:${esc(it.que + '\n\n' + it.texto())}`),
      'BEGIN:VALARM', 'ACTION:DISPLAY', plegar(`DESCRIPTION:${esc('Publicar: ' + it.que)}`), 'TRIGGER:-PT0M', 'END:VALARM', 'END:VEVENT');
  }));
  L.push('END:VCALENDAR');
  return L.join('\r\n') + '\r\n';
}

// ───────── calculadora: ¿me conviene esta oferta?, precio desde el costo, combos ─────────
/** Cuánto se gana con y sin oferta, y cuánto más hay que vender para ganar lo mismo. */
function calcOferta(costo, normal, oferta) {
  const gN = normal - costo, gO = oferta - costo;
  return { gN, gO, mN: normal > 0 ? gN / normal : 0, mO: oferta > 0 ? gO / oferta : 0, markN: costo > 0 ? gN / costo : 0, desc: normal > 0 ? (normal - oferta) / normal : 0,
    factor: gO > 0 && gN > 0 ? gN / gO : gO > 0 ? 1 : Infinity };
}
const pct1 = x => (Math.round(x * 1000) / 10).toLocaleString('es-AR') + ' %';
const numDe = v => { const P = parsePrecio(v); return P ? P.num : 0; };

// ───────── fechas comerciales de Argentina, con ideas ─────────
function primerLunes(y, mes) { const d = new Date(y, mes, 1); d.setDate(1 + ((8 - d.getDay()) % 7)); return d; }
function eventosComerciales(y) {
  return [
    { id: 'anionuevo', nombre: 'Año Nuevo', fecha: new Date(y, 0, 1), tema: 'anionuevo', antes: 10, ideas: ['Sidra, espumantes y ananá fizz', 'Hielo y gaseosas', 'Pan dulce, budines y garrapiñadas', 'Picada para la previa (fiambres y quesos)'] },
    { id: 'reyes', nombre: 'Día de Reyes', fecha: new Date(y, 0, 6), tema: 'reyes', antes: 7, ideas: ['Golosinas y chocolates para los chicos', 'Rosca de Reyes y sus ingredientes'] },
    { id: 'sanvalentin', nombre: 'San Valentín', fecha: new Date(y, 1, 14), tema: 'rojo', antes: 7, ideas: ['Bombones y chocolates', 'Vino o espumante', '«Picada para dos»: fiambres, quesos y pan'] },
    { id: 'carnaval', nombre: 'Carnaval (fin de semana largo)', fecha: masDias(pascua(y), -48), tema: null, antes: 5, ideas: ['Bebidas frías y hielo', 'Snacks y picadas', 'Carne, chorizo y carbón para el asado'] },
    { id: 'clases', nombre: 'Vuelta a clases (según la provincia)', fecha: primerLunes(y, 2), tema: null, antes: 10, ideas: ['Galletitas, cacao y leche para la merienda', 'Jugos y alfajores para la mochila', 'Pan, fiambre y queso para las viandas'] },
    { id: 'pascuas', nombre: 'Semana Santa y Pascuas', fecha: pascua(y), tema: 'pascuas', antes: 10, ideas: ['Huevos de Pascua y chocolates', 'Rosca de Pascua', 'Atún, caballa y sardinas para el Viernes Santo', 'Empanadas de vigilia (atún, choclo)'] },
    { id: 'trabajador', nombre: 'Día del Trabajador', fecha: new Date(y, 4, 1), tema: 'trabajador', antes: 5, ideas: ['Combo locro: porotos, maíz pisado, zapallo, panceta y chorizo colorado', 'Carne y carbón para el asado del feriado'] },
    { id: 'mayo25', nombre: '25 de Mayo', fecha: new Date(y, 4, 25), tema: 'patrias', antes: 7, ideas: ['Combo locro', 'Empanadas: tapas, carne, cebolla, huevo y aceitunas', 'Pastelitos: masa, membrillo y batata', 'Chocolate caliente'] },
    { id: 'padre', nombre: 'Día del Padre', fecha: nDomingo(y, 5, 3), tema: 'padre', antes: 10, ideas: ['Fernet, vinos y cervezas', 'Picada: salame, jamón crudo y quesos', 'Combo «Asado de papá»: carne, chorizo y carbón'] },
    { id: 'aguinaldo1', nombre: 'Cobro del aguinaldo (mitad de año)', fecha: new Date(y, 5, 30), tema: null, antes: 3, ideas: ['Packs y fardos (precio por cantidad)', 'Almacén: aceite, yerba, harina, fideos, arroz'] },
    { id: 'julio9', nombre: '9 de Julio', fecha: new Date(y, 6, 9), tema: 'patrias', antes: 7, ideas: ['Pastelitos y tortas fritas', 'Combo locro', 'Chocolate caliente y churros'] },
    { id: 'amigo', nombre: 'Día del Amigo', fecha: new Date(y, 6, 20), tema: 'naranja', antes: 5, ideas: ['Picadas para compartir', 'Fernet, cerveza y gaseosas', 'Combo «Juntada»: picada + bebida'] },
    { id: 'nino', nombre: 'Día del Niño', fecha: nDomingo(y, 7, 3), tema: 'nino', antes: 10, ideas: ['Golosinas, alfajores y chocolates', 'Chocolatada y galletitas', 'Todo para la torta (repostería)'] },
    { id: 'primavera', nombre: 'Día de la Primavera y del Estudiante', fecha: new Date(y, 8, 21), tema: 'primavera', antes: 5, ideas: ['Bebidas y jugos para el picnic', 'Sándwiches: pan, fiambre y queso', 'Snacks y galletitas'] },
    { id: 'madre', nombre: 'Día de la Madre', fecha: nDomingo(y, 9, 3), tema: 'madre', antes: 14, ideas: ['«Todo para la torta de mamá»: harina, manteca, crema, cobertura y dulce de leche', 'Bombones y chocolates', 'Espumante o vino para brindar'] },
    { id: 'halloween', nombre: 'Halloween', fecha: new Date(y, 9, 31), tema: 'halloween', antes: 7, ideas: ['Golosinas, chupetines y caramelos en bolsa', 'Combo de golosinas para repartir'] },
    { id: 'tradicion', nombre: 'Día de la Tradición', fecha: new Date(y, 10, 10), tema: 'patrias', antes: 5, ideas: ['Yerba y bizcochitos para el mate', 'Tortas fritas: harina y grasa', 'Empanadas y pastelitos'] },
    { id: 'blackfriday', nombre: 'Black Friday', fecha: blackFriday(y), tema: 'blackfriday', antes: 7, ideas: ['Liquidación de lo que más stock tenés', 'Fardos y packs a precio especial', 'Ofertas «solo por hoy» para traer gente'] },
    { id: 'aguinaldo2', nombre: 'Cobro del aguinaldo (fin de año)', fecha: new Date(y, 11, 18), tema: null, antes: 3, ideas: ['Canasta navideña armada', 'Fardos de bebidas para las fiestas'] },
    { id: 'navidad', nombre: 'Navidad', fecha: new Date(y, 11, 24), tema: 'navidad', antes: 21, ideas: ['Pan dulce, budines, turrones y garrapiñadas', 'Sidra y espumantes', 'Vitel toné: peceto, atún, mayonesa y alcaparras', 'Canasta navideña (combo)'] },
    { id: 'finanio', nombre: 'Fin de año', fecha: new Date(y, 11, 31), tema: 'anionuevo', antes: 7, ideas: ['Hielo, gaseosas y sidra', 'Picada para la previa'] },
  ];
}
function proximosEventos(dias = 150) {
  const h0 = hoy0(), y = h0.getFullYear(), out = [];
  for (const e of [...eventosComerciales(y), ...eventosComerciales(y + 1)]) {
    const falta = Math.round((e.fecha - h0) / 86400000);
    if (falta >= 0 && falta <= dias) out.push({ ...e, falta, desde: masDias(e.fecha, -e.antes) });
  }
  return out.sort((a, b) => a.fecha - b.fecha);
}
function usarEvento(e) {
  if (e.tema && THEMES[e.tema]) { S.tema = e.tema; aplicarTextosDeTema(e.tema); }
  const h0 = hoy0(); S.vigencia.desde = isoDe(e.desde > h0 ? e.desde : h0); S.vigencia.hasta = isoDe(e.fecha);
  construirPanel(); cambio();
  aviso(`Listo: ${e.tema && THEMES[e.tema] ? 'fondo «' + THEMES[e.tema].nombre + '» y ' : ''}vigencia del ${fechaLinda(parseISO(S.vigencia.desde))} al ${fechaLinda(e.fecha)}.`, 6000);
}

// ───────── ideas para vender más (con casillas para ir marcando) ─────────
const GUIA = [
  ['Que te encuentren', [
    ['google', 'Perfil de Empresa en Google (Google Maps)', 'Cuando alguien busca «almacén» o «fiambrería» cerca, aparecen los que tienen perfil. Es gratis: crealo o reclamalo en google.com/business con dirección, horarios, teléfono o WhatsApp y fotos del local. Pedí a los clientes contentos que dejen una reseña y publicá las ofertas de la semana como «Novedad».'],
    ['cartel', 'Que se vea desde la vereda', 'Cartel con el nombre y el folleto de la semana en la vidriera o en la puerta. El QR del canal impreso y bien grande.'],
  ]],
  ['WhatsApp', [
    ['business', 'Usá WhatsApp Business (gratis)', 'Tiene catálogo con fotos y precios, mensaje de bienvenida y de ausencia, respuestas rápidas (por ejemplo «/ofertas») y etiquetas para clientes frecuentes.'],
    ['canal', 'Hacé crecer el canal', 'QR en la caja y en la puerta, y decilo en cada venta: «¿te sumás al canal? te avisamos las ofertas antes». Publicá con constancia: entre 1 y 3 veces por día, no más (si no, lo silencian).'],
    ['estados', 'Estados: un producto por hora', 'Los Estados duran 24 horas y solo los ve quien tiene tu número agendado (y vos el suyo): agendá a cada cliente que te escriba. Usá «Un producto por imagen» al finalizar y el «Plan de la semana».'],
    ['difusion', 'Listas de difusión por tipo de cliente', 'Por ejemplo «Reposteras», «Asado y picadas», «Vecinos». Mandá a cada lista lo que le interesa: se lee mucho más que un mensaje para todos.'],
  ]],
  ['Facebook e Instagram', [
    ['post', 'Publicá el folleto con texto', 'Usá la imagen «Post Facebook» y el texto listo de «Textos para publicar». Fijá la publicación de la semana arriba de todo en tu página.'],
    ['grupos', 'Grupos del barrio', 'Compartí las ofertas en los grupos de vecinos de la zona (respetando sus reglas). Es gente que vive cerca y puede pasar hoy mismo.'],
    ['responder', 'Respondé rápido', 'Un mensaje contestado en minutos suele ser una venta. Si no podés, dejá una respuesta automática con el horario y el link del canal.'],
  ]],
  ['En el local', [
    ['carteles', 'Carteles de precio grandes', 'Las ofertas tienen que verse también adentro: imprimí el folleto «Un solo producto» en A4 y ponelo al lado del producto.'],
    ['punta', 'El producto estrella en la entrada', 'Lo que más se vende en oferta va en la punta de góndola o donde se ve al entrar.'],
    ['caja', 'Compra por impulso en la caja', 'Golosinas, pilas, bebidas frías, alfajores: cerca de la caja se venden solos.'],
    ['combos', 'Combos armados', 'Una canasta o bolsa ya armada (picada, locro, torta) se vende más que los productos sueltos. Armalos con la calculadora de combos.'],
  ]],
  ['Precios y promos', [
    ['gancho', 'Un producto gancho por semana', 'Uno o dos productos muy buscados a un precio que llame la atención, con stock limitado. Antes calculá cuánto te cuesta con «¿Me conviene?».'],
    ['cantidad', 'Que lleven más', '2x1, 3x2, 2.ª al 50 % o «Llevando 3» suben el ticket promedio. El programa calcula solo el precio por unidad.'],
    ['rotar', 'Rotá las ofertas', 'Si algo está siempre en oferta, deja de ser oferta. Cambiá los productos cada semana y anunciá siempre el mismo día.'],
    ['antes', 'El «antes» siempre real', 'Es lo que pide la ley y cuida la confianza: si el cliente ve que el descuento es verdad, vuelve.'],
  ]],
  ['Que vuelvan', [
    ['sellos', 'Tarjeta de sellos', '«10 compras = un regalo». Elegí un regalo con buen margen. Es barata y hace que vuelvan a vos y no al súper.'],
    ['pedidos', 'Pedidos por WhatsApp', '«Te lo separo y lo pasás a buscar» (o envío en el barrio). Anotá qué compra cada cliente frecuente y avisale cuando está en oferta.'],
    ['trato', 'El trato de barrio', 'Saludá por el nombre y preguntá qué les falta: es lo que el súper no puede dar.'],
  ]],
  ['Medir lo que funciona', [
    ['anotar', 'Anotá las ventas de cada oferta', 'Cuántas unidades vendías antes y cuántas durante la oferta. Repetí lo que funciona y cambiá lo que no.'],
    ['canalcrece', 'Mirá cuántos se suman al canal', 'Si cada semana se suman más, vas bien. Si no, poné el QR en más lugares y recordalo en cada venta.'],
    ['probar', 'Probá de a una cosa', 'Otro horario de publicación, otro tipo de folleto, otro día de ofertas: cambiá una sola cosa por vez y compará.'],
  ]],
  ['Lo legal (guía, no reemplaza a un abogado o contador)', [
    ['fechas', 'Fecha de inicio y de fin', 'Toda oferta tiene que decir desde y hasta cuándo vale (Ley 24.240, art. 7).'],
    ['stock', '«Hasta agotar stock» con cantidad', 'Si limitás la cantidad, decí con cuántas unidades contás (Dto. 1798/94, art. 7).'],
    ['alcohol', 'Bebidas alcohólicas', 'La publicidad lleva «Beber con moderación. Prohibida su venta a menores de 18 años» (Ley 24.788). En los textos para publicar se puede agregar con una casilla.'],
    ['tabaco', 'Cigarrillos, no', 'La publicidad de tabaco está prohibida en folletos e internet (Ley 26.687).'],
    ['sorteos', 'Sorteos', 'Si para participar hay que comprar, puede estar prohibido (Dto. 274/2019). Consultá antes de hacer uno.'],
  ]],
];

// ───────── la ventana de Marketing ─────────
const MKT = { textoPublicacion, textosEstados, armarPlan, icsDelPlan, calcOferta, proximosEventos, eventosComerciales, datosDelFolleto };
const PESTANAS = [['textos', '📣 Textos para publicar'], ['plan', '🗓 Plan de la semana'], ['calc', '🧮 ¿Me conviene?'], ['combo', '🎁 Armar un combo'], ['sellos', '🎟 Tarjeta de sellos'], ['fechas', '📅 Fechas que vienen'], ['ideas', '💡 Ideas para vender más']];
function abrirMarketing(pest = 'textos') {
  let actual = PESTANAS.some(([k]) => k === pest) ? pest : 'textos';
  const barra = h('div', { class: 'mkt-tabs', role: 'tablist', 'aria-label': 'Herramientas de marketing' });
  const cont = h('div', { class: 'mkt-cuerpo' });
  const pintar = () => {
    barra.replaceChildren(...PESTANAS.map(([k, t]) => h('button', { type: 'button', role: 'tab', class: 'mkt-tab', 'aria-selected': String(k === actual), onclick: () => { actual = k; pintar(); } }, t)));
    const f = { textos: mktTextos, plan: mktPlan, calc: mktCalc, combo: mktCombo, sellos: mktSellos, fechas: mktFechas, ideas: mktIdeas }[actual];
    cont.replaceChildren(f(m));
    cont.scrollTop = 0;
  };
  const m = abrirModal({ titulo: 'Marketing · para vender más', ancho: 920, clase: 'mkt-modal', cuerpo: h('div', { class: 'stack' }, barra, cont) });
  m.ir = k => { actual = k; pintar(); };
  pintar();
  return m;
}
function botonCopiar(fn, etq = 'Copiar') { return h('button', { class: 'btn small primary', type: 'button', onclick: () => copiarTexto(typeof fn === 'function' ? fn() : fn) }, '⧉ ' + etq); }
function aWhatsApp(texto) { return 'https://wa.me/?text=' + encodeURIComponent(texto); }

function mktTextos() {
  const D = datosDelFolleto(S), sinProductos = !D.prods.length && !['mensaje', 'coleccion', 'comida'].includes(D.g);
  const st = lsJSON('rm.mkt.textos', {}), op = { destino: st.destino || 'canal', tono: st.tono || 'clasico', hashtags: st.hashtags !== false, mapa: st.mapa !== false, alcohol: st.alcohol != null ? st.alcohol : alcoholActivo(S), clave: !!st.clave, variante: 0 };
  const guardarOp = () => lsGuardar('rm.mkt.textos', { destino: op.destino, tono: op.tono, hashtags: op.hashtags, mapa: op.mapa, alcohol: op.alcohol, clave: op.clave });
  const area = h('textarea', { rows: 14, class: 'mkt-texto', 'aria-label': 'Texto para publicar' });
  const cuenta = h('small', { class: 'hint' });
  const estados = h('div', { class: 'stack' });
  const chip = (grupo, valor, texto) => h('button', { type: 'button', class: 'q' + (op[grupo] === valor ? ' on' : ''), 'aria-pressed': String(op[grupo] === valor), onclick: () => { op[grupo] = valor; op.variante = 0; guardarOp(); actualizar(); } }, texto);
  const filaDestino = h('div', { class: 'quick' }), filaTono = h('div', { class: 'quick' });
  const extras = h('div', { class: 'mkt-extras' });
  const btnWA = h('a', { class: 'btn small', target: '_blank', rel: 'noopener' }, 'Abrir en WhatsApp ↗');
  function actualizar() {
    filaDestino.replaceChildren(h('span', { class: 'lab' }, '¿Dónde?'), chip('destino', 'canal', '📢 Canal de WhatsApp'), chip('destino', 'grupos', '👥 Grupos y chats'), chip('destino', 'estado', '📱 Estados'), chip('destino', 'facebook', '📰 Facebook / Instagram'));
    filaTono.replaceChildren(h('span', { class: 'lab' }, 'Tono:'), chip('tono', 'clasico', 'Clásico'), chip('tono', 'urgente', '⏰ Urgente'), chip('tono', 'vecinal', '👋 Cercano'));
    filaTono.hidden = op.destino === 'estado';
    llenar(extras,
      op.destino === 'facebook' ? check('Hashtags', null, op.hashtags, v => { op.hashtags = v; guardarOp(); actualizar(); }) : null,
      D.C.mapa && op.destino !== 'estado' ? check('Link de «cómo llegar»', null, op.mapa, v => { op.mapa = v; guardarOp(); actualizar(); }) : null,
      check('Palabra clave para saber de dónde vienen', `Agrega «Decí «${CLAVES[op.destino] || 'CANAL'}» en la caja». Anotá cuántos la dicen en «Mis folletos» → «¿Cómo te fue?».`, op.clave, v => { op.clave = v; guardarOp(); actualizar(); }),
      op.clave ? campo('Premio por decirla', texto(S.medir || (S.medir = { premio: '' }), 'premio', { ph: 'opcional · ej.: y sumás un sello extra', max: 50, after: () => { guardarAuto(); actualizar(); } }), 'opcional') : null,
      D.alcohol ? check('Leyenda de alcohol', 'Ley 24.788. En el folleto ' + (alcoholActivo(S) ? 'está activada.' : 'está apagada.'), op.alcohol, v => { op.alcohol = v; guardarOp(); actualizar(); }) : null);
    if (op.destino === 'estado') {
      const T = textosEstados(S, op);
      area.hidden = true; btnWA.hidden = true; cuenta.textContent = '';
      estados.replaceChildren(h('p', { class: 'hint', style: 'margin:0' }, 'Para poner debajo de cada imagen del Estado. Uno general (con el folleto) y uno por producto (con «Un producto por imagen»).'),
        h('div', { class: 'mkt-linea' }, h('span', null, T.general), botonCopiar(T.general)),
        ...T.porProducto.map((x, i) => h('div', { class: 'mkt-linea' }, h('span', null, h('b', null, String(i + 1).padStart(2, '0') + ' · '), x.texto), botonCopiar(x.texto))));
      estados.hidden = false;
    } else {
      area.hidden = false; btnWA.hidden = op.destino === 'facebook'; estados.hidden = true;
      area.value = textoPublicacion(S, op.destino, op.tono, op);
      cuenta.textContent = `${area.value.length} caracteres` + (op.destino !== 'facebook' ? ' · en WhatsApp, lo que está entre *asteriscos* sale en negrita y entre ~rayitas~ sale tachado.' : '');
      btnWA.href = aWhatsApp(area.value);
    }
  }
  area.addEventListener('input', () => { btnWA.href = aWhatsApp(area.value); cuenta.textContent = `${area.value.length} caracteres (editado a mano)`; });
  actualizar();
  return h('div', { class: 'stack' },
    sinProductos ? h('p', { class: 'demo-note', style: 'margin:0' }, 'Todavía no hay productos en el folleto: cargalos y los textos se arman solos.') : null,
    h('p', { class: 'hint', style: 'margin:0' }, 'Texto listo para acompañar la imagen del folleto. Sale de lo que cargaste (productos, precios, fechas y promo): si cambiás algo en el folleto, cambia acá. Podés retocarlo antes de copiarlo.'),
    filaDestino, filaTono, extras, area, estados,
    h('div', { class: 'row-actions' }, botonCopiar(() => area.value, 'Copiar el texto'), btnWA,
      h('button', { class: 'btn small ghost', type: 'button', onclick: () => { op.variante++; actualizar(); } }, '🔁 Otra forma de decirlo'), cuenta),
    h('p', { class: 'note' }, 'En redes, el QR del folleto no se puede escanear desde el mismo celular: por eso el link del canal va en el texto.'));
}

function mktPlan() {
  const st = lsJSON('rm.mkt.plan', {}), op = { cadaHoras: st.cadaHoras || 1, desde: st.desde ?? 10, hasta: st.hasta ?? 20, alcohol: alcoholActivo(S), mapa: true, hashtags: true };
  const clave = 'rm.plan.' + [S.titulo, S.vigencia.desde, S.vigencia.hasta].join('|');
  const hechos = new Set(lsJSON(clave, []));
  const lista = h('div', { class: 'stack' });
  const selHoras = h('select', { onchange: e => { op.cadaHoras = +e.target.value; lsGuardar('rm.mkt.plan', op); pintar(); } }, h('option', { value: '1' }, 'cada 1 hora'), h('option', { value: '2' }, 'cada 2 horas'));
  selHoras.value = String(op.cadaHoras);
  const selDesde = h('select', { onchange: e => { op.desde = +e.target.value; lsGuardar('rm.mkt.plan', op); pintar(); } }, ...[8, 9, 10, 11, 12].map(x => h('option', { value: String(x) }, HORA(x))));
  selDesde.value = String(op.desde);
  let plan = [];
  function pintar() {
    plan = armarPlan(S, op);
    lista.replaceChildren(...plan.map(d => h('div', { class: 'plan-dia' },
      h('h3', null, capitalizar(fechaLinda(d.dia))),
      ...d.items.map(it => {
        const chk = h('input', { type: 'checkbox', checked: hechos.has(it.id) || null, 'aria-label': 'Hecho', onchange: e => { e.target.checked ? hechos.add(it.id) : hechos.delete(it.id); lsGuardar(clave, [...hechos]); fila.classList.toggle('hecho', e.target.checked); } });
        const fila = h('div', { class: 'plan-item' + (hechos.has(it.id) ? ' hecho' : '') }, chk, h('b', { class: 'plan-hora' }, it.hora), h('span', { class: 'plan-canal', title: NOMBRE_CANAL[it.canal] }, ICONO_CANAL[it.canal]),
          h('span', { class: 'plan-que' }, h('small', null, NOMBRE_CANAL[it.canal]), it.que), botonCopiar(it.texto, 'Texto'));
        return fila;
      }))));
  }
  pintar();
  const V = S.vigencia, hasta = parseISO(V.hasta);
  const notaFechas = !V.desde && !V.hasta ? 'El folleto no tiene fechas: armé el plan desde hoy y por una semana. Cargalas en la barra de la promo (paso 3).'
    : !V.desde ? `El folleto no tiene fecha de inicio: armé el plan desde hoy hasta el ${fechaLinda(hasta)}. Cargala en la barra de la promo (paso 3).`
    : !V.hasta ? 'El folleto no tiene fecha de fin: armé el plan por una semana. Cargala en la barra de la promo (paso 3).' : '';
  return h('div', { class: 'stack' },
    h('p', { class: 'hint', style: 'margin:0' }, 'Qué publicar, dónde y a qué hora, día por día, con el texto listo para copiar. Andá tildando lo que ya hiciste. Los horarios son sugerencias: cambialos según cuándo compran tus clientes.'),
    notaFechas ? h('p', { class: 'demo-note', style: 'margin:0' }, notaFechas) : null,
    h('div', { class: 'row-actions' }, h('span', { class: 'lab' }, 'Estados de a un producto:'), selHoras, h('span', { class: 'lab' }, 'desde las'), selDesde,
      h('span', { class: 'sp' }), h('button', { class: 'btn small', type: 'button', onclick: () => {
        const ics = icsDelPlan(plan), nombre = `Plan de publicaciones - ${S.titulo || 'folleto'}.ics`;
        guardarArchivo(new Blob([ics], { type: 'text/calendar' }), nombre).then(r => { if (r === 'ok') aviso('Listo: abrí el archivo .ics en el celular (o mandátelo por WhatsApp) y se agregan los recordatorios al calendario.', 8000); });
      } }, '⏰ Recordatorios para el celular (.ics)')),
    lista);
}

function mktCalc() {
  const costos = lsJSON('rm.costos', {});
  const L = L_ACTUAL(), prods = S.productos.slice(0, L.slots).filter(p => !productoVacio(p) && parsePrecio(p.final));
  const clave = p => p.archivo || sinTildes(p.nombre || '');
  const inCosto = h('input', { type: 'text', inputmode: 'decimal', placeholder: 'ej. 15.000', autocomplete: 'off' });
  const inNormal = h('input', { type: 'text', inputmode: 'decimal', placeholder: 'ej. 20.600', autocomplete: 'off' });
  const inOferta = h('input', { type: 'text', inputmode: 'decimal', placeholder: 'ej. 18.540', autocomplete: 'off' });
  const inPct = h('input', { type: 'text', inputmode: 'decimal', placeholder: '10', maxlength: 5, autocomplete: 'off' });
  const res = h('div', { class: 'calc-res', 'aria-live': 'polite' });
  let elegido = null;
  const sel = h('select', { 'aria-label': 'Producto del folleto', onchange: e => {
    elegido = prods[+e.target.value] || null;
    if (elegido) {                                                 // sin «precio normal», el precio de hoy es el normal: se prueba con un %
      const conAntes = !!parsePrecio(elegido.regular);
      inNormal.value = conAntes ? elegido.regular : elegido.final || ''; inOferta.value = conAntes ? elegido.final || '' : ''; inPct.value = ''; inCosto.value = costos[clave(elegido)] || '';
    }
    calcular(); } }, h('option', { value: '' }, prods.length ? 'Elegí un producto del folleto (o escribí los precios)' : 'Escribí los precios'), ...prods.map((p, i) => h('option', { value: String(i) }, `${p.nombre} · $${p.final}`)));
  function calcular() {
    const c = numDe(inCosto.value), n = numDe(inNormal.value); let o = numDe(inOferta.value);
    const pv = parseFloat(String(inPct.value || '').replace(',', '.'));
    if (pv > 0 && pv < 100 && n) { o = conDescuento(n, pv); inOferta.value = precioATexto(o); }
    if (elegido && inCosto.value.trim()) { costos[clave(elegido)] = inCosto.value.trim(); lsGuardar('rm.costos', costos); }
    if (!c || !n) { res.replaceChildren(h('p', { class: 'hint', style: 'margin:0' }, 'Escribí cuánto te sale el producto (costo) y el precio normal. Si ponés el precio de oferta o el %, te digo si te conviene.')); return; }
    const r = calcOferta(c, n, o || n), filas = [];
    filas.push(h('li', { class: r.gN > 0 ? 'ok' : 'warn' }, h('span', { class: 'ic' }, r.gN > 0 ? '✓' : '!'), h('span', null, `Sin oferta ganás ${pesos(r.gN)} por unidad`, h('small', null, r.gN > 0 ? `De cada $100 que cobrás te quedan $${Math.round(r.mN * 100)} (le sumás ${pct1(r.markN)} al costo).` : 'El precio normal no cubre el costo.'))));
    if (o && o < n) {
      if (r.gO > 0) {
        filas.push(h('li', { class: 'ok' }, h('span', { class: 'ic' }, '✓'), h('span', null, `Con la oferta (${pct1(r.desc)} menos) ganás ${pesos(r.gO)} por unidad`, h('small', null, `De cada $100 te quedan $${Math.round(r.mO * 100)}.`))));
        const mas = Math.round((r.factor - 1) * 100), de10 = Math.ceil(10 * r.factor - 1e-9);
        filas.push(h('li', { class: 'info' }, h('span', { class: 'ic' }, 'i'), h('span', null, `Para ganar lo mismo que sin oferta, tenés que vender ${mas} % más`, h('small', null, `Por cada 10 que vendías, ${de10}. Si con la oferta esperás vender más que eso, te conviene; si no, pensala como inversión para traer gente.`))));
      } else filas.push(h('li', { class: 'warn' }, h('span', { class: 'ic' }, '!'), h('span', null, r.gO === 0 ? 'Con ese precio no ganás nada' : `Con ese precio perdés ${pesos(-r.gO)} por unidad`, h('small', null, 'Usalo solo como «producto gancho»: con pocas unidades, para que entre gente que compre otras cosas. Vender bajo costo está permitido mientras no sea para sacar del medio a la competencia (Dto. 274/2019).'))));
    }
    const tabla = [5, 10, 15, 20, 25].map(d => { const rr = calcOferta(c, n, n * (100 - d) / 100); return h('tr', null, h('td', null, `${d} %`), h('td', null, pesos(n * (100 - d) / 100)), h('td', null, rr.gO > 0 ? pesos(rr.gO) : '—'), h('td', null, rr.gO > 0 ? (rr.factor <= 1 ? 'igual' : `+${Math.round((rr.factor - 1) * 100)} %`) : 'perdés')); });
    res.replaceChildren(h('ul', { class: 'checks' }, ...filas),
      h('details', { class: 'more' }, h('summary', null, 'Ver cuánto más hay que vender con cada descuento'),
        h('div', { class: 'planilla-vista' }, h('table', null, h('thead', null, h('tr', null, h('th', null, 'Descuento'), h('th', null, 'Precio'), h('th', null, 'Ganás por unidad'), h('th', null, 'Hay que vender'))), h('tbody', null, ...tabla)))));
  }
  [inCosto, inNormal, inOferta].forEach(x => x.addEventListener('input', () => { if (x === inOferta) inPct.value = ''; calcular(); }));
  inPct.addEventListener('input', calcular);
  // precio de venta desde el costo
  const inC2 = h('input', { type: 'text', inputmode: 'decimal', placeholder: 'ej. 15.000', autocomplete: 'off' }), inM2 = h('input', { type: 'text', inputmode: 'decimal', placeholder: '35', maxlength: 5, autocomplete: 'off' });
  const res2 = h('div', { class: 'calc-res', 'aria-live': 'polite' });
  const calc2 = () => {
    const c = numDe(inC2.value), mk = parseFloat(String(inM2.value || '').replace(',', '.'));
    if (!c || !(mk > 0)) { res2.replaceChildren(h('p', { class: 'hint', style: 'margin:0' }, 'Escribí el costo y cuánto le querés sumar (por ejemplo 35 %).')); return; }
    const p = aCentavos(c * (1 + mk / 100)), margen = (p - c) / p;
    const redondos = [...new Set([Math.ceil(p / 100) * 100 - 10, Math.ceil(p / 100) * 100 - 1, Math.ceil(p / 100) * 100, Math.ceil(p / 1000) * 1000 - 10].filter(x => x >= p))].sort((a, b) => a - b).slice(0, 3);
    llenar(res2, h('p', { class: 'confirm-texto', style: 'margin:0' }, 'Precio de venta: ', h('b', null, '$' + precioATexto(p))),
      h('p', { class: 'hint', style: 'margin:0' }, `Le sumás ${mk} % al costo, pero de lo que cobrás te queda el ${pct1(margen)} (de cada $100, $${Math.round(margen * 100)}). No es lo mismo: por eso conviene mirar los dos números.`),
      redondos.length ? h('p', { class: 'hint', style: 'margin:0' }, 'Si preferís un precio redondo, los más cercanos para arriba: ' + redondos.map(x => '$' + precioATexto(x)).join(' · ') + ' (el programa nunca redondea solo).') : null);
  };
  [inC2, inM2].forEach(x => x.addEventListener('input', calc2));
  calcular(); calc2();
  return h('div', { class: 'stack' },
    h('div', { class: 'caja-aparte stack' }, h('p', { class: 'lab', style: 'margin:0' }, '¿Me conviene esta oferta?'),
      sel, h('div', { class: 'grid2' }, campo('Costo (lo que te sale)', inCosto), campo('Precio normal', inNormal)),
      h('div', { class: 'grid2' }, campo('Precio de oferta', inOferta), campo('o % de descuento', h('span', { class: 'pct' }, inPct))), res,
      h('p', { class: 'note' }, 'Usá el costo final que pagás (con impuestos). El costo queda guardado solo en esta computadora: no se sube a la nube ni sale en ningún lado.')),
    h('div', { class: 'caja-aparte stack' }, h('p', { class: 'lab', style: 'margin:0' }, 'Precio de venta desde el costo'),
      h('div', { class: 'grid2' }, campo('Costo', inC2), campo('% que le sumás', h('span', { class: 'pct' }, inM2))), res2));
}

function mktCombo() {
  const L = L_ACTUAL(), prods = S.productos.slice(0, L.slots).map((p, i) => ({ p, i })).filter(x => !productoVacio(x.p) && parsePrecio(x.p.final) && !/^combo\b/i.test(x.p.nombre || ''));
  const elegidos = new Map();
  const inNombre = h('input', { type: 'text', placeholder: 'Ej.: Combo Torta de mamá', maxlength: 40, autocomplete: 'off' });
  const inPrecio = h('input', { type: 'text', inputmode: 'decimal', placeholder: 'precio del combo', autocomplete: 'off' });
  const inPct = h('input', { type: 'text', inputmode: 'decimal', placeholder: '15', maxlength: 5, autocomplete: 'off' });
  const res = h('div', { class: 'calc-res', 'aria-live': 'polite' });
  const suma = () => [...elegidos.entries()].reduce((t, [i, n]) => t + parsePrecio(S.productos[i].final).num * n, 0);
  const calcular = () => {
    const tot = aCentavos(suma()), pv = parseFloat(String(inPct.value || '').replace(',', '.'));
    if (pv > 0 && pv < 100 && tot) inPrecio.value = precioATexto(conDescuento(tot, pv));
    const pc = numDe(inPrecio.value);
    if (!elegidos.size) { res.replaceChildren(h('p', { class: 'hint', style: 'margin:0' }, 'Tildá los productos que van en el combo (y cuántos de cada uno).')); btn.disabled = true; return; }
    const ah = tot - pc;
    llenar(res, h('p', { class: 'confirm-texto', style: 'margin:0' }, `Por separado: ${pesos(tot)}`, pc ? ` · Combo: ` : '', pc ? h('b', null, pesos(pc)) : '', pc && ah > 0 ? ` · el cliente ahorra ${pesos(ah)} (${pctReal(tot, pc)} %)` : ''),
      pc && ah <= 0 ? h('p', { class: 'hint', style: 'margin:0' }, 'El precio del combo tiene que ser menor que la suma de los productos.') : null);
    btn.disabled = !(pc > 0 && ah > 0);
  };
  const filas = prods.map(({ p, i }) => {
    const cant = h('input', { type: 'number', min: '1', max: '9', value: '1', class: 'cant', 'aria-label': 'Cantidad de ' + p.nombre, oninput: () => { if (elegidos.has(i)) { elegidos.set(i, Math.max(1, Math.min(9, +cant.value || 1))); calcular(); } } });
    return h('label', { class: 'combo-fila' }, h('input', { type: 'checkbox', onchange: e => { if (e.target.checked) elegidos.set(i, Math.max(1, +cant.value || 1)); else elegidos.delete(i); if (!inNombre.value && elegidos.size) inNombre.placeholder = 'Ej.: Combo ' + (S.titulo || 'de la semana'); calcular(); } }),
      h('span', null, p.nombre, h('small', null, ' $' + p.final + (p.unidad ? ' ' + p.unidad : ''))), cant);
  });
  inPrecio.addEventListener('input', () => { inPct.value = ''; calcular(); });
  inPct.addEventListener('input', calcular);
  const btn = h('button', { class: 'btn primary', type: 'button', disabled: true, onclick: async () => {
    const k = primerLibre('producto');
    if (k < 0) { aviso('No hay casilleros libres en este folleto: quitá un producto o elegí un formato con más ofertas.'); return; }
    const items = [...elegidos.entries()], tot = aCentavos(suma()), pc = numDe(inPrecio.value);
    const nombre = inNombre.value.trim() || 'Combo ' + (S.titulo || 'de la semana');
    const desc = items.map(([i, n]) => (n > 1 ? n + ' × ' : '') + S.productos[i].nombre).join(' + ');
    const img = imagenCombo(items.map(([i]) => S.productos[i]));
    Object.assign(S.productos[k], nuevoProducto({ id: S.productos[k].id, nombre: nombre.slice(0, 60), desc: desc.slice(0, 90), regular: precioATexto(tot), final: precioATexto(pc), etiqueta: 'COMBO', combo: true, img, alfa: !!img, imgV: (S.productos[k].imgV || 0) + 1 }));
    construirListaCasilleros('producto', k); cambio();
    aviso(`Listo: «${nombre}» quedó en el casillero ${k + 1}. Revisalo en la vista previa.`, 6000);
  } }, 'Agregar el combo al folleto');
  calcular();
  return h('div', { class: 'stack' },
    h('p', { class: 'hint', style: 'margin:0' }, 'Un combo sube lo que gasta cada cliente: por ejemplo «Torta de mamá» (harina, manteca, crema, cobertura), «Picada» (salame, queso, pan) o «Asado» (carne, chorizo, carbón). Elegí productos del folleto, poné el precio del combo y lo agrego como un producto más, con las fotos juntas.'),
    prods.length ? h('div', { class: 'combo-lista' }, ...filas) : h('p', { class: 'demo-note', style: 'margin:0' }, 'Primero cargá en el folleto los productos (con precio) que van en el combo.'),
    h('div', { class: 'grid2' }, campo('Nombre del combo', inNombre), campo('Precio del combo', inPrecio)),
    h('div', { class: 'grid2' }, campo('o % de descuento sobre la suma', h('span', { class: 'pct' }, inPct)), h('span')), res,
    h('div', { class: 'row-actions' }, btn));
}
/** Junta las fotos de los productos del combo en una sola imagen (sin fondo). */
function imagenCombo(ps) {
  const imgs = ps.map(p => getImg(p)).filter(Boolean).slice(0, 4);
  if (!imgs.length) return null;
  const H = 660, W = 880, c = document.createElement('canvas'); c.width = W; c.height = H;   // alcanza para el cuadro más grande; WebP pesa ~10 veces menos que PNG
  const ctx = c.getContext('2d'), n = imgs.length, paso = W / (n + 0.6), alto = H * (n > 2 ? 0.78 : 0.9);
  imgs.forEach((im, i) => {
    const w0 = im.width || im.naturalWidth, h0 = im.height || im.naturalHeight, k = Math.min(alto / h0, (paso * 1.5) / w0), w = w0 * k, hh = h0 * k;
    const cx = paso * (i + 0.8), y = H - hh - (i % 2 ? 0 : H * 0.05);
    ctx.drawImage(im, cx - w / 2, y, w, hh);
  });
  const webp = c.toDataURL('image/webp', 0.86);
  return webp.startsWith('data:image/webp') ? webp : c.toDataURL('image/png');
}

function mktFechas() {
  const evs = proximosEventos(150);
  const L = L_ACTUAL();
  return h('div', { class: 'stack' },
    h('p', { class: 'hint', style: 'margin:0' }, 'Las fechas que vienen, cuándo conviene empezar a publicar y qué ofrecer. «Usar esta fecha» pone el fondo y la vigencia en el folleto.'),
    h('div', { class: 'proximas' }, h('b', null, '🔁 Todos los meses'),
      h('span', null, 'Los primeros días de cada mes se cobran sueldos y jubilaciones: buen momento para ofertas de almacén (yerba, aceite, harina, fideos, arroz). Los viernes y sábados: picadas, bebidas y asado.')),
    ...evs.map(e => {
      const empezar = e.desde <= hoy0() ? '¡ya!' : fechaLinda(e.desde);
      return h('div', { class: 'evento' },
        h('div', { class: 'evento-cab' }, h('b', null, e.nombre), h('span', null, `${capitalizar(fechaLinda(e.fecha))} · ${e.falta === 0 ? '¡es hoy!' : e.falta === 1 ? 'mañana' : `faltan ${e.falta} días`}`)),
        h('small', { class: 'hint' }, `Empezá a publicar: ${empezar}`),
        h('ul', { class: 'evento-ideas' }, ...e.ideas.map(t => h('li', null, t))),
        h('div', { class: 'row-actions' },
          h('button', { class: 'btn small' + (S.tema === e.tema && S.vigencia.hasta === isoDe(e.fecha) ? ' on' : ''), type: 'button', onclick: () => usarEvento(e) }, e.tema && THEMES[e.tema] && L.temas.includes(THEMES[e.tema].grupo) ? `Usar esta fecha (fondo «${THEMES[e.tema].nombre}»)` : 'Usar esta fecha')));
    }));
}

/** Tarjeta de sellos (85 × 55 mm, 10 por hoja A4): «juntá N sellos y llevate…». Hace volver al cliente; no es un sorteo. */
const SELLOS_NORMAL = { cantidad: 10, premio: 'un producto de regalo', minimo: '', vence: '' };
function dibujarTarjetaSellos(ctx, x, y, w, h, cfg, C) {
  const k = w / 1004, n = clamp(+cfg.cantidad || 10, 4, 12), premio = String(cfg.premio || SELLOS_NORMAL.premio).trim(), bh = 190 * k;
  ctx.save(); ctx.translate(x, y);
  rrPath(ctx, 0, 0, w, h, 34 * k); ctx.fillStyle = '#FFFFFF'; ctx.fill();
  ctx.save(); rrPath(ctx, 0, 0, w, h, 34 * k); ctx.clip(); ctx.fillStyle = vGrad(ctx, 0, bh, ['#FF8A2A', '#E5501A']); ctx.fillRect(0, 0, w, bh); ctx.restore();
  rrPath(ctx, 0, 0, w, h, 34 * k); ctx.lineWidth = 6 * k; ctx.strokeStyle = '#E5501A'; ctx.stroke();
  const L = RES.logoH; let lw = 0;
  if (L) { lw = 330 * k; const lh = lw * (L.naturalHeight || L.height) / (L.naturalWidth || L.width); ctx.drawImage(L, 34 * k, (bh - lh) / 2, lw, lh); }
  const tit = 'TARJETA DE SELLOS', ft = fitSize(ctx, tit, s => FB(900, s), 76 * k, 30 * k, w - lw - 110 * k, 0.5);
  text(ctx, tit, w - 34 * k, bh / 2 + ft * 0.36, { font: FB(900, ft), fill: '#FFFFFF', align: 'right', tracking: 1, shadow: ['rgba(90,25,0,.35)', 2, 0, 3] });
  const frase = `Juntá ${n} sellos y llevate ${premio}`, ff = fitSize(ctx, frase, s => FB(900, s), 58 * k, 26 * k, w - 68 * k, 0.3);
  text(ctx, frase, w / 2, bh + 76 * k, { font: FB(900, ff), fill: '#2A160C', align: 'center', tracking: 0.3 });
  const cols = Math.ceil(n / 2), gap = 16 * k, top = bh + 104 * k, r = Math.min(((w - 68 * k) - gap * (cols - 1)) / cols / 2, 62 * k), fila = r * 2 + 18 * k;
  const x0 = (w - (cols * r * 2 + gap * (cols - 1))) / 2;
  for (let i = 0; i < n; i++) {
    const c = i % cols, f = Math.floor(i / cols), cx = x0 + r + c * (r * 2 + gap), cy = top + r + f * fila, ultimo = i === n - 1;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.fillStyle = ultimo ? '#FFF1C7' : '#FFF7F0'; ctx.fill();
    ctx.save(); ctx.setLineDash([9 * k, 7 * k]); ctx.lineWidth = 4 * k; ctx.strokeStyle = ultimo ? '#E5501A' : '#D9B8A3'; ctx.stroke(); ctx.restore();
    text(ctx, ultimo ? 'PREMIO' : String(i + 1), cx, cy + (ultimo ? 10 : 18) * k, { font: FB(900, (ultimo ? 26 : 50) * k), fill: ultimo ? '#E5501A' : '#E3C9B8', align: 'center' });
  }
  const minimo = parsePrecio(cfg.minimo), vence = parseISO(cfg.vence);
  const letra = [minimo ? `1 sello por compra de ${txtPrecio(minimo)} o más.` : '1 sello por compra.', vence ? `Válida hasta el ${vence.getDate()}/${vence.getMonth() + 1}/${vence.getFullYear()}.` : '', 'No canjeable por dinero.'].filter(Boolean).join(' ');
  const pie = [String(C.direccion || '').trim(), waNumero(C.whatsapp) ? 'WhatsApp ' + String(C.whatsapp).trim() : String(C.telefono || '').trim()].filter(Boolean).join(' · ');
  text(ctx, 'Nombre: ________________________', 34 * k, h - 74 * k, { font: FM(700, 24 * k), fill: '#6B4A38' });
  text(ctx, letra, 34 * k, h - 42 * k, { font: FM(600, 19 * k), fill: '#6B4A38', maxW: w - 68 * k });
  if (pie) text(ctx, pie, 34 * k, h - 16 * k, { font: FM(700, 19 * k), fill: '#2A160C', maxW: w - 68 * k });
  ctx.restore();
}
/** Hoja A4 a 300 dpi con 10 tarjetas (2 × 5) y líneas de corte. */
function hojaSellos(cfg, C) {
  const W = 2480, H = 3508, cw = 1004, ch = 650, gx = 40, gy = 36, c = document.createElement('canvas'); c.width = W; c.height = H;
  const ctx = c.getContext('2d'), scBak = SC; setSC(1);
  try {
    ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, W, H);
    const x0 = (W - (cw * 2 + gx)) / 2, y0 = (H - (ch * 5 + gy * 4)) / 2;
    for (let i = 0; i < 10; i++) dibujarTarjetaSellos(ctx, x0 + (i % 2) * (cw + gx), y0 + Math.floor(i / 2) * (ch + gy), cw, ch, cfg, C);
  } finally { setSC(scBak); }
  return c;
}
function mktSellos() {
  const cfg = S.sellos = { ...SELLOS_NORMAL, ...(S.sellos || {}) };
  const prev = h('canvas', { class: 'sellos-prev', 'aria-label': 'Vista previa de la tarjeta de sellos' });
  const pintar = () => { const esc = 0.5, ctx = prev.getContext('2d'); prev.width = 1004 * esc; prev.height = 650 * esc; ctx.setTransform(esc, 0, 0, esc, 0, 0); const b = SC; setSC(esc); try { dibujarTarjetaSellos(ctx, 0, 0, 1004, 650, cfg, S.comercio || {}); } finally { setSC(b); } };
  const upd = () => { pintar(); guardarAuto(); };
  const selN = h('select', { id: 'sellos-n', onchange: e => { cfg.cantidad = +e.target.value; upd(); } }, ...[6, 8, 10, 12].map(n => h('option', { value: String(n) }, n + ' sellos')));
  selN.value = String(cfg.cantidad);
  const inPremio = texto(cfg, 'premio', { ph: SELLOS_NORMAL.premio, max: 40, after: upd });
  const bajar = async tipo => {
    const c = hojaSellos(cfg, S.comercio || {}), nombre = 'Rivero Market - Tarjetas de sellos';
    const blob = tipo === 'pdf' ? crearPDFPaginas([{ jpeg: new Uint8Array(await (await aBlob(c, 'image/jpeg', 0.93)).arrayBuffer()), w: c.width, h: c.height }], 595.28, 841.89) : await aBlob(c, 'image/png');
    const r = await guardarArchivo(blob, nombre + (tipo === 'pdf' ? '.pdf' : '.png'));
    aviso(r === 'ok' ? 'Listo: hoja A4 con 10 tarjetas. Imprimila en papel grueso (o cartulina) y cortala por las líneas.' : 'No se pudo guardar (' + r + ').', 6500);
  };
  setTimeout(pintar, 0);
  return h('div', { class: 'stack' },
    h('p', { class: 'hint', style: 'margin:0' }, 'Una tarjeta que el cliente guarda en la billetera: con cada compra le ponés un sello y, al completarla, se lleva el premio. Hace volver a la gente (y no es un sorteo: no depende de la suerte).'),
    h('div', { class: 'grid2' }, campo('Cantidad de sellos', selN), campo('Compra mínima por sello', texto(cfg, 'minimo', { ph: 'opcional · ej. 5.000', mode: 'decimal', max: 12, after: upd }), 'opcional')),
    campo('Premio', inPremio, 'qué se lleva al completarla'), chipsRapidos(['un producto de regalo', '10% de descuento en tu compra', '¼ kg de queso de regalo', 'una gaseosa de 2,25 L'], inPremio, cfg, 'premio'),
    campo('Vence', h('input', { type: 'date', value: cfg.vence || '', onchange: e => { cfg.vence = e.target.value; upd(); } }), 'opcional'),
    h('div', { class: 'sellos-marco' }, prev),
    h('div', { class: 'row-actions' }, h('button', { class: 'btn primary', type: 'button', onclick: () => bajar('pdf') }, '⬇ PDF para imprimir (A4, 10 tarjetas)'), h('button', { class: 'btn', type: 'button', onclick: () => bajar('png') }, '⬇ Imagen')),
    h('p', { class: 'note' }, 'Tamaño de tarjeta personal (85 × 55 mm). Conviene imprimirla en cartulina y tener un sello de goma o una birome de color para marcarla.'));
}

function mktIdeas() {
  const hechos = new Set(lsJSON('rm.guia.hecho', []));
  const total = GUIA.reduce((t, [, xs]) => t + xs.length, 0);
  const cuenta = h('b', null);
  const pintarCuenta = () => { cuenta.textContent = `${hechos.size} de ${total} ya los hacés`; };
  pintarCuenta();
  return h('div', { class: 'stack' },
    h('p', { class: 'hint', style: 'margin:0' }, 'Ideas probadas para comercios de barrio. Tildá las que ya hacés: lo que queda sin tildar es lo próximo para probar. ', cuenta),
    ...GUIA.map(([grupo, xs]) => h('div', { class: 'guia-grupo' }, h('h3', null, grupo),
      ...xs.map(([id, t, d]) => h('label', { class: 'chk guia' + (hechos.has(id) ? ' hecho' : '') }, h('input', { type: 'checkbox', checked: hechos.has(id) || null, onchange: e => {
        e.target.checked ? hechos.add(id) : hechos.delete(id); lsGuardar('rm.guia.hecho', [...hechos]); e.target.closest('label').classList.toggle('hecho', e.target.checked); pintarCuenta();
      } }), h('span', null, t, h('small', null, d)))))));
}

/** Sección del panel: accesos a las herramientas de marketing y la próxima fecha. */
function seccionMarketing() {
  const prox = proximosEventos(60)[0];
  const b = (k, t, d) => h('button', { class: 'mkt-acceso', type: 'button', onclick: () => abrirMarketing(k) }, h('b', null, t), h('small', null, d));
  return seccion('Para vender más', 'marketing',
    h('div', { class: 'mkt-accesos' },
      b('textos', '📣 Textos para publicar', 'WhatsApp, Estados y Facebook, listos para copiar'),
      b('plan', '🗓 Plan de la semana', 'qué publicar y a qué hora'),
      b('calc', '🧮 ¿Me conviene?', 'cuánto ganás con la oferta'),
      b('combo', '🎁 Armar un combo', 'varios productos, un precio'),
      b('fechas', '📅 Fechas que vienen', 'con ideas de productos'),
      b('ideas', '💡 Ideas para vender más', 'Google, WhatsApp, local')),
    prox ? h('p', { class: 'hint', style: 'margin:10px 0 0' }, `Próxima fecha: `, h('b', null, prox.nombre), ` (${prox.falta === 0 ? 'hoy' : prox.falta === 1 ? 'mañana' : 'faltan ' + prox.falta + ' días'}). `,
      h('button', { class: 'btn small ghost', type: 'button', onclick: () => abrirMarketing('fechas') }, 'Ver ideas')) : null);
}
