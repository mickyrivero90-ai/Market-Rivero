// ───────────────────────── motor del folleto ─────────────────────────
const RES = { logoH: null, logoV: null, insignia: null };       // imágenes de marca (las carga la app)
let HITS = [], LAST_HITS = [];                                   // casilleros del folleto (para elegir producto con un clic en la vista previa)
/** Registra un casillero clickeable y, solo en pantalla, dibuja su número y marca el que está activo. */
function casillero(ctx, env, tipo, i, r) {
  HITS.push({ tipo, i, x: r.x, y: r.y, w: r.w, h: r.h });
  if (!env || !env.preview) return;
  const act = env.activo && env.activo.tipo === tipo && env.activo.i === i;
  ctx.save();
  if (act) {
    rrPath(ctx, r.x - 5, r.y - 5, r.w + 10, r.h + 10, 30); ctx.lineWidth = 6; ctx.strokeStyle = '#FFE600';
    shadow(ctx, 'rgba(255,230,0,.95)', 16); ctx.stroke(); noShadow(ctx);
  }
  const cx = r.x + r.w - 26, cy = r.y + 26, R = 17;
  ctx.fillStyle = act ? '#FFE600' : 'rgba(20,10,5,.78)'; ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.fill();
  ctx.lineWidth = 2.5; ctx.strokeStyle = act ? '#3A1204' : 'rgba(255,255,255,.9)'; ctx.stroke();
  text(ctx, String(i + 1), cx, cy + 6.5, { font: FB(900, 21, false), fill: act ? '#3A1204' : '#fff', align: 'center' });
  ctx.restore();
}

// ── temas de color ──
const _base = {
  accent: ['#FFE066', '#FFC400'], accentInk: '#4A1500', accentDeep: '#B3081D', sello: ['#F0213A', '#C10F23'],
  price: ['#EE2238', '#B80B1E'], priceInk: '#FFFFFF', priceShadow: 'rgba(90,0,12,.55)',
  ink: '#2B1208', soft: '#7B5A48', card: '#FFFFFF', glow: 'rgba(255,196,0,.62)', cardShadow: 'rgba(60,20,0,.40)',
  hero: ['#FFEE9A', '#FFC81A'], heroRay: 'rgba(255,255,255,.50)', heroInk: '#3A1204', heroSoft: '#7A4A1A',
  ray0: 'rgba(255,255,255,.20)', ray1: 'rgba(255,255,255,0)', dots: 'rgba(255,255,255,.11)',
  footerInk: '#FFF6E5', footerSoft: 'rgba(255,246,229,.74)', stripe: 'rgba(255,255,255,.035)',
};
const THEMES = {
  naranja: { ..._base, nombre: 'Naranja', swatch: '#E64F12', bg: ['#FF7C22', '#EA5513', '#C53B06'], footer: '#3A1204',
    ribbon: ['#F0213A', '#C10F23'], ribbonTail: '#8E0A19', ribbonFold: '#5E0511', ribbonInk: '#FFFFFF', ribbonStroke: '#7A0716' },
  rojo: { ..._base, nombre: 'Rojo', swatch: '#D3121F', bg: ['#EE2A36', '#C90F1E', '#9A091A'], footer: '#2D0A0E',
    ribbon: ['#3A1A0E', '#1E0B05'], ribbonTail: '#0C0402', ribbonFold: '#000000', ribbonInk: '#FFD84A', ribbonStroke: '#120502' },
  verde: { ..._base, nombre: 'Verde', swatch: '#1F9E49', bg: ['#3CC866', '#209F4A', '#12703A'], footer: '#0B2E1B',
    ribbon: ['#FFE066', '#FFC400'], ribbonTail: '#C99700', ribbonFold: '#8F6A00', ribbonInk: '#B3081D', ribbonStroke: '#FFFFFF' },
  azul: { ..._base, nombre: 'Azul', swatch: '#1E63E6', bg: ['#4A91FF', '#1F66E8', '#1248B4'], footer: '#0A1C4A',
    ribbon: ['#F0213A', '#C10F23'], ribbonTail: '#8E0A19', ribbonFold: '#5E0511', ribbonInk: '#FFFFFF', ribbonStroke: '#7A0716' },
};

// ── datos derivados de un producto ──
function infoProducto(p) {
  const F = parsePrecio(p.final), R = parsePrecio(p.regular);
  const pct = F && R ? pctReal(R.num, F.num) : 0;                 // hacia abajo: nunca se anuncia más descuento que el real
  if (R && p.combo) R.separado = true;                            // combo: el precio tachado es la suma de los productos, no un «antes»
  return { F, R, pct, ahorro: pct ? R.num - F.num : 0 };
}
const productoVacio = p => !p || (!String(p.nombre || '').trim() && !String(p.final || '').trim() && !p.img && !p.archivo);

/** Sticker de urgencia («¡Último día!», «¡Quedan pocas!», «Solo hoy»): ocupa el lugar del sello o va al lado del logo. */
const URGENCIAS = { ultimo: ['¡HOY ES EL', 'ÚLTIMO', 'DÍA!'], pocas: ['¡QUEDAN', 'POCAS', 'UNIDADES!'], hoy: ['SOLO', 'HOY', ''] };
function urgenciaTexto(S) {
  const u = URGENCIAS[S && S.urgencia]; if (!u) return null;
  const d = new Date(), l3 = S.urgencia === 'hoy' ? DIAS[d.getDay()].slice(0, 3).toUpperCase() + ' ' + d.getDate() + '/' + (d.getMonth() + 1) : u[2];
  return { l1: u[0], l2: u[1], l3, urgente: true };
}
function stickerUrgencia(ctx, S, T, cx, cy, R) { const u = urgenciaTexto(S); if (u) drawSello(ctx, cx, cy, R, u, T, 0.12); }
/** Texto del sello del encabezado según el modo elegido. */
function selloTexto(S) {
  const U = urgenciaTexto(S); if (U) return U;
  const m = S.sello || { modo: 'auto' };
  if (m.modo === 'none') return null;
  if (m.modo === 'custom') return (m.l1 || m.l2 || m.l3) ? { l1: (m.l1 || '').toUpperCase(), l2: (m.l2 || '').toUpperCase(), l3: (m.l3 || '').toUpperCase() } : null;
  const P = typeof promoInfo === 'function' ? promoInfo(S) : null;
  if (P && P.pct) return { l1: P.selloL1, l2: (P.extra ? '+' : '') + P.pctTxt + '%', l3: 'OFF' };
  if (P && P.cuotas) return { l1: P.selloL1, l2: P.cuotas + ' CUOTAS', l3: 'SIN INTERÉS' };
  if (P && P.tipo === 'efectivo') return { l1: 'SOLO EN', l2: 'EFECTIVO', l3: '' };
  if (P && P.tipo !== 'texto') return { l1: 'PAGÁ CON', l2: P.corto, l3: '' };
  const prods = (S.productos || []).slice(0, (LAYOUTS[S.formato] || LAYOUTS.a4_8).slots).filter(p => !productoVacio(p));
  const pcts = prods.map(p => infoProducto(p).pct).filter(v => v > 0);
  if (!pcts.length) return { l1: '¡SUPER', l2: 'OFERTAS!', l3: '' };
  const mx = Math.max(...pcts), mn = Math.min(...pcts);
  if (pcts.length === prods.length && mx === mn && mx >= 5) return { l1: 'TODOS CON', l2: mx + '%', l3: 'OFF' };
  if (mx >= 15) return { l1: 'HASTA', l2: mx + '%', l3: 'OFF' };
  return { l1: '¡SUPER', l2: 'OFERTAS!', l3: '' };
}

// ───────── fondo ─────────
function drawBackground(ctx, W, H, T, rayCx = 0.5, rayCy = 0.1, hh = H * 0.27) {
  if (T.bgFn) T.bgFn(ctx, W, H, T, hh);
  else {
    ctx.fillStyle = vGrad(ctx, 0, H, [T.bg[0], T.bg[1], T.bg[2]]); ctx.fillRect(0, 0, W, H);
    const cx = W * rayCx, cy = H * rayCy, R = Math.hypot(W, H) * 1.1;
    const rg = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 0.75); rg.addColorStop(0, T.ray0); rg.addColorStop(1, T.ray1);
    ctx.fillStyle = rg; raysPath(ctx, cx, cy, R, 40, 0.1); ctx.fill();
    halftone(ctx, W, H, T.dots, 0, H, H * 0.34, 26);
    halftone(ctx, W, H, T.dots, W, H * 0.30, H * 0.26, 26);
  }
  ADORNO_PEND = T.decor ? { W, H, hh, T } : null;                 // los adornos se dibujan con adornos(), cuando ya se sabe dónde va el logo
}
/** Adornos del tema, detrás de todo pero sin pasar por detrás del logo (antes una moneda o un corazón hacía leer «RIVÉRO»). */
let ADORNO_PEND = null;
function adornos(ctx, zonas = []) {
  const A = ADORNO_PEND; ADORNO_PEND = null; if (!A) return;
  ZONAS_LIBRES = zonas.filter(Boolean);
  try { ctx.save(); A.T.decor(ctx, A.W, A.H, A.hh, A.T); ctx.restore(); noShadow(ctx); } finally { ZONAS_LIBRES = []; }
}
/** Lugar que ocupa el logo dibujado en (x, y) con ancho lw, con un margen alrededor. */
function zonaLogo(x, y, lw) {
  const L = RES.logoH; if (!L) return null;
  const lh = lw * (L.naturalHeight || L.height) / (L.naturalWidth || L.width), m = lh * 0.12;
  return { x: x - m, y: y - m * 1.8, w: lw + m * 2, h: lh + m * 2.8 };
}

// ───────── cinta con el título ─────────
function drawRibbon(ctx, x, y, w, h, str, T, o = {}) {
  const fold = h * 0.34, drop = h * 0.2, tail = T.ribbonTail;
  ctx.save();
  ctx.fillStyle = tail;
  ctx.beginPath(); ctx.moveTo(x, y + drop); ctx.lineTo(x + fold + 10, y + drop); ctx.lineTo(x + fold + 10, y + h + drop); ctx.lineTo(x, y + h + drop); ctx.lineTo(x + fold * 0.42, y + h / 2 + drop); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(x + w, y + drop); ctx.lineTo(x + w - fold - 10, y + drop); ctx.lineTo(x + w - fold - 10, y + h + drop); ctx.lineTo(x + w, y + h + drop); ctx.lineTo(x + w - fold * 0.42, y + h / 2 + drop); ctx.closePath(); ctx.fill();
  ctx.fillStyle = T.ribbonFold;
  ctx.beginPath(); ctx.moveTo(x + fold, y + h); ctx.lineTo(x + fold, y + h + drop); ctx.lineTo(x + fold + drop, y + h); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(x + w - fold, y + h); ctx.lineTo(x + w - fold, y + h + drop); ctx.lineTo(x + w - fold - drop, y + h); ctx.closePath(); ctx.fill();
  shadow(ctx, 'rgba(50,8,0,.42)', 20, 0, 10);
  ctx.fillStyle = vGrad(ctx, y, y + h, T.ribbon); ctx.fillRect(x + fold, y, w - fold * 2, h); noShadow(ctx);
  ctx.fillStyle = 'rgba(255,255,255,.15)'; ctx.fillRect(x + fold, y, w - fold * 2, h * 0.36);
  ctx.fillStyle = 'rgba(0,0,0,.16)'; ctx.fillRect(x + fold, y + h - 5, w - fold * 2, 5);
  const t = String(str || '').toUpperCase(), bw = w - fold * 2 - 70;
  const size = fitSize(ctx, t, s => FB(900, s), o.max || h * 0.95, 18, bw, 1.5);
  text(ctx, t, x + w / 2, y + h / 2 + size * 0.35, { font: FB(900, size), fill: T.ribbonInk, align: 'center', stroke: T.ribbonStroke, strokeW: Math.max(2, size * 0.045), tracking: 1.5, shadow: ['rgba(0,0,0,.30)', 4, 0, 4] });
  ctx.restore();
  return { bottom: y + h + drop };
}

// ───────── sello (estrella de descuento) ─────────
function drawSello(ctx, cx, cy, R, st, T, rot = -0.13) {
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(rot);
  shadow(ctx, 'rgba(70,15,0,.5)', 22, 0, 12);
  const urg = !!st.urgente, tinta = urg ? '#FFFFFF' : T.accentInk, tinta3 = urg ? '#FFE066' : T.accentDeep;   // urgente: rojo con letras blancas y amarillas
  burstPath(ctx, 0, 0, R, R * 0.87, 22); ctx.fillStyle = vGrad(ctx, -R, R, urg ? ['#FF3B4E', '#C8102E'] : T.accent); ctx.fill(); noShadow(ctx);
  burstPath(ctx, 0, 0, R * 0.935, R * 0.81, 22); ctx.lineWidth = R * 0.022; ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.stroke();
  // tres renglones que nunca se pisan: arriba (chico), el grande en el medio, abajo (mediano)
  const l1 = String(st.l1 || ''), l2 = String(st.l2 || ''), l3 = String(st.l3 || ''), mk = s => FB(900, s);
  const f1 = l1 ? fitSize(ctx, l1, s => FM(900, s), R * 0.2, 8, R * 1.3, R * 0.012) : 0;
  const f3 = l3 ? fitSize(ctx, l3, mk, R * 0.3, 8, R * 1.25, R * 0.02) : 0;
  const top = l1 ? -R * 0.62 + f1 * 0.72 + R * 0.09 : -R * 0.6;          // debajo del renglón de arriba, con aire
  const bot = l3 ? R * 0.7 - f3 * 0.72 - R * 0.08 : R * 0.6;              // arriba del renglón de abajo, con aire
  if (l1) text(ctx, l1, 0, -R * 0.62 + f1 * 0.72, { font: FM(900, f1), fill: tinta, align: 'center', tracking: R * 0.012 });
  if (l2) {
    const alto = bot - top, sz = Math.min(fitSize(ctx, l2, mk, R, 12, R * 1.36, 0), alto / 0.76);
    text(ctx, l2, 0, top + (alto + sz * 0.72) / 2, { font: FB(900, sz), gradient: urg ? ['#FFF6A8', '#FFD400'] : T.sello, gh: sz * 0.75, align: 'center', stroke: urg ? '#7A0010' : '#FFFFFF', strokeW: sz * 0.05, shadow: ['rgba(120,0,10,.35)', 3, 0, 3], maxW: R * 1.4 });
  }
  if (l3) text(ctx, l3, 0, R * 0.7, { font: FB(900, f3), fill: tinta3, align: 'center', tracking: R * 0.02, maxW: R * 1.3 });
  ctx.restore();
}

// ───────── píldora de fechas ─────────
function drawDatePill(ctx, cx, y, h, str, T) {
  if (!str) return;
  ctx.save();
  const fs = h * 0.45, trk = h * 0.045, ic = h * 0.5, padX = h * 0.5, gap = h * 0.26;
  ctx.font = FM(800, fs);
  const tw = measure(ctx, str, trk), w = padX * 2 + ic + gap + tw, x = cx - w / 2;
  shadow(ctx, 'rgba(60,15,0,.40)', 12, 0, 6);
  rrPath(ctx, x, y, w, h, h / 2); ctx.fillStyle = vGrad(ctx, y, y + h, T.accent); ctx.fill(); noShadow(ctx);
  rrPath(ctx, x + 3, y + 3, w - 6, h - 6, h / 2 - 3); ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 1.5; ctx.stroke();
  iconCalendar(ctx, x + padX, y + (h - ic) / 2, ic, T.accentInk, T.accent[0]);
  text(ctx, str, x + padX + ic + gap, y + h / 2 + fs * 0.35, { font: FM(800, fs), fill: T.accentInk, tracking: trk });
  ctx.restore();
}

// ───────── arte del producto (foto + brillo + sombra de piso) ─────────
function drawProductArt(ctx, p, z, T, env, o = {}) {
  const k = o.k || 1, img = env.getImg(p), cx = z.x + z.w / 2;
  if (o.glow !== false) {
    const gy = z.y + z.h * 0.56, gr = z.w * (o.glowR || 0.64);
    const g = ctx.createRadialGradient(cx, gy, 0, cx, gy, gr); g.addColorStop(0, o.glowColor || T.glow); g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, gy, gr, 0, TAU); ctx.fill();
  }
  if (!img) {
    const s = Math.min(z.w, z.h) * 0.62, cy = z.y + z.h * 0.52;
    ctx.save(); ctx.globalAlpha = 0.30; if (RES.insignia) ctx.drawImage(RES.insignia, cx - s / 2, cy - s / 2, s, s);
    ctx.globalAlpha = 1;
    if (env.preview) text(ctx, 'SUBÍ LA FOTO', cx, cy + s * 0.78, { font: FM(800, Math.max(12, s * 0.12)), fill: 'rgba(60,25,10,.55)', align: 'center', tracking: 2 });
    ctx.restore(); return;
  }
  const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
  // La foto nunca se sale de su cuadro: lo más grande posible dentro de la zona (alto) y del cuadro (ancho).
  const lim = o.lim || [z.x, z.x + z.w], piso = z.h * 0.965;
  const fg = CUADROS_CFG.foto || 1, base = Math.min(z.w / iw, piso / ih) * (p.zoom || 1);
  const sc = Math.min(base * fg, (lim[1] - lim[0]) / iw, piso / ih);
  const dw = iw * sc, dh = ih * sc;
  const suelo = dh < piso * 0.8 ? z.y + (z.h + dh) / 2 : z.y + piso;   // una foto chata (pañales, papel, servilletas) va al medio del alto, no abajo
  const floorY = clamp(suelo + (p.dy || 0) * z.h, z.y + dh, z.y + z.h);
  let px = cx + (p.dx || 0) * z.w;
  px = dw >= lim[1] - lim[0] ? (lim[0] + lim[1]) / 2 : clamp(px, lim[0] + dw / 2, lim[1] - dw / 2);
  // sombra de piso (elipse con degradé radial, sin filtros)
  ctx.save(); ctx.translate(px, floorY); ctx.scale(1, 0.17);
  const sg = ctx.createRadialGradient(0, 0, 0, 0, 0, dw * 0.52); sg.addColorStop(0, 'rgba(40,12,0,.50)'); sg.addColorStop(1, 'rgba(40,12,0,0)');
  ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(0, 0, dw * 0.52, 0, TAU); ctx.fill(); ctx.restore();
  shadow(ctx, 'rgba(50,15,0,.30)', 14 * k, 0, 8 * k);
  ctx.drawImage(img, px - dw / 2, floorY - dh, dw, dh);
  noShadow(ctx);
}

// ───────── insignia de descuento / etiqueta ─────────
function drawBadge(ctx, cx, cy, R, p, T, pct, rot = -0.17, escala = null) {
  const et = String(p.etiqueta || '').trim(), e = escala != null ? escala : (PRECIO_CFG.insignia || 1);
  R *= e; cx += R * 0.12 * (e - 1); cy += R * 0.12 * (e - 1);
  let lines = null, pctMode = false;
  if (et) {
    let parts = et.toUpperCase().split(/\s*[|\n]\s*/).filter(Boolean);
    if (parts.length === 1 && et.includes(' ') && et.length > 7) {
      const w = parts[0].split(' '); let best = 1, bd = 1e9;
      for (let i = 1; i < w.length; i++) { const d = Math.abs(w.slice(0, i).join(' ').length - w.slice(i).join(' ').length); if (d < bd) { bd = d; best = i; } }
      parts = [w.slice(0, best).join(' '), w.slice(best).join(' ')];
    }
    lines = parts.slice(0, 2);
  } else if (pct >= 1 && !LIMPIO) { lines = ['-' + pct + '%', 'OFF']; pctMode = true; }   // en modo limpio el % ya está arriba
  else return false;
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(rot);
  shadow(ctx, 'rgba(60,15,0,.45)', R * 0.35, 0, R * 0.16);
  const fuerte = !pctMode;                                       // 2x1, 3x2, 2.ª al 50 %…: rojo con letra blanca, bien visible
  burstPath(ctx, 0, 0, R, R * 0.84, 16); ctx.fillStyle = vGrad(ctx, -R, R, fuerte ? ['#FF3B4E', '#C8102E'] : T.accent); ctx.fill(); noShadow(ctx);
  burstPath(ctx, 0, 0, R * 0.9, R * 0.77, 16); ctx.lineWidth = R * (fuerte ? 0.05 : 0.03); ctx.strokeStyle = fuerte ? '#FFE066' : 'rgba(255,255,255,.8)'; ctx.stroke();
  const mk = s => FB(900, s), maxW = R * 1.36, c1 = fuerte ? '#FFFFFF' : T.accentDeep, c2 = fuerte ? '#FFE066' : T.accentInk, sh = fuerte ? ['rgba(80,0,10,.45)', 3, 0, 2] : null;
  if (pctMode) {
    const sz = fitSize(ctx, lines[0], mk, R * 0.78, 10, maxW, 0);
    text(ctx, lines[0], 0, R * 0.12, { font: FB(900, sz), fill: T.accentDeep, align: 'center' });
    text(ctx, lines[1], 0, R * 0.56, { font: FB(900, R * 0.34), fill: T.accentInk, align: 'center', tracking: R * 0.05 });
  } else if (lines.length === 1) {
    const sz = fitSize(ctx, lines[0], mk, R * 0.86, 10, maxW, 0);
    text(ctx, lines[0], 0, sz * 0.35, { font: FB(900, sz), fill: c1, align: 'center', shadow: sh });
  } else {
    const s1 = fitSize(ctx, lines[0], mk, R * 0.52, 10, maxW, 0), s2 = fitSize(ctx, lines[1], mk, R * 0.64, 10, maxW, 0);
    text(ctx, lines[0], 0, -R * 0.1, { font: FB(900, s1), fill: c2, align: 'center', shadow: sh });
    text(ctx, lines[1], 0, R * 0.46, { font: FB(900, s2), fill: c1, align: 'center', shadow: sh });
  }
  ctx.restore(); return true;
}

// ───────── placa de precio ─────────
/** Medidas de la placa: alto, tamaño de la cifra y ancho. Con o.min (cuando se agranda), crece solo hasta donde la cifra entra entera a su tamaño. */
function plateGeom(ctx, maxW, H0, price, o = {}) {
  const skew = 0.16, dollar = 0.44, kFinal = o.final === false || !ETQ_PRECIO ? 0 : 0.27;
  const medir = (h, ds) => {
    const gap = h * 0.05; ctx.font = FB(900, ds); const wi = measure(ctx, price.int, 0);
    ctx.font = FB(900, ds * dollar); const wd = measure(ctx, '$', 0), wc = price.dec ? measure(ctx, price.dec, 0) : 0;
    return { gap, wi, wd, wc, total: wd + gap + wi + (price.dec ? gap * 0.6 + wc : 0) };
  };
  let H = H0;
  if (o.min && H0 > o.min) { const a = medir(100, 98).total / 100; H = Math.max(o.min, Math.min(H0, maxW / (a + 0.52 + skew + kFinal))); }
  let ds = H * 0.98, m = medir(H, ds);
  const padX = H * 0.26, finalW = H * kFinal, avail = maxW - padX * 2 - H * skew - finalW;
  if (m.total > avail) { ds *= avail / m.total; m = medir(H, ds); }
  return { H, ds, m, gap: m.gap, padX, finalW, skew, dollar, w: m.total + padX * 2 + H * skew * 0.5 + finalW };
}
/** Alto de la placa según el tamaño elegido en «Leyenda del precio» → [alto, opciones para drawPlate]. */
const altoPlaca = h0 => { const k = PRECIO_CFG.placa || 1; return [h0 * k, k > 1 ? { min: h0 } : {}]; };
const tamAhorro = () => PRECIO_CFG.ahorroTam || 1;
/** Dibuja "$ 18.540" sobre una placa roja inclinada. Devuelve el rectángulo ocupado. */
function drawPlate(ctx, x, yBottom, maxW, H0, price, T, o = {}) {
  const g = plateGeom(ctx, maxW, H0, price, o), { H, ds, m, gap, padX, finalW, skew, dollar } = g;
  const w = g.w, y = yBottom - H;
  ctx.save();
  ctx.translate(x, y + H / 2); ctx.transform(1, 0, -skew, 1, 0, 0);
  shadow(ctx, 'rgba(70,0,10,.45)', 12, 0, 7);
  rrPath(ctx, 0, -H / 2, w, H, H * 0.2); ctx.fillStyle = vGrad(ctx, -H / 2, H / 2, T.price); ctx.fill(); noShadow(ctx);
  ctx.save(); rrPath(ctx, 0, -H / 2, w, H, H * 0.2); ctx.clip();
  ctx.fillStyle = 'rgba(255,255,255,.17)'; ctx.fillRect(0, -H / 2, w, H * 0.38);
  ctx.fillStyle = 'rgba(0,0,0,.14)'; ctx.fillRect(0, H / 2 - H * 0.07, w, H * 0.07);
  ctx.restore();
  rrPath(ctx, H * 0.035, -H / 2 + H * 0.035, w - H * 0.07, H - H * 0.07, H * 0.17); ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = Math.max(1.5, H * 0.018); ctx.stroke();
  ctx.restore();
  // textos (sin inclinar: Barlow ya es cursiva)
  const capH = 0.70, baseY = y + H / 2 + ds * capH / 2, topY = baseY - ds * capH;
  let tx = x + padX + H * skew * 0.1;
  const shd = [T.priceShadow, 2, 0, 3];
  const dsz = ds * dollar;
  text(ctx, '$', tx, topY + dsz * capH, { font: FB(900, dsz), fill: T.priceInk, shadow: shd }); tx += m.wd + gap;
  text(ctx, price.int, tx, baseY, { font: FB(900, ds), fill: T.priceInk, shadow: shd }); tx += m.wi;
  if (price.dec) text(ctx, price.dec, tx + gap * 0.6, topY + dsz * capH, { font: FB(900, dsz), fill: T.priceInk, shadow: shd });
  if (finalW) {                                    // "FINAL" vertical, como en los folletos mayoristas
    ctx.save(); ctx.translate(x + w - finalW * 0.52, y + H / 2); ctx.rotate(-Math.PI / 2);
    const lab = ETQ_PRECIO, lsz = Math.min(H * 0.2, (H * 0.82) / (lab.length * 0.56));
    text(ctx, lab, 0, lsz * 0.36, { font: FB(900, lsz, false), fill: T.accent[0], align: 'center', tracking: lsz * 0.06 });
    ctx.restore();
  }
  return { x, y, w, h: H, right: x + w, ds };
}
/** Cómo se muestra el precio anterior y la palabra de la placa (se elige en "Leyenda del precio"). */
let PRECIO_CFG = { antes: 'antes', ahorro: true, grande: true, insignia: 1.3, placa: 1, ahorroTam: 1, porUnidad: true, fraccion: '100g' };
/** Modo limpio: si todos los productos tienen el % de la promo, el «-10 %» y «pagando con…» no se repiten en cada cuadro
 *  (ya están en la barra y en el sello) y la foto usa ese lugar. Se apaga en «Leyenda del precio». */
let LIMPIO = false;
function modoLimpio(S) {
  if ((S.precio || {}).limpio === false) return false;
  const P = typeof promoInfo === 'function' ? promoInfo(S) : null; if (!P || !P.pct || P.extra || P.cuotas) return false;
  const L = LAYOUTS[S.formato] || {}, usados = (S.productos || []).slice(0, L.slots || 0).filter(p => !productoVacio(p)), pb = Math.floor(P.pct);
  return usados.length > 0 && usados.every(p => (!p.pago || p.pago === P.tipo) && infoProducto(p).pct === pb);
}
/** Precio por kilo o litro con el contenido que dice el nombre (Res. 4/2025: «Aceite 850 ml» → «$2.964,71 x litro»).
 *  Lo que se vende por kilo dice cuánto salen 100 g («$783 los 100 g»). '' si no corresponde. */
function porUnidad(p) {
  const F = parsePrecio(p.final); if (!F || !(F.num > 0)) return '';
  const u = String(p.unidad || '').toLowerCase().trim();
  if (/kg|kilo/.test(u)) {                                        // fiambres y quesos: 100 g, ¼ kg o los dos
    const fr = PRECIO_CFG.fraccion, cien = '$' + precioATexto(aCentavos(F.num / 10)), cuarto = '$' + precioATexto(aCentavos(F.num / 4));
    return fr === 'no' ? '' : fr === 'cuarto' ? '¼ kg ' + cuarto : fr === 'ambos' ? '100 g ' + cien + ' · ¼ kg ' + cuarto : cien + ' los 100 g';
  }
  if (PRECIO_CFG.porUnidad === false || (u && !/^(c\/u|x u|x unidad|unidad|c\/u\.)$/.test(u))) return '';   // x fardo, x docena…: no se calcula
  const nm = String(p.nombre || '') + ' ' + String(p.desc || '');
  const m = /(\d+(?:[.,]\d+)?)\s*(ml|cc|cm3|lts|lt|l|litros?|grs|gr|g|gramos|kgs|kg|kilos?)(?![a-záéíóúñ])/i.exec(nm); if (!m) return '';
  const un = m[2].toLowerCase(), liq = /^(ml|cc|cm3|l|lt|lts|litros?)$/.test(un), chico = /^(ml|cc|cm3|g|gr|grs|gramos)$/.test(un);
  const x = /\bx\s*(\d{1,2})\s*(?:u|un|uni|unid|unidades)\b/i.exec(nm) || /\b(\d{1,2})\s*x\s*\d+(?:[.,]\d+)?\s*(?:ml|cc|l|lt|g|gr|kg)\b/i.exec(nm) || /\bpack\s*(?:de|x)\s*(\d{1,2})\b/i.exec(nm);
  const total = parseFloat(m[1].replace(',', '.')) / (chico ? 1000 : 1) * (x ? +x[1] : 1);
  if (!(total > 0) || Math.abs(total - 1) < 1e-9) return '';     // 1 kg o 1 litro: el precio ya es por kilo o litro
  return '$' + precioATexto(aCentavos(F.num / total)) + (liq ? ' x litro' : ' x kg');
}
/** Cómo se muestra lo que se vende por kilo: '100g', 'cuarto', 'ambos' o 'no' (en la 3.5 era true / false). */
const fraccionDe = v => (v === false || v === 'no' ? 'no' : ['cuarto', 'ambos'].includes(v) ? v : '100g');
/** Nota debajo del precio: la que escribió la persona y el precio por kilo o litro. */
const notaDe = p => [String(p.nota || '').trim(), porUnidad(p)].filter(Boolean).join(' · ');
/** Condición de pago debajo del precio de un cuadro (en modo limpio no se repite la de la barra). */
const chipCard = p => { const c = chipProducto(p, S_DIBUJO); return c && LIMPIO && !c.price && (!p.pago || p.pago === c.P.tipo) ? null : c; };
/** Cuadros de productos (se eligen en "Cuadros de productos"): separación, margen a los costados, fotos, producto estrella
 *  y dónde va el precio adentro de cada cuadro (alinear: 'auto' = como venía; dx y dy en % del cuadro, dy positivo = más arriba). */
let CUADROS_CFG = { sep: 1, margen: 1, foto: 1, estrella: 1, alinear: 'auto', dx: 0, dy: 0, nombre: 1 };
let CAB_CFG = { logo: 1.35, titulo: 0.85, pie: 0.75 };            // tamaños del logo, el título y el pie (S.cabecera)
/** ¿El precio va donde se eligió (y no con la diagramación de siempre)? */
const precioMovido = () => CUADROS_CFG.alinear !== 'auto' || !!CUADROS_CFG.dx || !!CUADROS_CFG.dy;
const alinPrecio = nat => (['izquierda', 'centro', 'derecha'].includes(CUADROS_CFG.alinear) ? CUADROS_CFG.alinear : nat);
/** Caja centrada en la página con el margen a los costados elegido. */
const conMargen = b => { const mg = CUADROS_CFG.margen || 1; return mg === 1 ? b : { ...b, x: b.x * mg, w: b.w + 2 * b.x * (1 - mg) }; };
/** Alto del producto estrella con el tamaño elegido: a la grilla de abajo le queda al menos minResto. */
const altoEstrella = (h0, total, minResto) => { const e = CUADROS_CFG.estrella || 1; return e === 1 ? h0 : clamp(h0 * e, 150, Math.max(150, total - minResto)); };
/** Tamaño de la nota bajo el precio ("Llevando 2 pagás 1: $X c/u"): sigue al tamaño elegido para las insignias. */
const notaTam = k => 15 * k * Math.min(1.5, PRECIO_CFG.insignia || 1);
const ANTES_ESTILOS = { antes: ['ANTES', ''], normal: ['PRECIO NORMAL', ''], lista: ['PRECIO DE LISTA', ''], de_a: ['DE', 'A'], solo: ['', ''] };
const antesPartes = price => (price && price.separado ? ['POR SEPARADO', ''] : ANTES_ESTILOS[PRECIO_CFG.antes] || ANTES_ESTILOS.antes);
const txtPrecio = price => '$' + price.int + (price.dec ? ',' + price.dec : '');
/** Ancho de la leyenda del precio anterior ("ANTES $20.600", "DE $20.600 A"…) a un tamaño dado. */
function measureAntes(ctx, price, size) {
  const [pre, post] = antesPartes(price), gap = size * 0.3;
  ctx.font = FM(800, size * 0.66); const wpre = pre ? measure(ctx, pre, size * 0.05) + gap : 0, wpost = post ? gap + measure(ctx, post, size * 0.05) : 0;
  ctx.font = FM(800, size); return wpre + measure(ctx, txtPrecio(price), 0) + wpost;
}
/** Precio anterior tachado, con su leyenda. o.maxW lo achica si no entra. Devuelve el ancho. */
function drawAntes(ctx, x, y, price, size, T, o = {}) {
  let sz = size; const w0 = measureAntes(ctx, price, sz);
  if (o.maxW && w0 > o.maxW) sz = Math.max(size * 0.6, sz * o.maxW / w0);
  const [pre, post] = antesPartes(price), gap = sz * 0.3, col = o.color || T.soft, s = txtPrecio(price);
  ctx.save();
  let cx = x;
  if (pre) cx += text(ctx, pre, cx, y, { font: FM(800, sz * 0.66), fill: col, tracking: sz * 0.05 }) + gap;
  ctx.font = FM(800, sz); const pw = measure(ctx, s, 0);
  text(ctx, s, cx, y, { font: FM(800, sz), fill: o.priceColor || col });
  const my = y - sz * 0.36;                                       // tachado: línea roja gruesa, apenas inclinada
  ctx.strokeStyle = o.strike || '#D50F25'; ctx.lineWidth = Math.max(2.5, sz * 0.13); ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(cx - sz * 0.04, my + sz * 0.1); ctx.lineTo(cx + pw + sz * 0.06, my - sz * 0.1); ctx.stroke();
  cx += pw;
  if (post) cx += gap + text(ctx, post, cx + gap, y, { font: FM(800, sz * 0.66), fill: col, tracking: sz * 0.05 });
  ctx.restore();
  return cx - x;
}
/** Píldora oscura "AHORRÁS $2.060". Devuelve su ancho (o lo mide si o.medir). */
function chipAhorro(ctx, x, y, h, monto, o = {}) {
  const t = 'AHORRÁS ' + pesos(monto), f = FB(900, h * 0.68), pad = h * 0.36;
  if (o.medir) { ctx.font = f; return measure(ctx, t, 0.4) + pad * 2; }
  return chip(ctx, x, y, t, { h, font: f, align: o.align || 'left', padX: pad, tracking: 0.4, fill: ['#2F2F2F', '#141414'], ink: '#FFE066' });
}

// ───────── precio movible: el bloque del precio armado en filas y ubicado donde se elija dentro del cuadro ─────────
/** filas: de abajo hacia arriba, [{ h, items: [{ w, dib(x, yArriba, hFila) }], sep, gap (aire debajo), justo (a lo ancho de la zona) }].
 *  z: { x, w, bottom, lim: { l, r, t, b } } en coordenadas del cuadro (cw × ch). Corre el bloque lo elegido sin salirse de lim.
 *  Devuelve { top, bottom, left, right } del bloque ya ubicado. */
function bloqueFilas(filas, z, a, cw, ch) {
  const fs = filas.filter(f => f && f.items.length);
  let alto = 0, ancho = 0;
  fs.forEach((f, i) => {
    f.justo = f.justo && f.items.length > 1 && !CUADROS_CFG.dx;
    f.ancho = f.justo ? z.w : f.items.reduce((t, it) => t + it.w, 0) + (f.sep || 0) * (f.items.length - 1);
    ancho = Math.max(ancho, f.ancho); if (i) alto += f.gap || 0; f.base = alto; alto += f.h;
  });
  const xEn = ww => (a === 'derecha' ? z.w - ww : a === 'centro' ? (z.w - ww) / 2 : 0), L = z.lim, x0 = z.x + xEn(ancho);
  const dx = clamp((+CUADROS_CFG.dx || 0) / 100 * cw, L.l - x0, Math.max(L.l - x0, L.r - x0 - ancho));
  const dy = clamp((+CUADROS_CFG.dy || 0) / 100 * ch, z.bottom - L.b, Math.max(z.bottom - L.b, z.bottom - alto - L.t));
  const bottom = z.bottom - dy;
  fs.forEach(f => {
    const yA = bottom - f.base - f.h;
    let x = z.x + dx + xEn(f.ancho);
    const sep = f.justo ? (z.w - f.items.reduce((t, it) => t + it.w, 0)) / (f.items.length - 1) : f.sep || 0;
    f.items.forEach(it => { it.dib(x, yA, f.h); x += it.w + sep; });
  });
  return { top: bottom - alto, bottom, left: x0 + dx, right: x0 + dx + ancho };
}
/** Piezas de las filas. La placa ocupa también lo que se inclina. */
function piezaPlaca(ctx, maxW, H0, price, T, o, out) {
  const g = plateGeom(ctx, maxW, H0, price, o), sk = g.H * g.skew / 2;
  return { w: g.w + sk * 2, h: g.H, dib: (x, y, hf) => { out.plate = drawPlate(ctx, x + sk, y + (hf + g.H) / 2, maxW, H0, price, T, o); } };
}
function piezaChip(ctx, str, hh, op) {
  ctx.font = op.font; const w = measure(ctx, str, op.tracking ?? 1) + (op.padX ?? 14) * 2;
  return { w, dib: (x, y, hf) => chip(ctx, x, y + (hf - hh) / 2, str, { ...op, h: hh, align: 'left' }) };
}
/** «AHORRÁS $X»: si no entra en maxW, se achica (hasta 40 %). */
function piezaAhorro(ctx, hh, monto, maxW = Infinity) {
  let w = chipAhorro(ctx, 0, 0, hh, monto, { medir: true });
  if (w > maxW) { const s = Math.max(0.4, maxW / w); hh *= s; w *= s; }
  return { w, h: hh, dib: (x, y, hf) => chipAhorro(ctx, x, y + (hf - hh) / 2, hh, monto) };
}
function piezaPromo(ctx, hh, mpV) { return { w: promoChipAncho(ctx, hh, mpV.label, mpV.price), dib: (x, y, hf) => drawPromoChip(ctx, x, y + (hf - hh) / 2, hh, mpV.label, mpV.price, mpV.P) }; }
function piezaTexto(ctx, str, font, size, fill, maxW) {
  ctx.font = font; const w = Math.min(maxW, measure(ctx, str, 0));
  return { w, dib: (x, y, hf) => text(ctx, str, x, y + hf / 2 + size * 0.36, { font, fill, maxW }) };
}
function piezaAntes(ctx, R, size, T, op) {
  const w = Math.min(op.maxW, measureAntes(ctx, R, size)), hh = size * 0.8;
  return { w, h: hh, dib: (x, y, hf) => drawAntes(ctx, x, y + (hf + hh) / 2, R, size, T, op) };
}
const ordenar = (a, ...items) => { const v = items.filter(Boolean); return a === 'derecha' ? v.reverse() : v; };

// ───────── tarjeta de producto ─────────
/** Fila "ANTES $X" (+ "AHORRÁS $Y" y la unidad, si entran) apoyada sobre la placa. Devuelve el borde superior que ocupa. */
function filaAntes(ctx, tx, tw, plate, info, p, T, k, o = {}) {
  const aSize = (PRECIO_CFG.grande ? 28 : 21) * k * (o.esc || 1), base = plate.y - 9 * k, unidad = p.unidad ? String(p.unidad).toUpperCase() : '';
  const uF = FB(900, 20 * k), uH = 27 * k;
  ctx.font = uF; const uw = unidad ? measure(ctx, unidad, 0.6) + 22 * k : 0;
  let unidadEnFila = false;
  if (unidad) {                                                  // la unidad va al lado de la placa si entra; si no, sobre la fila del precio anterior
    if (plate.right + 10 * k + uw <= tx + tw) chip(ctx, plate.right + 10 * k, plate.y + (plate.h - uH) / 2, unidad, { h: uH, font: uF, padX: 11 * k, tracking: 0.6 });
    else unidadEnFila = true;
  }
  if (!info.R) { if (unidadEnFila) chip(ctx, tx + tw, base - uH + 4 * k, unidad, { h: uH, font: uF, align: 'right', padX: 11 * k, tracking: 0.6 }); return unidadEnFila ? base - uH : plate.y; }
  const derecha = unidadEnFila ? uw + 10 * k : 0;
  const aw = drawAntes(ctx, tx, base, info.R, aSize, T, { maxW: tw - derecha, priceColor: T.ink });
  if (unidadEnFila) chip(ctx, tx + tw, base - uH * 0.8, unidad, { h: uH, font: uF, align: 'right', padX: 11 * k, tracking: 0.6 });
  else if (PRECIO_CFG.ahorro && info.ahorro > 0 && !p.noAhorro) {
    const ch = Math.min(30 * k, aSize * 1.15) * tamAhorro(), cw = chipAhorro(ctx, 0, 0, ch, info.ahorro, { medir: true });
    if (tx + aw + 12 * k + cw <= tx + tw) {                          // al lado del precio anterior (sin pisar la placa)
      const cy = Math.min(base - ch * 0.76, plate.y - 3 * k - ch);
      chipAhorro(ctx, tx + tw, cy, ch, info.ahorro, { align: 'right' });
      return Math.min(base - aSize * 0.8, cy);
    }
    if (!unidad && plate.right + 10 * k + cw <= tx + tw) chipAhorro(ctx, plate.right + 10 * k, plate.y + (plate.h - ch) / 2, ch, info.ahorro);   // si no, al lado de la placa
  }
  return base - aSize * 0.8;
}
/** Precio de la tarjeta apaisada (foto | texto) ubicado donde se eligió. Devuelve el techo para el nombre. */
function precioMovidoCard(ctx, p, info, T, k, w, h, tx, tw) {
  const a = alinPrecio('izquierda'), nota = notaDe(p), mpV = chipCard(p), mpH = mpV != null ? 33 * k : 0, filas = [];
  const nFs = notaTam(k), pn = nota ? piezaTexto(ctx, nota, FM(800, nFs), nFs, T.ink, tw) : null, pz = mpH ? piezaPromo(ctx, mpH, mpV) : null;
  if (pz && pn && pz.w + 10 * k + pn.w <= tw) filas.push({ h: mpH, items: [pz, pn], sep: 10 * k });
  else { if (pn) filas.push({ h: nFs * 1.3, items: [pn] }); if (pz) filas.push({ h: mpH, items: [pz] }); }
  const [plateH, pOp] = altoPlaca((mpH ? 58 : 70) * k), out = {};
  const pp = piezaPlaca(ctx, tw - plateH * 0.08, plateH, info.F || { int: '0', dec: '' }, T, pOp, out);
  const unidad = p.unidad ? String(p.unidad).toUpperCase() : '', uH = 27 * k;
  const pu = unidad ? piezaChip(ctx, unidad, uH, { font: FB(900, 20 * k), padX: 11 * k, tracking: 0.6 }) : null, uAlLado = pu && pp.w + 10 * k + pu.w <= tw;
  const fp = { h: pp.h, items: uAlLado ? ordenar(a, pp, pu) : [pp], sep: 10 * k, gap: filas.length ? 5 * k : 0 };
  filas.push(fp);
  if (info.R) {                                                   // fila del precio anterior, con «AHORRÁS» (o la unidad) al lado
    const aSize = (PRECIO_CFG.grande ? 28 : 21) * k, pa = piezaAntes(ctx, info.R, aSize, T, { maxW: tw - (pu && !uAlLado ? pu.w + 10 * k : 0), priceColor: T.ink });
    const fa = { h: pa.h, items: [pa], sep: 12 * k, gap: 9 * k, justo: a === 'izquierda' };
    if (pu && !uAlLado) { fa.items.push(pu); fa.h = Math.max(fa.h, uH); }
    else if (PRECIO_CFG.ahorro && info.ahorro > 0 && !p.noAhorro) {
      const ps = piezaAhorro(ctx, Math.min(30 * k, aSize * 1.15) * tamAhorro(), info.ahorro);
      if (pa.w + 12 * k + ps.w <= tw) { fa.items.push(ps); fa.h = Math.max(fa.h, ps.h); }
      else if (!pu && pp.w + 10 * k + ps.w <= tw) fp.items = ordenar(a, pp, ps);
    }
    filas.push(fa);
  } else if (pu && !uAlLado) filas.push({ h: uH, items: [pu], gap: 6 * k });
  return bloqueFilas(filas, { x: tx, w: tw, bottom: h - (mpH || nota ? 10 : 16) * k, lim: { l: 10 * k, r: w - 10 * k, t: 44 * k, b: h - 5 * k } }, a, w, h).top - 6 * k;
}
function drawCard(ctx, r, p, T, env, o = {}) {
  const { x, y, w, h } = r, k = o.k || Math.min(h / 253, w / 566), info = infoProducto(p);
  ctx.save(); ctx.translate(x, y);
  shadow(ctx, T.cardShadow, 26 * k, 0, 10 * k);
  rrPath(ctx, 0, 0, w, h, 26 * k); ctx.fillStyle = T.card; ctx.fill(); noShadow(ctx);
  // textura sutil: franja inferior
  ctx.save(); rrPath(ctx, 0, 0, w, h, 26 * k); ctx.clip();
  ctx.fillStyle = 'rgba(255,196,0,.10)'; ctx.fillRect(0, h * 0.74, w, h * 0.26); ctx.restore();
  const ff = o.foto || 0.40, z = { x: 8 * k, y: 8 * k, w: w * ff, h: h - 16 * k };   // la foto queda dentro del cuadro
  drawProductArt(ctx, p, z, T, env, { k, lim: [4 * k, 8 * k + w * ff + 6 * k], aire: o.aire });
  const tx = w * (ff + 0.015) + 8 * k, tw = w - tx - 16 * k;
  // de abajo hacia arriba: promo/nota, placa, precio anterior; arriba el nombre y la descripción en lo que queda
  const fn = CUADROS_CFG.nombre || 1, nm = String(p.nombre || '').trim().toUpperCase(), nMax = (o.foto ? 30 : 42) * k * fn, nMin = Math.min((o.foto ? 16 : 20) * k * fn, nMax);
  let techo, lift = 0;                                            // lift (foto grande): nombre y precio juntos, en el medio del alto
  if (precioMovido()) techo = precioMovidoCard(ctx, p, info, T, k, w, h, tx, tw);
  else {
    const nota = notaDe(p), mpV = chipCard(p), mpH = mpV != null ? 33 * k : 0;
    const nFs = notaTam(k), nF = FM(800, nFs);
    const cwChip = mpH ? promoChipAncho(ctx, mpH, mpV.label, mpV.price) : 0;
    ctx.font = nF; const notaAlLado = mpH && nota && tw - cwChip - 14 * k >= measure(ctx, nota, 0) * 0.95;   // si no entra cómoda al lado, va abajo (sin apretar la letra)
    const notaAbajo = nota && !notaAlLado, notaH = notaAbajo ? nFs * 1.3 : 0;
    const [plateH, pOp] = altoPlaca((mpH ? 58 : 70) * k * (o.foto ? 1.4 : 1)), bajo = (mpH || notaAbajo ? 10 : 16) * k + (mpH ? mpH + 5 * k : 0) + notaH;
    if (o.foto) {
      const nf = fitBlock(ctx, nm || 'NOMBRE DEL PRODUCTO', s => FB(900, s), nMax, nMin, tw, 2, nMax * 2, 0.92, 0.4);
      const fila = info.R || p.unidad ? 34 * k : 0, bloque = nf.size * 0.92 * nf.lines.length + 12 * k + fila + plateH + bajo;
      lift = Math.max(0, (h - 17 * k - bloque) / 2);
    }
    const plateBottom = h - bajo - lift;
    const price = info.F || { int: '0', dec: '' };
    const plate = drawPlate(ctx, tx - 8 * k, plateBottom, tw + 8 * k, plateH, price, T, pOp);
    if (mpH) {                                                    // fila inferior: "CON MP $…" y, si entra, la nota al lado
      const cw = drawPromoChip(ctx, tx - 4 * k, plateBottom + 5 * k, mpH, mpV.label, mpV.price, mpV.P);
      if (notaAlLado) text(ctx, nota, tx - 4 * k + cw + 10 * k, plateBottom + 5 * k + mpH * 0.5 + nFs * 0.36, { font: nF, fill: T.ink, maxW: tx + tw - (tx - 4 * k + cw) - 10 * k });
    }
    if (notaAbajo) text(ctx, nota, tx - 4 * k, h - 10 * k - nFs * 0.25 - lift, { font: nF, fill: T.ink, maxW: tw + 4 * k });
    techo = filaAntes(ctx, tx, tw, plate, info, p, T, k) - 6 * k;
  }
  const top = Math.max(17 * k + lift, o.foto ? 32 * k : 0), desc = String(p.desc || '').trim(), dSize = 18 * k;   // foto grande: el nombre un poco más abajo de la esquina
  const wf = fitBlock(ctx, nm || 'NOMBRE DEL PRODUCTO', s => FB(900, s), nMax, nMin, tw, 2, Math.max(24 * k, techo - top - (desc ? 0 : 0)), 0.92, 0.4);
  // foto grande: el nombre va pegado arriba del precio (no arriba de todo), así se leen juntos
  const y0 = o.foto ? Math.max(top, techo - 8 * k - wf.size * 0.92 * wf.lines.length - (desc ? dSize * 1.3 : 0)) : top;
  wf.lines.forEach((ln, i) => text(ctx, ln, tx, y0 + wf.size * 0.82 + i * wf.size * 0.92, { font: FB(900, wf.size), fill: nm ? T.ink : 'rgba(60,25,10,.35)', tracking: 0.4 }));
  const ty = y0 + wf.size * 0.92 * wf.lines.length + 3 * k;
  if (desc && techo - ty >= dSize * 1.05) {                       // descripción: usa el espacio que quede entre el nombre y el precio anterior
    const maxL = techo - ty >= dSize * 2.4 ? 2 : 1;
    const df = wrapFit(ctx, desc, s => FM(600, s), dSize, 12.5 * k, tw, maxL, 0);
    df.lines.forEach((ln, i) => text(ctx, ln, tx, ty + df.size * 0.95 + i * df.size * 1.2, { font: FM(600, df.size), fill: T.soft }));
  }
  drawBadge(ctx, 40 * k, 34 * k, 44 * k, p, T, info.pct);
  ctx.restore();
}
/** Precio de la tarjeta vertical ubicado donde se eligió. Devuelve dónde termina el nombre (abajo). */
function precioMovidoV(ctx, p, info, T, k, w, h, a, out = {}) {
  const pad = 14 * k, tw = w - pad * 2, nota = notaDe(p), mpV = chipCard(p), mpH = mpV != null ? 28 * k : 0, filas = [];
  if (nota) { const nFs = notaTam(k); filas.push({ h: nFs * 1.35, items: [piezaTexto(ctx, nota, FM(800, nFs), nFs, T.ink, tw)] }); }
  if (mpH) filas.push({ h: mpH, items: [piezaPromo(ctx, mpH, mpV)] });
  const [plateH, pOp] = altoPlaca(60 * k), pp = piezaPlaca(ctx, tw - plateH * 0.08, plateH, info.F || { int: '0', dec: '' }, T, pOp, {});
  const unidad = p.unidad ? String(p.unidad).toUpperCase() : '', pu = unidad ? piezaChip(ctx, unidad, 26 * k, { font: FB(900, 19 * k), padX: 10 * k, tracking: 0.6 }) : null;
  out.unidad = !!pu && pp.w + 8 * k + pu.w <= tw;                 // la unidad («X KG») al lado del precio si entra
  filas.push({ h: pp.h, items: out.unidad ? ordenar(a, pp, pu) : [pp], sep: 8 * k, gap: mpH ? 6 * k : 0 });
  if (info.R) {
    const aSize = (PRECIO_CFG.grande ? 28 : 21) * k, pa = piezaAntes(ctx, info.R, aSize, T, { maxW: tw, priceColor: T.ink });
    const ps = PRECIO_CFG.ahorro && info.ahorro > 0 && !p.noAhorro ? piezaAhorro(ctx, 26 * k * tamAhorro(), info.ahorro, tw) : null;
    if (ps && pa.w + 12 * k + ps.w <= tw) filas.push({ h: Math.max(pa.h, ps.h), items: [pa, ps], sep: 12 * k, gap: 8 * k });
    else { filas.push({ h: pa.h, items: [pa], gap: 8 * k }); if (ps && h / w > 1.02) filas.push({ h: ps.h, items: [ps], gap: 6 * k }); }
  }
  return bloqueFilas(filas, { x: pad, w: tw, bottom: h - 12 * k, lim: { l: 8 * k, r: w - 8 * k, t: 76 * k, b: h - 4 * k } }, a, w, h).top - 7 * k;
}
/** Tarjeta vertical (foto arriba, precio abajo): para grillas de 12 y 16 y los posteos de 4. */
function drawCardV(ctx, r, p, T, env, o = {}) {
  const { x, y, w, h } = r, k = o.k || Math.min(w / 360, h / 330), info = infoProducto(p);
  ctx.save(); ctx.translate(x, y);
  shadow(ctx, T.cardShadow, 24 * k, 0, 9 * k);
  rrPath(ctx, 0, 0, w, h, 24 * k); ctx.fillStyle = T.card; ctx.fill(); noShadow(ctx);
  ctx.save(); rrPath(ctx, 0, 0, w, h, 24 * k); ctx.clip(); ctx.fillStyle = 'rgba(255,196,0,.10)'; ctx.fillRect(0, h * 0.6, w, h * 0.4); ctx.restore();
  const pad = 14 * k, tw = w - pad * 2, cx = w / 2;
  let yb = h - 12 * k, a = 'centro', unidadJunto = false;
  if (precioMovido()) { a = alinPrecio('centro'); const out = {}; yb = precioMovidoV(ctx, p, info, T, k, w, h, a, out); unidadJunto = out.unidad; }
  else {
    const nota = notaDe(p), mpV = chipCard(p), mpH = mpV != null ? 28 * k : 0;
    if (nota) { const nFs = notaTam(k); text(ctx, nota, cx, yb - 3 * k, { font: FM(800, nFs), fill: T.ink, align: 'center', maxW: tw }); yb -= nFs * 1.35; }
    if (mpH) { drawPromoChip(ctx, cx, yb - mpH, mpH, mpV.label, mpV.price, mpV.P, 'center'); yb -= mpH + 6 * k; }
    const [plateH, pOp] = altoPlaca(60 * k), price = info.F || { int: '0', dec: '' }, pw = drawPlateMeasure(ctx, tw, plateH, price, pOp);
    const unidad = p.unidad ? String(p.unidad).toUpperCase() : '', uH = 26 * k, uF = FB(900, 19 * k);
    ctx.font = uF; const uw = unidad ? measure(ctx, unidad, 0.6) + 20 * k : 0;
    unidadJunto = !!unidad && pw + 8 * k + uw <= tw;              // «$7.830 X KG»: la unidad al lado del precio (Res. 4/2025), si entra
    const plate = drawPlate(ctx, cx - (pw + (unidadJunto ? 8 * k + uw : 0)) / 2 + plateH * 0.04, yb, tw, plateH, price, T, pOp);
    if (unidadJunto) chip(ctx, plate.right + 8 * k, plate.y + (plate.h - uH) / 2, unidad, { h: uH, font: uF, padX: 10 * k, tracking: 0.6 });
    yb = plate.y - 8 * k;
    if (info.R) {
      const aSize = (PRECIO_CFG.grande ? 28 : 21) * k, aw = Math.min(tw, measureAntes(ctx, info.R, aSize));
      const conAhorro = PRECIO_CFG.ahorro && info.ahorro > 0 && !p.noAhorro, ch = 26 * k * tamAhorro(), cw = conAhorro ? chipAhorro(ctx, 0, 0, ch, info.ahorro, { medir: true }) : 0;
      if (conAhorro && aw + 12 * k + cw <= tw) {                  // en una sola fila: ANTES $X  [AHORRÁS $Y]
        const x0 = cx - (aw + 12 * k + cw) / 2, cy = Math.min(yb - ch * 0.76, plate.y - 3 * k - ch);
        drawAntes(ctx, x0, yb, info.R, aSize, T, { maxW: tw, priceColor: T.ink }); chipAhorro(ctx, x0 + aw + 12 * k, cy, ch, info.ahorro);
        yb = Math.min(yb - aSize * 0.82, cy) - 7 * k;
      } else {
        drawAntes(ctx, cx - aw / 2, yb, info.R, aSize, T, { maxW: tw, priceColor: T.ink }); yb -= aSize * 0.82 + 7 * k;
        if (conAhorro && h / w > 1.02) { chipAhorro(ctx, cx, yb - ch, ch, info.ahorro, { align: 'center' }); yb -= ch + 6 * k; }
      }
    }
  }
  const nm = String(p.nombre || '').trim().toUpperCase(), [nx, nAl] = a === 'izquierda' ? [pad, 'left'] : a === 'derecha' ? [w - pad, 'right'] : [cx, 'center'];
  const fn = CUADROS_CFG.nombre || 1, wf = fitBlock(ctx, nm || 'NOMBRE DEL PRODUCTO', s => FB(900, s), 27 * k * fn, Math.min(14 * k * fn, 27 * k * fn), tw, 2, h * 0.17 * fn, 0.92, 0.4);   // nombre chico: la foto y el precio se ven primero
  const nameTop = yb - wf.size * 0.92 * wf.lines.length;
  wf.lines.forEach((ln, i) => text(ctx, ln, nx, nameTop + wf.size * 0.82 + i * wf.size * 0.92, { font: FB(900, wf.size), fill: nm ? T.ink : 'rgba(60,25,10,.35)', align: nAl, tracking: 0.4 }));
  drawProductArt(ctx, p, { x: pad, y: 6 * k, w: tw, h: Math.max(40 * k, nameTop - 12 * k) }, T, env, { k, glowR: 0.5, lim: [4 * k, w - 4 * k], aire: o.aire });
  if (p.unidad && !unidadJunto) chip(ctx, w - 10 * k, 10 * k, String(p.unidad).toUpperCase(), { h: 26 * k, font: FB(900, 19 * k), align: 'right', padX: 10 * k, tracking: 0.6 });
  drawBadge(ctx, 36 * k, 34 * k, 36 * k, p, T, info.pct);
  ctx.restore();
}
/** Tarjeta apaisada (foto | nombre + descripción | precio). Para formatos angostos en alto como la historia. */
function drawCardWide(ctx, r, p, T, env, o = {}) {
  const { x, y, w, h } = r, k = o.k || h / 170, info = infoProducto(p);
  ctx.save(); ctx.translate(x, y);
  shadow(ctx, T.cardShadow, 24 * k, 0, 9 * k);
  rrPath(ctx, 0, 0, w, h, 24 * k); ctx.fillStyle = T.card; ctx.fill(); noShadow(ctx);
  ctx.save(); rrPath(ctx, 0, 0, w, h, 24 * k); ctx.clip(); ctx.fillStyle = 'rgba(255,196,0,.10)'; ctx.fillRect(0, h * 0.74, w, h * 0.26); ctx.restore();
  const zw = Math.min(w * 0.15, 150 * k);
  drawProductArt(ctx, p, { x: 10 * k, y: 6 * k, w: zw, h: h - 12 * k }, T, env, { k, lim: [4 * k, w - 4 * k], aire: o.aire });
  const tx = zw + 34 * k, pxr = w - 24 * k, priceW = Math.min(w * 0.36, 400 * k);
  let tw = pxr - priceW - 28 * k - tx;
  const movido = precioMovido();
  if (movido) tw = Math.min(tw, precioMovidoWide(ctx, p, info, T, k, w, h, pxr - priceW, priceW, tx + 140 * k) - 24 * k - tx);   // el nombre usa lo que deja el precio
  const nm = String(p.nombre || '').trim().toUpperCase(), desc = String(p.desc || '').trim();
  const dSize = 21 * k, descH = desc ? dSize * 1.3 + 3 * k : 0, top = 20 * k;
  const wf = fitBlock(ctx, nm || 'NOMBRE DEL PRODUCTO', s => FB(900, s), 46 * k, 22 * k, tw, 2, h - top - 18 * k - descH, 0.92, 0.4);
  wf.lines.forEach((ln, i) => text(ctx, ln, tx, top + wf.size * 0.82 + i * wf.size * 0.92, { font: FB(900, wf.size), fill: nm ? T.ink : 'rgba(60,25,10,.35)', tracking: 0.4 }));
  if (desc) { const df = wrapFit(ctx, desc, s => FM(600, s), dSize, 13 * k, tw, 1, 0); text(ctx, df.lines[0], tx, top + wf.size * 0.92 * wf.lines.length + 3 * k + df.size * 0.95, { font: FM(600, df.size), fill: T.soft }); }
  if (!movido) {
    const nota = notaDe(p), mpV = chipCard(p), mpH = mpV != null ? 26 * k : 0;
    const [plateH, pOp] = altoPlaca((mpH ? 64 : 74) * k), plateBottom = h - (mpH ? 12 : 16) * k - (mpH ? mpH + 5 * k : nota ? 18 * k : 0);
    const price = info.F || { int: '0', dec: '' };
    const pw = drawPlateMeasure(ctx, priceW, plateH, price, pOp);
    const plate = drawPlate(ctx, pxr - pw, plateBottom, priceW, plateH, price, T, pOp);
    if (mpH) drawPromoChip(ctx, pxr, plateBottom + 5 * k, mpH, mpV.label, mpV.price, mpV.P, 'right');
    else if (nota) text(ctx, nota, pxr, h - 14 * k, { font: FM(800, notaTam(k)), fill: T.ink, align: 'right', maxW: priceW + 60 * k });
    if (info.R) { const as = (PRECIO_CFG.grande ? 26 : 21) * k, aw = Math.min(priceW + 60 * k, measureAntes(ctx, info.R, as)); drawAntes(ctx, pxr - aw, plate.y - 10 * k, info.R, as, T, { maxW: priceW + 60 * k, priceColor: T.ink }); }
    if (p.unidad) chip(ctx, plate.x - 10 * k, plate.y + plate.h / 2 - 14 * k, String(p.unidad).toUpperCase(), { h: 28 * k, font: FB(900, 21 * k), align: 'right', padX: 11 * k, tracking: 0.6 });
  }
  drawBadge(ctx, 40 * k, 34 * k, 42 * k, p, T, info.pct);
  ctx.restore();
}
/** Precio de la tarjeta de renglón (historias) ubicado donde se eligió, en la zona [zx, zx + zw]. Devuelve su borde izquierdo. */
function precioMovidoWide(ctx, p, info, T, k, w, h, zx, zw, limL) {
  const a = alinPrecio('derecha'), nota = notaDe(p), mpV = chipCard(p), mpH = mpV != null ? 26 * k : 0, filas = [];
  if (mpH) filas.push({ h: mpH, items: [piezaPromo(ctx, mpH, mpV)] });
  else if (nota) filas.push({ h: 18 * k, items: [piezaTexto(ctx, nota, FM(800, notaTam(k)), notaTam(k), T.ink, zw + 40 * k)] });
  const [plateH, pOp] = altoPlaca((mpH ? 64 : 74) * k), pp = piezaPlaca(ctx, zw - plateH * 0.08, plateH, info.F || { int: '0', dec: '' }, T, pOp, {});
  const unidad = p.unidad ? String(p.unidad).toUpperCase() : '', pu = unidad ? piezaChip(ctx, unidad, 28 * k, { font: FB(900, 21 * k), padX: 11 * k, tracking: 0.6 }) : null;
  const uAlLado = pu && pp.w + 10 * k + pu.w <= zw + 24 * k;
  filas.push({ h: pp.h, items: uAlLado ? ordenar(a, pp, pu) : [pp], sep: 10 * k, gap: filas.length ? 5 * k : 0 });
  const as = (PRECIO_CFG.grande ? 26 : 21) * k, pa = info.R ? piezaAntes(ctx, info.R, as, T, { maxW: zw + 40 * k, priceColor: T.ink }) : null;
  const arriba = [pa, pu && !uAlLado ? pu : null].filter(Boolean);
  if (arriba.length) filas.push({ h: Math.max(pa ? pa.h : 0, pu && !uAlLado ? 28 * k : 0), items: arriba, sep: 12 * k, gap: 10 * k });
  return bloqueFilas(filas, { x: zx, w: zw, bottom: h - (mpH ? 12 : 16) * k, lim: { l: limL, r: w - 12 * k, t: 8 * k, b: h - 4 * k } }, a, w, h).left;
}
function drawEmptyCard(ctx, r, T, env, k) {
  if (env.preview) {
    ctx.save(); ctx.translate(r.x, r.y);
    rrPath(ctx, 0, 0, r.w, r.h, 26 * k); ctx.fillStyle = 'rgba(255,255,255,.13)'; ctx.fill();
    ctx.setLineDash([14 * k, 10 * k]); ctx.lineWidth = 3 * k; ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.stroke(); ctx.setLineDash([]);
    text(ctx, '+', r.w / 2, r.h / 2 + 6 * k, { font: FB(900, 76 * k, false), fill: 'rgba(255,255,255,.85)', align: 'center' });
    text(ctx, 'ELEGIR PRODUCTO', r.w / 2, r.h / 2 + 42 * k, { font: FM(800, 17 * k), fill: 'rgba(255,255,255,.9)', align: 'center', tracking: 2.5 * k, maxW: r.w - 16 * k });
    text(ctx, 'SI QUEDA VACÍO, NO SALE', r.w / 2, r.h / 2 + 66 * k, { font: FM(700, 13 * k), fill: 'rgba(255,255,255,.7)', align: 'center', tracking: 1.5 * k, maxW: r.w - 16 * k });   // los demás cuadros se agrandan
    ctx.restore(); return;
  }
  drawRelleno(ctx, r, T, k);
}
/** Tarjeta de la marca que ocupa un casillero sin producto en el folleto terminado (así nunca queda un hueco). */
function drawRelleno(ctx, r, T, k) {
  ctx.save(); ctx.translate(r.x, r.y); const { w, h } = r;
  shadow(ctx, T.cardShadow, 26 * k, 0, 10 * k);
  rrPath(ctx, 0, 0, w, h, 26 * k); ctx.fillStyle = vGrad(ctx, 0, h, T.hero); ctx.fill(); noShadow(ctx);
  rrPath(ctx, 5 * k, 5 * k, w - 10 * k, h - 10 * k, 22 * k); ctx.lineWidth = 4 * k; ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.stroke();
  if (w / h < 1.75) {                                            // casillero vertical: insignia arriba, texto abajo
    const s = Math.min(w * 0.5, h * 0.42);
    if (RES.insignia) ctx.drawImage(RES.insignia, (w - s) / 2, h * 0.1, s, s);
    const f = fitBlock(ctx, 'Y MUCHAS OFERTAS MÁS EN EL LOCAL', q => FB(900, q), 46 * k, 16 * k, w - 36 * k, 3, h * 0.4, 0.95, 0.5);
    f.lines.forEach((ln, n) => text(ctx, ln, w / 2, h * 0.1 + s + 14 * k + f.size * 0.8 + n * f.size * 0.95, { font: FB(900, f.size), fill: T.heroInk, align: 'center', tracking: 0.5 }));
    ctx.restore(); return;
  }
  const s = Math.min(h * 0.64, w * 0.3), x0 = 26 * k;
  if (RES.insignia) ctx.drawImage(RES.insignia, x0, (h - s) / 2, s, s);
  const tx = x0 + s + 24 * k, tw = w - tx - 26 * k;
  const f = fitBlock(ctx, 'Y MUCHAS OFERTAS MÁS EN EL LOCAL', q => FB(900, q), 58 * k, 20 * k, tw, 3, h * 0.72, 0.95, 0.5);
  const y0 = (h - f.size * 0.95 * f.lines.length) / 2 + f.size * 0.8;
  f.lines.forEach((ln, n) => text(ctx, ln, tx, y0 + n * f.size * 0.95, { font: FB(900, f.size), fill: T.heroInk, tracking: 0.5 }));
  ctx.restore();
}

// ───────── producto estrella (horizontal) ─────────
function stickerEstrella(ctx, x, y, k, T, rot = -0.05, big = 1) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
  const fs = 36 * k * big, stH = 52 * k * big, stT = 'OFERTA ESTRELLA'; ctx.font = FB(900, fs);
  const stW = measure(ctx, stT, 2 * k) + 96 * k * big;
  shadow(ctx, 'rgba(60,0,10,.4)', 10 * k, 0, 5 * k);
  rrPath(ctx, 0, 0, stW, stH, stH / 2); ctx.fillStyle = vGrad(ctx, 0, stH, T.sello); ctx.fill(); noShadow(ctx);
  iconStar(ctx, 28 * k * big, stH / 2, 17 * k * big, '#FFE066'); iconStar(ctx, stW - 28 * k * big, stH / 2, 17 * k * big, '#FFE066');
  text(ctx, stT, stW / 2, stH / 2 + fs * 0.35, { font: FB(900, fs), fill: '#fff', align: 'center', tracking: 2 * k });
  ctx.restore();
}
/** Precio del producto estrella apaisado ubicado donde se eligió. Devuelve el techo para el nombre. */
function precioMovidoHeroH(ctx, p, info, T, k, w, h, tx, tw) {
  const a = alinPrecio('izquierda'), nota = notaDe(p), mpV = chipCard(p), filas = [];
  if (nota) { const fs = 21 * k * Math.min(1.4, PRECIO_CFG.insignia || 1); filas.push({ h: 24 * k, items: [piezaTexto(ctx, nota, FM(800, fs), fs, T.heroInk, tw)] }); }
  const pz = mpV != null ? piezaPromo(ctx, 42 * k, mpV) : null;
  const ps = PRECIO_CFG.ahorro && info.ahorro > 0 && !p.noAhorro ? piezaAhorro(ctx, 42 * k * tamAhorro(), info.ahorro, tw - (pz ? pz.w + 18 * k : 0)) : null;
  if (pz || ps) filas.push({ h: Math.max(pz ? 42 * k : 0, ps ? ps.h : 0), items: [pz, ps].filter(Boolean), sep: 18 * k, justo: a === 'izquierda' });
  const [plateH, pOp] = altoPlaca((pz || ps ? 128 : 140) * k), pp = piezaPlaca(ctx, tw - plateH * 0.08, plateH, info.F || { int: '0', dec: '' }, T, pOp, {});
  filas.push({ h: pp.h, items: [pp], gap: pz || ps ? 8 * k : 0 });
  const unidad = p.unidad ? String(p.unidad).toUpperCase() : '';
  const pu = unidad ? piezaChip(ctx, unidad, 38 * k, { font: FB(900, 28 * k), padX: 15 * k, tracking: 1, fill: T.price, ink: T.priceInk || '#fff' }) : null;
  const pa = info.R ? piezaAntes(ctx, info.R, (PRECIO_CFG.grande ? 42 : 36) * k, T, { color: T.heroSoft, priceColor: T.heroInk, maxW: tw - (pu ? pu.w + 16 * k : 0) }) : null;
  if (pa || pu) filas.push({ h: Math.max(pa ? pa.h : 0, pu ? 38 * k : 0), items: [pa, pu].filter(Boolean), sep: 16 * k, gap: 14 * k, justo: a === 'izquierda' });
  return bloqueFilas(filas, { x: tx, w: tw, bottom: h - (pz || ps ? 30 : 38) * k, lim: { l: 20 * k, r: w - 20 * k, t: 126 * k, b: h - 14 * k } }, a, w, h).top;
}
function drawHeroH(ctx, r, p, T, env, o = {}) {
  const { x, y, w, h } = r, k = o.k || Math.min(h / 520, w / 1152), info = infoProducto(p);
  ctx.save(); ctx.translate(x, y);
  shadow(ctx, 'rgba(60,15,0,.5)', 34 * k, 0, 16 * k);
  rrPath(ctx, 0, 0, w, h, 38 * k); ctx.fillStyle = vGrad(ctx, 0, h, T.hero); ctx.fill(); noShadow(ctx);
  ctx.save(); rrPath(ctx, 0, 0, w, h, 38 * k); ctx.clip();
  const icx = w * 0.23, icy = h * 0.5;
  const rg = ctx.createRadialGradient(icx, icy, 0, icx, icy, w * 0.75); rg.addColorStop(0, T.heroRay); rg.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = rg; raysPath(ctx, icx, icy, w * 1.2, 32, 0.2); ctx.fill();
  ctx.restore();
  rrPath(ctx, 6 * k, 6 * k, w - 12 * k, h - 12 * k, 33 * k); ctx.lineWidth = 5 * k; ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.stroke();
  const ff = o.foto || 0.40, z = { x: 20 * k, y: 16 * k, w: w * ff, h: h - 30 * k };   // la foto queda dentro del cuadro
  drawProductArt(ctx, p, z, T, env, { k, glowColor: 'rgba(255,255,255,.85)', glowR: 0.62, lim: [10 * k, 26 * k + w * ff] });
  if (o.sticker !== false) stickerEstrella(ctx, w * 0.43 - 6 * k, 22 * k, k, T);
  const tx = w * (ff + 0.03), tw = w - tx - 34 * k, nMax = (o.nombre || 98) * k * (CUADROS_CFG.nombre || 1);
  let extra = 0;                                                   // o.centrar: nombre y precio juntos, en el medio del alto
  let anteTop;
  if (precioMovido()) anteTop = precioMovidoHeroH(ctx, p, info, T, k, w, h, tx, tw);
  else {
    const nota = notaDe(p), mpV = chipCard(p), hasA = PRECIO_CFG.ahorro && info.ahorro > 0 && !p.noAhorro;
    const fila = mpV != null || hasA;                              // fila bajo la placa: "CON MP $…" a la izquierda, "AHORRÁS" a la derecha
    const at = tamAhorro(), hA = hasA ? 42 * k * at : 0, filaH = fila ? Math.max(mpV != null ? 42 * k : 0, hA) + 8 * k : 0;
    const [plateH, pOp] = altoPlaca((fila ? 128 : 140) * k);
    if (o.centrar) extra = Math.max(0, (h - (nMax * 0.92 * 2 + (p.desc ? 40 * k : 0) + 50 * k + plateH + filaH + (nota ? 24 * k : 0) + 70 * k)) / 2);
    const plateBottom = h - (fila ? 30 : 38) * k - filaH - (nota ? 24 * k : 0) - extra;
    const price = info.F || { int: '0', dec: '' };
    const plate = drawPlate(ctx, tx - 10 * k, plateBottom, tw + 10 * k, plateH, price, T, pOp);
    if (nota) text(ctx, nota, tx, h - 34 * k - extra, { font: FM(800, 21 * k * Math.min(1.4, PRECIO_CFG.insignia || 1)), fill: T.heroInk, maxW: tw });
    let libre = tw;
    if (mpV != null) libre -= drawPromoChip(ctx, tx - 6 * k, plateBottom + 8 * k + (filaH - 8 * k - 42 * k) / 2, 42 * k, mpV.label, mpV.price, mpV.P) + 18 * k;
    if (hasA) {                                                    // si no entra al lado de la condición de pago, se achica
      const tA = 'AHORRÁS ' + pesos(info.ahorro); ctx.font = FB(900, 30 * k * at);
      const s = Math.min(1, libre / (measure(ctx, tA, 0.5) + 36 * k * at)), hh = hA * s;
      chip(ctx, tx + tw, plateBottom + 8 * k + (filaH - 8 * k - hh) / 2, tA, { h: hh, font: FB(900, 30 * k * at * s), align: 'right', padX: 18 * k * at * s, tracking: 0.5, fill: ['#2F2F2F', '#1A1A1A'], ink: '#FFE066' });
    }
    const anteBase = plate.y - 14 * k;
    anteTop = info.R ? anteBase - (PRECIO_CFG.grande ? 36 : 31) * k : plate.y - 6 * k;
    if (info.R) drawAntes(ctx, tx, anteBase, info.R, (PRECIO_CFG.grande ? 42 : 36) * k, T, { color: T.heroSoft, priceColor: T.heroInk, maxW: tw });
    if (p.unidad) chip(ctx, tx + tw, plate.y - 54 * k, String(p.unidad).toUpperCase(), { h: 38 * k, font: FB(900, 28 * k), align: 'right', padX: 15 * k, tracking: 1, fill: T.price, ink: T.priceInk || '#fff' });
  }
  // nombre + descripción en el espacio que queda
  const desc = String(p.desc || '').trim(), nm = String(p.nombre || '').trim().toUpperCase(), top = o.sticker === false ? 34 * k + extra : 86 * k;
  const dSize = 27 * k, descH = desc ? dSize * 1.3 + 4 * k : 0;
  const wf = fitBlock(ctx, nm || 'NOMBRE DEL PRODUCTO', s => FB(900, s), nMax, Math.min(36 * k, nMax), tw, 2, anteTop - 4 * k - top - descH, 0.92, 0.5);
  wf.lines.forEach((ln, i) => text(ctx, ln, tx, top + wf.size * 0.82 + i * wf.size * 0.92, { font: FB(900, wf.size), fill: nm ? T.heroInk : 'rgba(60,25,10,.35)', tracking: 0.5 }));
  if (desc) { const ty = top + wf.size * 0.92 * wf.lines.length + 4 * k; const df = wrapFit(ctx, desc, s => FM(700, s), dSize, 16 * k, tw, 1, 0); text(ctx, df.lines[0], tx, ty + df.size * 0.95, { font: FM(700, df.size), fill: T.heroSoft }); }
  drawBadge(ctx, 62 * k, 70 * k, 66 * k, p, T, info.pct);
  ctx.restore();
}

// ───────── producto estrella (vertical, para historias y cartel) ─────────
/** Precio del producto estrella vertical ubicado donde se eligió. Devuelve el techo para el nombre. */
function precioMovidoHeroV(ctx, p, info, T, k, w, h, big, a, limT) {
  const tw = w - 80 * k, nota = notaDe(p), mpV = chipCard(p), filas = [];
  if (nota) { const fs = 22 * k * Math.min(1.3, PRECIO_CFG.insignia || 1); filas.push({ h: 26 * k, items: [piezaTexto(ctx, nota, FM(800, fs), fs, T.heroInk, tw)] }); }
  const pz = mpV != null ? piezaPromo(ctx, 44 * k, mpV) : null, unidad = p.unidad ? String(p.unidad).toUpperCase() : '';
  const pu = unidad ? piezaChip(ctx, unidad, 40 * k, { font: FB(900, 28 * k), padX: 16 * k, tracking: 1, fill: T.price, ink: T.priceInk || '#fff' }) : null;
  const resto = (pz ? pz.w + 12 * k : 0) + (pu ? pu.w + 12 * k : 0);
  const ps = PRECIO_CFG.ahorro && info.ahorro > 0 && !p.noAhorro ? piezaAhorro(ctx, 44 * k * tamAhorro(), info.ahorro, w - 60 * k - resto) : null;
  const chips = [pz, ps, pu].filter(Boolean);
  if (chips.length) filas.push({ h: Math.max(ps ? ps.h : 0, pz || pu ? 44 * k : 0), items: chips, sep: 12 * k, gap: nota ? 10 * k : 0 });
  const [plateH, pOp] = altoPlaca(140 * k * big), pp = piezaPlaca(ctx, w - 120 * k, plateH, info.F || { int: '0', dec: '' }, T, pOp, {});
  filas.push({ h: pp.h, items: [pp], gap: filas.length ? 10 * k : 0 });
  if (info.R) { const aS = (PRECIO_CFG.grande ? 46 : 38) * k; filas.push({ h: aS * 0.8, items: [piezaAntes(ctx, info.R, aS, T, { color: T.heroSoft, priceColor: T.heroInk, maxW: tw })], gap: 16 * k }); }
  return bloqueFilas(filas, { x: 40 * k, w: tw, bottom: h - 26 * k, lim: { l: 16 * k, r: w - 16 * k, t: limT, b: h - 12 * k } }, a, w, h).top;
}
function drawHeroV(ctx, r, p, T, env, o = {}) {
  const { x, y, w, h } = r, k = o.k || Math.min(w / 1000, h / 740), info = infoProducto(p), big = o.big || 1;
  ctx.save(); ctx.translate(x, y);
  shadow(ctx, 'rgba(60,15,0,.5)', 34 * k, 0, 16 * k);
  rrPath(ctx, 0, 0, w, h, 42 * k); ctx.fillStyle = vGrad(ctx, 0, h, T.hero); ctx.fill(); noShadow(ctx);
  ctx.save(); rrPath(ctx, 0, 0, w, h, 42 * k); ctx.clip();
  const icx = w * 0.5, icy = h * 0.32;
  const rg = ctx.createRadialGradient(icx, icy, 0, icx, icy, w * 0.9); rg.addColorStop(0, T.heroRay); rg.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = rg; raysPath(ctx, icx, icy, w * 1.4, 36, 0.1); ctx.fill();
  ctx.restore();
  rrPath(ctx, 7 * k, 7 * k, w - 14 * k, h - 14 * k, 36 * k); ctx.lineWidth = 6 * k; ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.stroke();
  // reparto vertical (de abajo hacia arriba): nota, "ahorrás", placa, precio anterior, descripción, nombre y foto
  const cx = w / 2, tw = w - 80 * k, nameTop0 = h * (o.imgFrac || 0.455);
  let anteTop, a = 'centro';
  if (precioMovido()) { a = alinPrecio('centro'); anteTop = precioMovidoHeroV(ctx, p, info, T, k, w, h, big, a, nameTop0 + 40 * k); }
  else {
    const nota = notaDe(p), mpV = chipCard(p);
    const [plateH, pOp] = altoPlaca(140 * k * big), hasAhorro = PRECIO_CFG.ahorro && info.ahorro > 0 && !p.noAhorro, unidadV = p.unidad ? String(p.unidad).toUpperCase() : '';
    const at = tamAhorro(), hA = hasAhorro ? 44 * k * at : 0;
    const padB = 26 * k, gapS = 10 * k, notaH = nota ? 26 * k : 0, chipH = Math.max(hA, (unidadV || mpV != null) ? 44 * k : 0);
    const stackTop = h - padB - (notaH ? notaH + gapS : 0), chipTop = stackTop - chipH;
    const plateBottom = (chipH ? chipTop : stackTop) - gapS;
    const maxW = w - 120 * k;
    const price = info.F || { int: '0', dec: '' };
    const pw = drawPlateMeasure(ctx, maxW, plateH, price, pOp);
    const plate = drawPlate(ctx, cx - pw / 2, plateBottom, maxW, plateH, price, T, pOp);
    if (nota) text(ctx, nota, cx, h - padB - 5 * k, { font: FM(800, 22 * k * Math.min(1.3, PRECIO_CFG.insignia || 1)), fill: T.heroInk, align: 'center', maxW: tw });
    const aS = (PRECIO_CFG.grande ? 46 : 38) * k, anteBase = plate.y - 16 * k;
    anteTop = info.R ? anteBase - aS * 0.9 : plate.y - 8 * k;
    if (info.R) { const aw = Math.min(tw, measureAntes(ctx, info.R, aS)); drawAntes(ctx, cx - aw / 2, anteBase, info.R, aS, T, { color: T.heroSoft, priceColor: T.heroInk, maxW: tw }); }
    if (chipH) {                                                 // fila centrada: condición de pago + "AHORRÁS $X" + unidad
      const aTxt = hasAhorro ? 'AHORRÁS ' + pesos(info.ahorro) : '', f2 = FB(900, 28 * k), mpTxt = mpV ? mpV.label + mpV.price : '', hM = 44 * k;
      ctx.font = FB(900, 32 * k * at); let wa = aTxt ? measure(ctx, aTxt, 0.5) + 40 * k * at : 0;
      ctx.font = f2; const wu = unidadV ? measure(ctx, unidadV, 1) + 32 * k : 0;
      const wm = mpTxt ? promoChipAncho(ctx, hM, mpV.label, mpV.price) : 0, gp = 12 * k, n = (wa ? 1 : 0) + (wu ? 1 : 0) + (wm ? 1 : 0);
      const resto = wu + wm + gp * Math.max(0, n - 1), s = wa ? Math.min(1, Math.max(0.4, (w - 60 * k - resto) / wa)) : 1;   // si no entra todo, se achica el «AHORRÁS»
      wa *= s;
      let x0 = cx - (wa + resto) / 2;
      if (mpTxt) { drawPromoChip(ctx, x0, chipTop + (chipH - hM) / 2, hM, mpV.label, mpV.price, mpV.P); x0 += wm + gp; }
      if (aTxt) { const hh = hA * s; chip(ctx, x0, chipTop + (chipH - hh) / 2, aTxt, { h: hh, font: FB(900, 32 * k * at * s), align: 'left', padX: 20 * k * at * s, tracking: 0.5, fill: ['#2F2F2F', '#1A1A1A'], ink: '#FFE066' }); x0 += wa + gp; }
      if (unidadV) chip(ctx, x0, chipTop + (chipH - 40 * k) / 2, unidadV, { h: 40 * k, font: f2, align: 'left', padX: 16 * k, tracking: 1, fill: T.price, ink: T.priceInk || '#fff' });
    }
  }
  const desc = String(p.desc || '').trim(), nm = String(p.nombre || '').trim().toUpperCase();
  const dSize = 30 * k, descH = desc ? dSize * 1.3 + 4 * k : 0, [nx, nAl] = a === 'izquierda' ? [40 * k, 'left'] : a === 'derecha' ? [w - 40 * k, 'right'] : [cx, 'center'];
  // el nombre, chico y pegado al precio: lo que se ve primero es la foto y el precio (la foto usa todo el resto)
  let wf, nameTop;
  if (precioMovido()) { nameTop = nameTop0; wf = fitBlock(ctx, nm || 'NOMBRE DEL PRODUCTO', s => FB(900, s), 92 * k * big, 34 * k, tw, 2, anteTop - 4 * k - nameTop - descH, 0.92, 0.5); }
  else { wf = fitBlock(ctx, nm || 'NOMBRE DEL PRODUCTO', s => FB(900, s), 56 * k * big * (CUADROS_CFG.nombre || 1), 26 * k, tw, 2, h * 0.15 * (CUADROS_CFG.nombre || 1), 0.92, 0.5); nameTop = anteTop - 10 * k - descH - wf.size * 0.92 * wf.lines.length; }
  const imgBottom = nameTop - 8 * k;
  const z = { x: w * 0.12, y: 16 * k, w: w * 0.76, h: imgBottom - 16 * k };   // la foto queda dentro del cuadro
  drawProductArt(ctx, p, z, T, env, { k, glowColor: 'rgba(255,255,255,.85)', glowR: 0.5, lim: [10 * k, w - 10 * k] });
  if (o.sticker !== false) stickerEstrella(ctx, 26 * k, 24 * k, k, T, -0.05, 1.1);
  wf.lines.forEach((ln, i) => text(ctx, ln, nx, nameTop + wf.size * 0.82 + i * wf.size * 0.92, { font: FB(900, wf.size), fill: nm ? T.heroInk : 'rgba(60,25,10,.35)', align: nAl, tracking: 0.5 }));
  if (desc) { const ty = nameTop + wf.size * 0.92 * wf.lines.length + 4 * k; const df = wrapFit(ctx, desc, s => FM(700, s), dSize, 18 * k, tw, 1, 0); text(ctx, df.lines[0], nx, ty + df.size * 0.95, { font: FM(700, df.size), fill: T.heroSoft, align: nAl }); }
  drawBadge(ctx, w - 100 * k, 120 * k, 82 * k, p, T, info.pct);
  ctx.restore();
}
function drawPlateMeasure(ctx, maxW, H, price, o = {}) { return plateGeom(ctx, maxW, H, price, o).w; }

// ───────── pie: datos del local + banda legal ─────────
const RE_ALCOHOL = /\b(vino|vinos|fernet|cerveza|cervezas|vodka|whisky|whiskey|gin|ron|licor|aperitivo|espumante|champagne|champa[ñn]a|sidra|tequila|amargo|malbec|cabernet|aperol|campari|gancia)\b/i;
/** Leyenda de alcohol: automática (según los nombres), siempre o nunca. */
function alcoholActivo(S) {
  const m = (S.legal || {}).alcohol;
  if (m === true || m === 'si') return true;
  if (m === false || m === 'no') return false;
  const L = LAYOUTS[S.formato] || LAYOUTS.a4_8;
  if (L.grupo === 'coleccion') return !!(S.coleccion && S.coleccion.alcohol);   // las fotos no se pueden leer: lo marca la persona
  return (S.productos || []).slice(0, L.slots).some(p => !productoVacio(p) && RE_ALCOHOL.test((p.nombre || '') + ' ' + (p.desc || '')));
}
/** Líneas obligatorias de la banda legal (Res. SIyC 446/2025 + leyenda de alcohol, Ley 24.788). */
function legalParrafos(S) {
  const C = S.comercio || {}, out = [];
  const canal = String(C.consulta || '').trim();
  out.push('PARA MÁS INFORMACIÓN O LIMITACIONES APLICABLES CONSULTE EN ' + (canal ? canal.toUpperCase() : 'EL LOCAL'));
  if (alcoholActivo(S)) out.push('BEBER CON MODERACIÓN. PROHIBIDA SU VENTA A MENORES DE 18 AÑOS.');
  return out;
}
/** Letra chica del pie: vigencia, condición de la promo y lo legal, en pocas palabras y sin repetir datos. */
function letraChica(S) {
  const L = S.legal || {}, C = S.comercio || {}, V = S.vigencia || {};
  if (L.letraChica === false) return '';
  const colec = (LAYOUTS[S.formato] || {}).grupo === 'coleccion', partes = [];
  const vig = rangoLargo(V.desde, V.hasta), stock = String(L.stock || '').trim();
  if (colec) partes.push(String((S.coleccion || {}).pie || '').trim());
  else if (vig) partes.push(`Válido ${vig}${V.agotar ? ' o hasta agotar stock' + (stock ? ' (' + stock + ')' : '') : ''}.`);
  else if (V.agotar) partes.push('Válido hasta agotar stock' + (stock ? ' (' + stock + ')' : '') + '.');
  const PF = !colec && typeof promoInfo === 'function' ? promoInfo(S) : null;
  if (PF) partes.push(promoLetraChica(PF, S));
  else if (!colec) partes.push('Precios finales en pesos argentinos.');
  if (!colec && hayCondicionPorProducto(S)) partes.push('Cada descuento vale solo con el medio de pago indicado debajo del precio.');
  if (hayCuotas(S, PF)) partes.push(LEYENDA_CUOTAS);
  if (C.legales && !colec) partes.push(String(C.legales).trim());
  const id = [C.razon, C.cuit ? 'CUIT ' + C.cuit : ''].filter(Boolean).join(' · ');
  if (id) partes.push(id + '.');
  return partes.filter(Boolean).join(' ');
}
/** Calcula alturas del pie. kind: 'print' (A4: capitales ≥ 4 mm) | 'post' | 'story'. */
function footerPlan(ctx, S, W, H, kind = 'print', o = {}) {
  const L = S.legal || {};
  const infoH = (o.infoH || (kind === 'print' ? 172 : kind === 'post' ? 150 : 156)) * CAB_CFG.pie;   // dirección, Facebook y QR: alto regulable
  const pagosH = pagosVisibles(S).length ? (kind === 'print' ? 62 : kind === 'post' ? 58 : 64) : 0;
  if (!L.banda) return { infoH, pagosH, legalH: 0, total: infoH + pagosH, lines: [], fs: 0, lh: 0, kind };
  const mm = W / 210, tam = clamp(+L.bandaTam || 1, 0.6, 1.8);
  const fs = (kind === 'print' ? Math.round(6.1 * mm) : kind === 'post' ? 25 : 27) * tam, pad = Math.round(W * 0.025), lh = fs * 1.14;
  const lines = [];
  legalParrafos(S).forEach(par => { const wf = wrapFit(ctx, par, s => FB(800, fs, false), fs, fs, W - pad * 2, 3, 0.4); lines.push(...wf.lines); });
  const legalH = Math.max(H * 0.05, lines.length * lh + fs * 0.85);
  return { infoH, pagosH, legalH, total: pagosH + infoH + legalH, lines, fs, lh, kind };
}
function drawFooter(ctx, S, T, env, r, plan, o = {}) {
  const { x, w } = r, hI = plan.infoH, k = o.k || hI / 190, C = S.comercio || {};
  let y = r.y;
  if (plan.pagosH) { drawFranjaPagos(ctx, S, T, { x, y, w, h: plan.pagosH }, o.m || 44); y += plan.pagosH; }
  ctx.save(); ctx.translate(x, y);
  ctx.fillStyle = T.footer; ctx.fillRect(0, 0, w, hI);
  ctx.save(); ctx.beginPath(); ctx.rect(0, 0, w, hI); ctx.clip(); ctx.strokeStyle = T.stripe; ctx.lineWidth = 14 * k;
  for (let i = -hI; i < w + hI; i += 46 * k) { ctx.beginPath(); ctx.moveTo(i, hI); ctx.lineTo(i + hI, 0); ctx.stroke(); } ctx.restore();
  ctx.fillStyle = vGrad(ctx, 0, 9 * k, T.accent); ctx.fillRect(0, 0, w, 9 * k);
  const M = o.m || 44;
  const qrs = [];
  const numWA = waNumero(C.whatsapp), impreso = plan.kind !== 'post' && plan.kind !== 'story', pedir = numWA ? waLink(numWA, `Hola ${C.nombre || ''}! Quiero hacer un pedido: `) : '';
  if (o.qr !== false && pedir && impreso && qrMatrix(pedir)) qrs.push({ url: pedir, l1: 'PEDÍ POR', l2: 'WHATSAPP', c2: '#4BE07F' });   // en el folleto impreso: escanear y pedir (en redes va el número)
  if (o.qr !== false && C.waCanal && qrMatrix(C.waCanal)) qrs.push({ url: C.waCanal, l1: 'SUMATE A NUESTRO', l2: 'CANAL DE WHATSAPP', c2: '#4BE07F' });
  if (o.qr !== false && C.qrUrl && qrMatrix(C.qrUrl)) qrs.push({ url: C.qrUrl, l1: 'SEGUINOS EN', l2: 'FACEBOOK', c2: '#8DB8FF' });
  qrs.splice(2);                                                   // como mucho dos QR: el texto de al lado tiene que seguir leyéndose
  // en redes el QR no se puede escanear desde el mismo celular: con el nombre del canal, al lado dice cómo buscarlo
  const canal = String(C.canalNombre || '').trim(), buscar = canal && qrs.length === 1 && qrs[0].url === C.waCanal && (plan.kind === 'post' || plan.kind === 'story');
  let qrS = Math.min(hI - 66 * k, 134 * k), gapQ = 16 * k, grpW = qrs.length * qrS + Math.max(0, qrs.length - 1) * gapQ, gx = w - M - grpW, qy = hI - qrS - 13 * k;
  if (buscar) {
    qrS = Math.min(hI - 34 * k, 150 * k); qy = (hI - qrS) / 2 + 4 * k;
    const f1 = FM(800, 14.5 * k), f2 = FB(900, 30 * k), nom = canal.toUpperCase();
    ctx.font = f1; const w1 = measure(ctx, 'BUSCÁ EN WHATSAPP EL CANAL', 1 * k); ctx.font = f2; const w2 = Math.min(measure(ctx, nom, 0.4), 300 * k), lw2 = Math.max(w1, w2);
    gx = w - M - qrS; const tx = gx - 16 * k;
    drawQR(ctx, gx, qy, qrS, C.waCanal);
    iconWhatsApp(ctx, tx - lw2 / 2, qy + qrS * 0.2, 15 * k);
    text(ctx, 'BUSCÁ EN WHATSAPP EL CANAL', tx, qy + qrS * 0.2 + 30 * k, { font: f1, fill: T.footerInk, align: 'right', tracking: 1 * k });
    text(ctx, nom, tx, qy + qrS * 0.2 + 66 * k, { font: f2, fill: '#4BE07F', align: 'right', tracking: 0.4, maxW: 300 * k });
    gx = tx - lw2;
  } else qrs.forEach((q, n) => {
    const qx = gx + n * (qrS + gapQ);
    drawQR(ctx, qx, qy, qrS, q.url);
    text(ctx, q.l1, qx + qrS / 2, qy - 21 * k, { font: FM(800, 12 * k), fill: T.footerInk, align: 'center', tracking: 1 * k, maxW: qrS + 14 * k });
    text(ctx, q.l2, qx + qrS / 2, qy - 7 * k, { font: FM(900, 13.5 * k), fill: q.c2, align: 'center', tracking: 0.6 * k, maxW: qrS + 14 * k });
  });
  const hasQR = qrs.length > 0;
  const lx = M, lw = (hasQR ? gx - 26 * k : w - M) - lx;
  let cy = 30 * k;
  const addr = String(C.direccion || '').trim();
  if (addr) {
    iconPin(ctx, lx + 14 * k, cy - 3 * k, 10.5 * k, T.accent[1], T.footer);
    const wLab = text(ctx, 'UBICACIÓN', lx + 38 * k, cy + 3 * k, { font: FM(800, 13.5 * k), fill: T.accent[1], tracking: 2.2 * k });
    const hor = String(C.horario || '').trim();                     // el horario, en el mismo renglón
    if (hor) text(ctx, '·  ' + hor, lx + 38 * k + wLab + 10 * k, cy + 3 * k, { font: FM(700, 13.5 * k), fill: T.footerInk, maxW: lw - 48 * k - wLab });
    const fs = fitSize(ctx, addr, s => FM(800, s), 29 * k, 15 * k, lw - 38 * k, 0);
    text(ctx, addr, lx + 38 * k, cy + 3 * k + fs * 1.18, { font: FM(800, fs), fill: T.footerInk });
    cy += 3 * k + fs * 1.18;
  }
  const fb = String(C.facebook || '').trim(), tel = String(C.telefono || '').trim() || (waNumero(C.whatsapp) ? String(C.whatsapp).trim() : '');
  const ry = cy + 40 * k; let rx = lx;
  if (fb) {
    iconFacebook(ctx, rx + 16 * k, ry - 9.5 * k, 16 * k);
    const lab = 'Facebook: ' + fb, fs = fitSize(ctx, lab, s => FM(800, s), 27 * k, 14 * k, (tel ? lw * 0.58 : lw) - 44 * k, 0);
    const tw = text(ctx, lab, rx + 42 * k, ry, { font: FM(800, fs), fill: T.footerInk });
    rx += 42 * k + tw + 30 * k;
  }
  if (tel) {
    iconWhatsApp(ctx, rx + 16 * k, ry - 9.5 * k, 16 * k);
    const fs = fitSize(ctx, tel, s => FM(800, s), 27 * k, 14 * k, lx + lw - rx - 44 * k, 0);
    text(ctx, tel, rx + 42 * k, ry, { font: FM(800, fs), fill: T.footerInk });
  }
  const legal = letraChica(S);
  if (legal) {
    const lf = wrapFit(ctx, legal, s => FM(500, s), 15.5 * k, 10.5 * k, lw, 2, 0);
    const ly = hI - 15 * k - (lf.lines.length - 1) * lf.size * 1.25;
    lf.lines.forEach((ln, i) => text(ctx, ln, lx, ly + i * lf.size * 1.25, { font: FM(500, lf.size), fill: T.footerSoft }));
  }
  // banda legal (ancho completo, ≥5% del alto)
  if (plan.legalH) {
    const by = hI, bh = plan.legalH;
    ctx.fillStyle = vGrad(ctx, by, by + bh, T.accent); ctx.fillRect(0, by, w, bh);
    ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.fillRect(0, by, w, 3 * (plan.fs / 36));
    const n = plan.lines.length, th = n * plan.lh, y0 = by + (bh - th) / 2 + plan.fs * 0.80;
    plan.lines.forEach((ln, i) => text(ctx, ln, w / 2, y0 + i * plan.lh, { font: FB(800, plan.fs, false), fill: T.accentInk, align: 'center', tracking: 0.4 }));
  }
  ctx.restore();
  HITS.push({ tipo: 'pie', i: 0, x, y: r.y + plan.pagosH, w, h: plan.infoH + plan.legalH });   // clic en el pie: lleva a «Pie del folleto»
}

/** Franja de abajo de las historias. Ahí la app pone su barra para responder: va una invitación a responder
 *  (antes quedaba una franja oscura vacía y, mandada por chat, la imagen parecía sin terminar). */
const CTA_HISTORIA = 'RESPONDÉ Y TE LO SEPARAMOS';
function franjaHistoria(ctx, S, T, W, H, SAFE) {
  const y = H - SAFE - 2, Hs = S.historia || {};
  ctx.save(); ctx.fillStyle = T.footer; ctx.fillRect(0, y, W, SAFE + 2);
  const txt = String(Hs.cta || '').trim().toUpperCase() || CTA_HISTORIA;
  if (Hs.ver !== false) {
    const bh = 86, by = y + 18, bx = 34, bw = W - 68, ic = 30;
    shadow(ctx, 'rgba(0,0,0,.35)', 14, 0, 5); rrPath(ctx, bx, by, bw, bh, bh / 2); ctx.fillStyle = vGrad(ctx, by, by + bh, T.price); ctx.fill(); noShadow(ctx);
    rrPath(ctx, bx + 4, by + 4, bw - 8, bh - 8, bh / 2 - 4); ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 2.5; ctx.stroke();
    const fs = fitSize(ctx, txt, s => FB(900, s), 48, 24, bw - 150 - ic * 2, 0.5);
    ctx.font = FB(900, fs); const tw = measure(ctx, txt, 0.5), gx = W / 2 - (tw + ic * 2 + 18) / 2, cy = by + bh / 2;
    globoChat(ctx, gx + ic, cy, ic, T.priceInk || '#fff');
    text(ctx, txt, gx + ic * 2 + 18, cy + fs * 0.36, { font: FB(900, fs), fill: T.priceInk || '#fff', tracking: 0.5, shadow: [T.priceShadow || 'rgba(0,0,0,.3)', 2, 0, 2] });
    ctx.fillStyle = T.accent[0]; const fy = by + bh + 16;                      // flechita hacia la barra para responder
    ctx.beginPath(); ctx.moveTo(W / 2 - 22, fy); ctx.lineTo(W / 2 + 22, fy); ctx.lineTo(W / 2, fy + 18); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}
/** Globito de chat (para «respondé…»). */
function globoChat(ctx, cx, cy, r, fill) {
  ctx.save(); ctx.fillStyle = fill; ctx.beginPath(); ctx.ellipse(cx, cy - r * 0.08, r, r * 0.8, 0, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.moveTo(cx - r * 0.55, cy + r * 0.45); ctx.lineTo(cx - r * 0.85, cy + r * 1.0); ctx.lineTo(cx - r * 0.05, cy + r * 0.62); ctx.closePath(); ctx.fill();
  ctx.restore();
  ctx.save(); ctx.fillStyle = 'rgba(0,0,0,.28)'; [-0.42, 0, 0.42].forEach(d => { ctx.beginPath(); ctx.arc(cx + d * r, cy - r * 0.08, r * 0.13, 0, TAU); ctx.fill(); }); ctx.restore();
}

// ───────── encabezado ─────────
/** Encabezado con los tamaños elegidos: el logo crece (y empuja lo de abajo) y el cartel del título se achica o
 *  agranda. Lo que gana o pierde el encabezado lo pierden o ganan los cuadros de las ofertas. */
function ajustarCabecera(g, W, maxLogo) {
  const L = RES.logoH, ar = L ? (L.naturalHeight || L.height) / (L.naturalWidth || L.width) : 0.32;
  const logoW = Math.min(g.logoW * CAB_CFG.logo, Math.max(g.logoW, maxLogo)), dLogo = (logoW - g.logoW) * ar;
  const ribbonH = g.ribbonH * CAB_CFG.titulo, dRib = ribbonH - g.ribbonH;
  return { ...g, logoW, subY: g.subY + dLogo, ribbonY: g.ribbonY + dLogo, ribbonH, titleMax: g.titleMax * CAB_CFG.titulo, pillY: g.pillY + dLogo + dRib, selloCy: g.selloCy != null ? g.selloCy + dLogo * 0.4 : g.selloCy };
}
function drawHeaderWide(ctx, W, S, T, g) {
  // logo y subtítulo al centro; el sello (promo) a la derecha, sin tocarse
  g = ajustarCabecera(g, W, W - 2 * g.M - (g.selloR ? 3 * g.selloR + 40 : 0));   // el logo tiene prioridad: el sello se achica hasta 75 %
  if (g.selloR) g = { ...g, selloR: Math.min(g.selloR, (W - 2 * g.M - g.logoW - 40) / 4) };
  const lx = (W - g.logoW) / 2;
  adornos(ctx, [zonaLogo(lx, g.logoY, g.logoW)]);
  const L = RES.logoH;
  if (L) { const lw = g.logoW, lh = lw * (L.naturalHeight || L.height) / (L.naturalWidth || L.width); shadow(ctx, 'rgba(90,25,0,.40)', 18, 0, 8); ctx.drawImage(L, lx, g.logoY, lw, lh); noShadow(ctx); }
  const sub = String(S.subtitulo || '').trim().toUpperCase();
  if (sub) chip(ctx, W / 2, g.subY - g.subSize * 0.35 - g.subSize * 0.86, sub, { h: g.subSize * 1.72, font: FM(800, g.subSize), fill: 'rgba(50,15,3,.92)', ink: T.accent[0], padX: g.subSize * 0.8, tracking: g.subSize * 0.1, align: 'center' });
  const st = selloTexto(S);
  if (st && g.selloR) drawSello(ctx, W - g.M - g.selloR - 6, g.selloCy, g.selloR, st, T);
  if (g.selloR) HITS.push({ tipo: 'sello', i: 0, x: W - g.M - g.selloR * 2 - 6, y: g.selloCy - g.selloR, w: g.selloR * 2, h: g.selloR * 2 });   // clic: editar el sello
  drawRibbon(ctx, g.M, g.ribbonY, W - 2 * g.M, g.ribbonH, S.titulo, T, { max: g.titleMax });
  return drawInfoRow(ctx, W, S, T, { M: g.M, y: g.pillY, h: g.pillH });
}
function drawHeaderStack(ctx, W, S, T, g) {
  g = ajustarCabecera(g, W, W - 2 * g.M - 2 * Math.min(W * 0.1, 130) - 20);
  adornos(ctx, [zonaLogo((W - g.logoW) / 2, g.logoY, g.logoW)]);
  const L = RES.logoH;
  if (L) { const lw = g.logoW, lh = lw * (L.naturalHeight || L.height) / (L.naturalWidth || L.width); shadow(ctx, 'rgba(90,25,0,.40)', 18, 0, 8); ctx.drawImage(L, (W - lw) / 2, g.logoY, lw, lh); noShadow(ctx); }
  const sub = String(S.subtitulo || '').trim().toUpperCase();
  if (sub) chip(ctx, W / 2, g.subY - g.subSize * 0.35 - g.subSize * 0.86, sub, { h: g.subSize * 1.72, font: FM(800, g.subSize), fill: 'rgba(50,15,3,.92)', ink: T.accent[0], padX: g.subSize * 0.8, tracking: g.subSize * 0.1, align: 'center' });
  drawRibbon(ctx, g.M, g.ribbonY, W - 2 * g.M, g.ribbonH, S.titulo, T, { max: g.titleMax });
  const rU = Math.min(W * 0.1, 130); stickerUrgencia(ctx, S, T, W - g.M - rU * 0.9, g.logoY + rU * 0.85, rU);
  return drawInfoRow(ctx, W, S, T, { M: g.M, y: g.pillY, h: g.pillH });
}

// ───────── formatos ─────────
const prodAt = (S, i) => (S.productos && S.productos[i]) || {};

/** Renglones de una grilla: cuántos cuadros lleva cada uno. Llena: todos con cols. Con menos productos (folleto
 *  terminado), los reparte parejo con los renglones más llenos arriba (13 en 4 columnas → 4, 3, 3 y 3). */
function filasGrilla(n, cols, rows) {
  if (n >= cols * rows) return Array(rows).fill(cols);
  const filas = Math.max(1, Math.ceil(n / cols)), base = Math.floor(n / filas), extra = n % filas;
  return Array.from({ length: filas }, (_, f) => base + (f < extra ? 1 : 0));
}

function gridCards(ctx, S, T, env, items, box, cols, rows, gx, gy) {
  const sep = CUADROS_CFG.sep ?? 1; box = conMargen(box); gx *= sep; gy *= sep;   // separación y margen elegidos en "Cuadros de productos"
  // En el folleto terminado no quedan casilleros vacíos: los cuadros con producto se agrandan y ocupan todo el lugar.
  // En pantalla (con guías) se ve la grilla completa, para poder tocar un casillero vacío y elegir el producto.
  const llenos = env.preview ? items : items.filter(i => !productoVacio(prodAt(S, i)));
  if (llenos.length) items = llenos;
  const filas = filasGrilla(items.length, cols, rows), ch = (box.h - gy * (filas.length - 1)) / filas.length;
  // un renglón con menos cuadros los ensancha, pero sin cambiarles la forma (vertical, apaisada o angosta): así las
  // fotos salen parejas en toda la imagen. Si no llegan a todo el ancho, el renglón va centrado.
  const ref = ((box.w - gx * (cols - 1)) / cols) / ((box.h - gy * (rows - 1)) / rows), maxProp = ref < 1.75 ? Math.max(ref, 1.7) : ref <= 3.2 ? Math.max(ref, 3.1) : Infinity;
  const anchoFila = c => Math.min((box.w - gx * (c - 1)) / c, maxProp * ch);
  // Un solo estilo de cuadro en toda la imagen, según el cuadro más angosto: chico o más alto que ancho → foto arriba
  // (vertical); ancho y con lugar para el texto → foto grande a la izquierda con el nombre chico y el precio grande al
  // lado; muy angosto en alto (historias) → apaisado. Y el mismo tamaño de letra en todos: el del cuadro más chico.
  const cwMin = anchoFila(Math.max(...filas)), prop = cwMin / ch, estilo = prop > 3.2 ? 'ancho' : prop >= 1 && cwMin >= 300 ? 'foto' : 'vertical';
  let k = Infinity;
  for (const c of filas) { const cw = anchoFila(c); k = Math.min(k, estilo === 'vertical' ? Math.min(cw / 360, ch / 330) : Math.min(ch / 253, cw / 520)); }
  let n = 0;
  filas.forEach((c, f) => {
    const cw = anchoFila(c), x0 = box.x + (box.w - c * cw - (c - 1) * gx) / 2;
    for (let col = 0; col < c; col++, n++) {
      const i = items[n], r = { x: x0 + col * (cw + gx), y: box.y + f * (ch + gy), w: cw, h: ch };
      const p = prodAt(S, i);
      if (productoVacio(p)) drawEmptyCard(ctx, r, T, env, k);
      else if (estilo === 'ancho' || cw / ch > 3.2) drawCardWide(ctx, r, p, T, env, { aire: gy });
      else if (estilo === 'vertical') drawCardV(ctx, r, p, T, env, { k, aire: gy });
      else drawCard(ctx, r, p, T, env, { k, aire: gy, foto: 0.46 });
      casillero(ctx, env, 'producto', i, r);
    }
  });
}

const LAYOUTS = {
  a4_8: {
    nombre: 'Folleto A4 · 8 ofertas', corto: 'A4 · 8 ofertas', w: 1240, h: 1754, slots: 8, hero: false, pdf: 'A4',
    draw(ctx, S, T, env) {
      const W = 1240, H = 1754, M = 44;
      drawBackground(ctx, W, H, T, 0.3, 0.07, 470);
      const hb = drawHeaderWide(ctx, W, S, T, { M, logoW: 640, logoY: 34, subY: 236, subSize: 25, subMaxW: 640, selloR: 142, selloCy: 160, ribbonY: 272, ribbonH: 124, titleMax: 118, pillY: 410, pillH: 52 });
      const fp = footerPlan(ctx, S, W, H, 'print'), fh = fp.total, top = hb + 30, bottom = H - fh - 26;
      gridCards(ctx, S, T, env, [0, 1, 2, 3, 4, 5, 6, 7], { x: M, y: top, w: W - 2 * M, h: bottom - top }, 2, 4, 22, 18);
      if (T.decorTop) T.decorTop(ctx, W, H, 470, { footerY: H - fh });
      drawFooter(ctx, S, T, env, { x: 0, y: H - fh, w: W }, fp);
    },
  },
  a4_star4: {
    nombre: 'Folleto A4 · Estrella + 4', corto: 'A4 · Estrella + 4', w: 1240, h: 1754, slots: 5, hero: true, pdf: 'A4',
    draw(ctx, S, T, env) {
      const W = 1240, H = 1754, M = 44;
      drawBackground(ctx, W, H, T, 0.3, 0.07, 470);
      const hb = drawHeaderWide(ctx, W, S, T, { M, logoW: 640, logoY: 34, subY: 236, subSize: 25, subMaxW: 640, selloR: 142, selloCy: 160, ribbonY: 272, ribbonH: 124, titleMax: 118, pillY: 410, pillH: 52 });
      const fp = footerPlan(ctx, S, W, H, 'print'), fh = fp.total, bottom = H - fh - 26;
      const sep = CUADROS_CFG.sep ?? 1, heroY = hb + 46, heroH = altoEstrella(Math.min(540, Math.max(380, (bottom - heroY) * 0.5)), bottom - heroY, 30 * sep + 2 * 130);
      const caja = conMargen({ x: M, y: heroY, w: W - 2 * M, h: heroH });
      drawHeroH(ctx, caja, prodAt(S, 0), T, env, { techo: heroY - hb - 6 }); casillero(ctx, env, 'producto', 0, caja);
      const top = heroY + heroH + 30 * sep;
      gridCards(ctx, S, T, env, [1, 2, 3, 4], { x: M, y: top, w: W - 2 * M, h: bottom - top }, 2, 2, 22, 18);
      if (T.decorTop) T.decorTop(ctx, W, H, 470, { footerY: H - fh });
      drawFooter(ctx, S, T, env, { x: 0, y: H - fh, w: W }, fp);
    },
  },
  post_star4: {
    nombre: 'Post Facebook / Instagram · Estrella + 4', corto: 'Post 4:5 · Estrella + 4', w: 1080, h: 1350, slots: 5, hero: true,
    draw(ctx, S, T, env) {
      const W = 1080, H = 1350, M = 34;
      drawBackground(ctx, W, H, T, 0.3, 0.06, 360);
      const hb = drawHeaderWide(ctx, W, S, T, { M, logoW: 470, logoY: 24, subY: 178, subSize: 19, subMaxW: 470, selloR: 100, selloCy: 112, ribbonY: 208, ribbonH: 96, titleMax: 90, pillY: 312, pillH: 42 });
      const fp = footerPlan(ctx, S, W, H, 'post'), fh = fp.total, bottom = H - fh - 18;
      const sep = CUADROS_CFG.sep ?? 1, heroY = hb + 40, heroH = altoEstrella(Math.min(372, Math.max(280, (bottom - heroY) * 0.46)), bottom - heroY, 22 * sep + 2 * 110);
      const caja = conMargen({ x: M, y: heroY, w: W - 2 * M, h: heroH });
      drawHeroH(ctx, caja, prodAt(S, 0), T, env, { techo: heroY - hb - 6 }); casillero(ctx, env, 'producto', 0, caja);
      const top = heroY + heroH + 22 * sep;
      gridCards(ctx, S, T, env, [1, 2, 3, 4], { x: M, y: top, w: W - 2 * M, h: bottom - top }, 2, 2, 18, 14);
      if (T.decorTop) T.decorTop(ctx, W, H, 360, { footerY: H - fh });
      drawFooter(ctx, S, T, env, { x: 0, y: H - fh, w: W }, fp, { m: 34 });
    },
  },
  story_3: {
    nombre: 'Historia / Estado WhatsApp · Estrella + 2', corto: 'Historia 9:16 · Estrella + 2', w: 1080, h: 1920, slots: 3, hero: true,
    draw(ctx, S, T, env) {
      const W = 1080, H = 1920, M = 40, SAFE = 176;                 // abajo queda libre: ahí Instagram/WhatsApp ponen su barra
      drawBackground(ctx, W, H, T, 0.5, 0.05, 540);
      const hb = drawHeaderStack(ctx, W, S, T, { M, logoW: 600, logoY: 112, subY: 322, subSize: 22, ribbonY: 350, ribbonH: 104, titleMax: 98, pillY: 486, pillH: 48 });
      const fp = footerPlan(ctx, S, W, H, 'story'), fh = fp.total, fy = H - SAFE - fh;
      franjaHistoria(ctx, S, T, W, H, SAFE);
      const heroY = hb + 28, bottom = fy - 22;
      const sep = CUADROS_CFG.sep ?? 1, heroH = altoEstrella(Math.min(640, Math.max(430, (bottom - heroY) * 0.6)), bottom - heroY, 22 * sep + 2 * 100);
      const caja = conMargen({ x: M, y: heroY, w: W - 2 * M, h: heroH });
      drawHeroV(ctx, caja, prodAt(S, 0), T, env, { techo: heroY - hb - 6 }); casillero(ctx, env, 'producto', 0, caja);
      const top = heroY + heroH + 22 * sep;
      gridCards(ctx, S, T, env, [1, 2], { x: M, y: top, w: W - 2 * M, h: bottom - top }, 1, 2, 22, 16);
      drawFooter(ctx, S, T, env, { x: 0, y: fy, w: W }, fp, { m: 40 });
      if (env.preview) {                                           // guía solo en pantalla: no sale en el archivo
        [[0, 112, 'ZONA QUE TAPA LA APP'], [H - SAFE, SAFE, 'ZONA QUE TAPA LA APP']].forEach(([zy, zh, t]) => {
          ctx.save(); ctx.fillStyle = 'rgba(20,10,5,.42)'; ctx.fillRect(0, zy, W, zh);
          ctx.setLineDash([16, 10]); ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 3; ctx.strokeRect(6, zy + 6, W - 12, zh - 12); ctx.setLineDash([]);
          text(ctx, t, W / 2, zy + zh / 2 + 8, { font: FM(800, 22), fill: 'rgba(255,255,255,.9)', align: 'center', tracking: 3 }); ctx.restore();
        });
      }
    },
  },
  cartel_1: {
    nombre: 'Cartel · 1 producto (A4)', corto: 'Cartel · 1 producto', w: 1240, h: 1754, slots: 1, hero: true, pdf: 'A4',
    draw(ctx, S, T, env) {
      const W = 1240, H = 1754, M = 44;
      drawBackground(ctx, W, H, T, 0.5, 0.06);
      drawHeaderStack(ctx, W, S, T, { M, logoW: 640, logoY: 36, subY: 232, subSize: 25, ribbonY: 262, ribbonH: 124, titleMax: 118, pillY: 402, pillH: 52 });
      const fp = footerPlan(ctx, S, W, H, 'print'), fh = fp.total, bottom = H - fh - 30, top = 520;
      drawHeroV(ctx, conMargen({ x: M, y: top, w: W - 2 * M, h: bottom - top }), prodAt(S, 0), T, env, { big: 1.12, imgFrac: 0.52, pop: 36 });
      drawFooter(ctx, S, T, env, { x: 0, y: H - fh, w: W }, fp);
    },
  },
};

function renderFlyer(canvas, S, opts = {}) {
  const L = LAYOUTS[S.formato] || LAYOUTS.a4_8, scale = opts.scale || 1;
  canvas.width = Math.round(L.w * scale); canvas.height = Math.round(L.h * scale);
  const ctx = canvas.getContext('2d');
  ctx.setTransform(scale, 0, 0, scale, 0, 0); setSC(scale);
  ctx.clearRect(0, 0, L.w, L.h); HITS = [];
  const T = THEMES[S.tema] || THEMES.naranja;
  const PR = S.precio || {};
  PRECIO_CFG = { antes: PR.antes || 'antes', ahorro: PR.ahorro !== false, grande: PR.grande !== false, insignia: clamp(+PR.insignia || 1.3, 0.8, 2), placa: clamp(+PR.placa || 1, 0.7, 1.6), ahorroTam: clamp(+PR.ahorroTam || 1, 0.6, 2),
    porUnidad: PR.porUnidad !== false, fraccion: fraccionDe(PR.fraccion) };
  const CU = S.cuadros || {};
  CUADROS_CFG = { sep: clamp(Number.isFinite(+CU.sep) && CU.sep !== '' && CU.sep != null ? +CU.sep : 1, 0, 3), margen: clamp(+CU.margen || 1, 0.3, 2.5), foto: clamp(+CU.foto || 1, 0.6, 1.5), estrella: clamp(+CU.estrella || 1, 0.6, 1.5),
    alinear: ['izquierda', 'centro', 'derecha'].includes(CU.alinear) ? CU.alinear : 'auto', dx: clamp(+CU.dx || 0, -40, 40), dy: clamp(+CU.dy || 0, -20, 50), nombre: clamp(+CU.nombre || 1, 0.7, 2) };
  const CB = S.cabecera || {};
  CAB_CFG = { logo: clamp(+CB.logo || 1.35, 0.7, 1.7), titulo: clamp(+CB.titulo || 0.85, 0.5, 1.3), pie: clamp(+CB.pie || 0.75, 0.5, 1.2) };
  const PI = typeof promoInfo === 'function' ? promoInfo(S) : null;
  ETQ_PRECIO = PR.etiqueta != null ? PR.etiqueta : 'FINAL';        // la placa dice FINAL (o lo que se elija): es el precio que paga el cliente
  PROMO_ACT = PI && PI.verPrecio ? PI : null;                      // debajo de cada precio: la condición de pago (o la cuota)
  S_DIBUJO = S; LIMPIO = modoLimpio(S); ADORNO_PEND = null;
  L.draw(ctx, S, T, { getImg: opts.getImg || (() => null), preview: !!opts.preview, activo: opts.activo || null, W: L.w, H: L.h });
  if (!opts.exportar) LAST_HITS = HITS;                          // las imágenes que se exportan no pisan los casilleros de la vista previa
}
