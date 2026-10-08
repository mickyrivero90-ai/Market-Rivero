// ───────────────────────── formatos nuevos: 10 ofertas y producto destacado ─────────────────────────

/** Cartel inclinado de ancho completo con el mensaje principal (OFERTA IMPERDIBLE, LIQUIDACIÓN…). */
function drawBanner(ctx, W, y, h, str, T, o = {}) {
  const t = String(str || '').trim().toUpperCase(); if (!t) return;
  const M = o.M || 44;
  ctx.save(); ctx.translate(W / 2, y + h / 2); ctx.rotate(o.rot ?? -0.03); ctx.translate(-W / 2, -(y + h / 2));
  const x0 = -80, x1 = W + 80, ac = Math.max(7, h * 0.06);
  shadow(ctx, 'rgba(0,0,0,.55)', 26, 0, 14);
  ctx.fillStyle = vGrad(ctx, y, y + h, T.ribbon); ctx.fillRect(x0, y, x1 - x0, h); noShadow(ctx);
  ctx.fillStyle = vGrad(ctx, y - ac, y, T.accent); ctx.fillRect(x0, y - ac, x1 - x0, ac);
  ctx.fillStyle = vGrad(ctx, y + h, y + h + ac, T.accent); ctx.fillRect(x0, y + h, x1 - x0, ac);
  ctx.fillStyle = 'rgba(255,255,255,.14)'; ctx.fillRect(x0, y, x1 - x0, h * 0.34);
  const bw = W - 2 * M - 30, size = fitSize(ctx, t, s => FB(900, s), o.max || h * 0.92, 24, bw, 2);
  text(ctx, t, W / 2, y + h / 2 + size * 0.35, { font: FB(900, size), fill: T.ribbonInk, align: 'center', stroke: T.ribbonStroke, strokeW: Math.max(3, size * 0.05), tracking: 2,
    extrude: { n: Math.round(size * 0.05), color: 'rgba(0,0,0,.38)', dx: 0.4, dy: 1 }, shadow: ['rgba(0,0,0,.35)', 5, 0, 5] });
  ctx.restore();
}

/** Folleto A4 de grilla (10, 12 o 16 ofertas). */
function layoutA4Grid(ctx, S, T, env, cols = 2, rows = 5) {
  const W = 1240, H = 1754, M = 44, n = cols * rows;
  drawBackground(ctx, W, H, T, 0.3, 0.06, 392);
  const hb = drawHeaderWide(ctx, W, S, T, { M, logoW: 540, logoY: 28, subY: 198, subSize: 21, subMaxW: 540, selloR: promoInfo(S) ? 122 : 112, selloCy: promoInfo(S) ? 126 : 118, ribbonY: 226, ribbonH: 104, titleMax: 100, pillY: 352, pillH: 46 });
  const fp = footerPlan(ctx, S, W, H, 'print'), fh = fp.total, top = hb + 22, bottom = H - fh - 22;
  gridCards(ctx, S, T, env, Array.from({ length: n }, (_, i) => i), { x: M, y: top, w: W - 2 * M, h: bottom - top }, cols, rows, cols > 2 ? 16 : 22, 14);
  if (T.decorTop) T.decorTop(ctx, W, H, 392, { footerY: H - fh });
  drawFooter(ctx, S, T, env, { x: 0, y: H - fh, w: W }, fp);
}
const layoutA4x10 = (ctx, S, T, env) => layoutA4Grid(ctx, S, T, env, 2, 5);

/** Post 4:5 con 4 productos grandes (2 × 2): el más legible para Facebook, Instagram y el canal de WhatsApp. */
function layoutPost4(ctx, S, T, env) {
  const W = 1080, H = 1350, M = 34;
  drawBackground(ctx, W, H, T, 0.3, 0.06, 330);
  const hb = drawHeaderWide(ctx, W, S, T, { M, logoW: 430, logoY: 22, subY: 162, subSize: 18, subMaxW: 430, selloR: 92, selloCy: 102, ribbonY: 190, ribbonH: 88, titleMax: 84, pillY: 290, pillH: 40 });
  const fp = footerPlan(ctx, S, W, H, 'post'), fh = fp.total, top = hb + 18, bottom = H - fh - 16;
  gridCards(ctx, S, T, env, [0, 1, 2, 3], { x: M, y: top, w: W - 2 * M, h: bottom - top }, 2, 2, 16, 14);
  if (T.decorTop) T.decorTop(ctx, W, H, 330, { footerY: H - fh });
  drawFooter(ctx, S, T, env, { x: 0, y: H - fh, w: W }, fp, { m: M });
}

/** Folleto de mensaje (sin productos): un anuncio grande, p. ej. "10 % en todos los productos pagando con QR". */
function layoutMensaje(ctx, S, T, env, kind) {
  const Mj = S.mensaje || {}, PF = promoInfo(S);
  const [W, H] = { a4: [1240, 1754], post: [1080, 1350], story: [1080, 1920] }[kind];
  const P = { a4: { M: 44, logoW: 560, logoY: 30, kY: 206, kH: 44, ribY: 268, ribH: 190, foot: 'print' },
    post: { M: 34, logoW: 420, logoY: 20, kY: 154, kH: 36, ribY: 204, ribH: 150, foot: 'post' },
    story: { M: 40, logoW: 520, logoY: 120, kY: 296, kH: 42, ribY: 356, ribH: 200, foot: 'story' } }[kind];
  const SAFE = kind === 'story' ? 176 : 0;
  drawBackground(ctx, W, H, T, 0.5, 0.1, P.ribY + P.ribH);
  const L = RES.logoH;
  if (L) { const lh = P.logoW * (L.naturalHeight || L.height) / (L.naturalWidth || L.width); shadow(ctx, 'rgba(90,25,0,.40)', 18, 0, 8); ctx.drawImage(L, (W - P.logoW) / 2, P.logoY, P.logoW, lh); noShadow(ctx); }
  const kk = String(Mj.kicker || '').trim().toUpperCase();
  if (kk) chip(ctx, W / 2, P.kY, kk, { h: P.kH, font: FM(900, P.kH * 0.5), fill: 'rgba(50,15,3,.92)', ink: T.accent[0], padX: P.kH * 0.6, tracking: P.kH * 0.06, align: 'center' });
  const rb = drawRibbonMulti(ctx, P.M, P.ribY, W - 2 * P.M, P.ribH, Mj.titulo || 'Aprovechá nuestras promos', T);
  const fp = footerPlan(ctx, S, W, H, P.foot), fy = H - SAFE - fp.total;
  if (SAFE) { ctx.fillStyle = T.footer; ctx.fillRect(0, H - SAFE - 2, W, SAFE + 2); }
  // tarjeta central
  const cx = P.M + 10, cy = rb.bottom + 34, cw = W - 2 * cx, chh = fy - 34 - cy, k = Math.min(cw / 1130, chh / 900);
  ctx.save(); ctx.translate(cx, cy);
  shadow(ctx, 'rgba(60,15,0,.5)', 34 * k, 0, 16 * k); rrPath(ctx, 0, 0, cw, chh, 44 * k); ctx.fillStyle = vGrad(ctx, 0, chh, T.hero); ctx.fill(); noShadow(ctx);
  ctx.save(); rrPath(ctx, 0, 0, cw, chh, 44 * k); ctx.clip();
  const rg = ctx.createRadialGradient(cw / 2, chh * 0.3, 0, cw / 2, chh * 0.3, cw * 0.8); rg.addColorStop(0, T.heroRay); rg.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = rg; raysPath(ctx, cw / 2, chh * 0.3, cw * 1.3, 36, 0.1); ctx.fill(); ctx.restore();
  rrPath(ctx, 8 * k, 8 * k, cw - 16 * k, chh - 16 * k, 38 * k); ctx.lineWidth = 6 * k; ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.stroke();
  // de arriba hacia abajo: número grande, palabra, condición, cuotas, texto, fechas
  const grande = String(Mj.grande || (PF && PF.pct ? PF.pct + '%' : '')).trim().toUpperCase();
  const grande2 = String(Mj.grande2 != null && Mj.grande2 !== '' ? Mj.grande2 : grande ? 'DE DESCUENTO' : '').trim().toUpperCase();
  const cond = String(Mj.condicion || (PF ? PF.texto : '')).trim().toUpperCase(), cuotas = PF && PF.cuotas ? PF.cuotas + ' CUOTAS SIN INTERÉS' : '';
  const cuerpo = String(Mj.texto || '').trim(), fecha = fechaPillTexto(S);
  const pad = 50 * k, tw = cw - pad * 2;
  const hFecha = fecha ? 70 * k : 0, hCond = cond ? 96 * k : 0, hCuo = cuotas ? 74 * k : 0, hG2 = grande2 ? 78 * k : 0;
  const tf = cuerpo ? wrapFit(ctx, cuerpo, s => FM(800, s), (grande ? 46 : 64) * k, 22 * k, tw, grande ? 3 : 5, 0) : { lines: [], size: 0 };
  const hTxt = tf.lines.length * tf.size * 1.25;
  const fijo = hG2 + hCond + hCuo + hTxt + hFecha + 36 * k * 4;
  const hG = grande ? Math.max(120 * k, Math.min(chh * 0.42, chh - fijo - 40 * k)) : 0;
  const usado = hG + fijo, y0 = Math.max(30 * k, (chh - usado) / 2);
  let yy = y0;
  if (grande) {
    const sz = fitSize(ctx, grande, s => FB(900, s), hG * 1.18, 40 * k, tw, 0);
    text(ctx, grande, cw / 2, yy + hG * 0.92, { font: FB(900, sz), gradient: T.price, gh: sz * 0.75, align: 'center', stroke: '#FFFFFF', strokeW: sz * 0.04, extrude: { n: Math.round(sz * 0.04), color: 'rgba(0,0,0,.25)', dx: 0.5, dy: 1 }, shadow: ['rgba(80,0,10,.35)', 6, 0, 6] });
    yy += hG + 20 * k;
  }
  if (grande2) { const sz = fitSize(ctx, grande2, s => FB(900, s), 74 * k, 24 * k, tw, 2); text(ctx, grande2, cw / 2, yy + sz * 0.78, { font: FB(900, sz), fill: T.heroInk, align: 'center', tracking: 2 }); yy += hG2 + 16 * k; }
  if (cond) {
    const Pc = PF || { c: T.sello, icon: 'tag', ink: '#fff' }, h = 84 * k, ic = h * 0.62, fs = fitSize(ctx, cond, s => FM(900, s), h * 0.4, 14 * k, tw - h * 1.6, 1);
    ctx.font = FM(900, fs); const w = Math.min(tw, measure(ctx, cond, 1) + ic + h * 0.9), x = (cw - w) / 2;
    shadow(ctx, 'rgba(0,30,70,.4)', 14 * k, 0, 7 * k); rrPath(ctx, x, yy, w, h, h / 2); ctx.fillStyle = vGrad(ctx, yy, yy + h, Pc.c); ctx.fill(); noShadow(ctx);
    promoIcono(ctx, Pc.icon, x + h * 0.26, yy + (h - ic) / 2, ic, Pc.c[1]);
    text(ctx, cond, x + h * 0.26 + ic + h * 0.22, yy + h / 2 + fs * 0.36, { font: FM(900, fs), fill: '#fff', tracking: 1, maxW: w - ic - h * 0.7 });
    yy += hCond + 16 * k;
  }
  if (cuotas) { const h = 60 * k; chip(ctx, cw / 2, yy, cuotas, { h, font: FB(900, h * 0.62), fill: (PF && PF.c2) || T.accent, ink: (PF && PF.ink) || T.accentInk, padX: h * 0.5, align: 'center', tracking: 1 }); yy += hCuo + 12 * k; }
  if (tf.lines.length) { tf.lines.forEach((ln, i) => text(ctx, ln, cw / 2, yy + tf.size * 0.9 + i * tf.size * 1.25, { font: FM(800, tf.size), fill: T.heroInk, align: 'center' })); yy += hTxt + 26 * k; }
  if (fecha) drawDatePill(ctx, cw / 2, yy, 58 * k, fecha, T);
  ctx.restore();
  if (T.decorTop) T.decorTop(ctx, W, H, P.ribY + P.ribH, { footerY: fy });
  drawFooter(ctx, S, T, env, { x: 0, y: fy, w: W }, fp, { m: P.M });
  if (SAFE && env.preview) zonasApp(ctx, W, H, SAFE);
}
/** Guía de Historias (solo en pantalla): franjas que tapa la app. */
function zonasApp(ctx, W, H, SAFE) {
  [[0, 112], [H - SAFE, SAFE]].forEach(([zy, zh]) => { ctx.save(); ctx.fillStyle = 'rgba(20,10,5,.42)'; ctx.fillRect(0, zy, W, zh); ctx.setLineDash([16, 10]); ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 3; ctx.strokeRect(6, zy + 6, W - 12, zh - 12); ctx.setLineDash([]);
    text(ctx, 'ZONA QUE TAPA LA APP', W / 2, zy + zh / 2 + 8, { font: FM(800, 22), fill: 'rgba(255,255,255,.9)', align: 'center', tracking: 3 }); ctx.restore(); });
}

/** Un solo producto, a toda página, con cartel de impacto. kind: 'a4' | 'post' | 'story'. */
function layoutDestacado(ctx, S, T, env, kind) {
  const D = S.destacado || {};
  const dims = { a4: [1240, 1754], post: [1080, 1350], story: [1080, 1920] }[kind], W = dims[0], H = dims[1];
  const P = {
    a4: { M: 44, logoW: 400, logoY: 26, bY: 160, bH: 170, bMax: 150, bR: 122, bCy: 160, infoY: 354, infoH: 48, heroGap: 28, foot: 'print' },
    post: { M: 34, logoW: 330, logoY: 18, bY: 122, bH: 132, bMax: 116, bR: 96, bCy: 120, infoY: 276, infoH: 40, heroGap: 22, foot: 'post' },
    story: { M: 40, logoW: 400, logoY: 120, bY: 296, bH: 176, bMax: 140, bR: 110, bCy: 312, infoY: 512, infoH: 46, heroGap: 26, foot: 'story' },
  }[kind];
  const SAFE = kind === 'story' ? 176 : 0;
  drawBackground(ctx, W, H, T, 0.5, 0.2, P.bY + P.bH);
  const L = RES.logoH;
  if (L) { const lh = P.logoW * (L.naturalHeight || L.height) / (L.naturalWidth || L.width); shadow(ctx, 'rgba(0,0,0,.45)', 16, 0, 8); ctx.drawImage(L, P.M + 6, P.logoY, P.logoW, lh); noShadow(ctx); }
  drawBanner(ctx, W, P.bY, P.bH, D.mensaje || 'OFERTA IMPERDIBLE', T, { M: P.M, max: P.bMax });
  const hb = drawInfoRow(ctx, W, S, T, { M: P.M, y: P.infoY, h: P.infoH });
  const fp = footerPlan(ctx, S, W, H, P.foot), fh = fp.total, fy = H - SAFE - fh;
  if (SAFE) { ctx.fillStyle = T.footer; ctx.fillRect(0, H - SAFE - 2, W, SAFE + 2); }
  const heroY = hb + P.heroGap, bottom = fy - 24;
  const caja = conMargen({ x: P.M, y: heroY, w: W - 2 * P.M, h: bottom - heroY });
  casillero(ctx, env, 'producto', 0, caja);
  drawHeroV(ctx, caja, prodAt(S, 0), T, env, { big: kind === 'post' ? 0.9 : 1.02, imgFrac: kind === 'post' ? 0.45 : 0.46, pop: 26, sticker: false });
  if (D.mensaje2) drawBadge(ctx, P.M + P.bR * 0.98 + 10, heroY + P.bR * 1.02 + 8, P.bR, { etiqueta: D.mensaje2 }, T, 0, -0.16, 1);
  if (T.decorTop) T.decorTop(ctx, W, H, P.bY + P.bH, { footerY: fy });
  drawFooter(ctx, S, T, env, { x: 0, y: fy, w: W }, fp, { m: P.M });
  if (SAFE && env.preview) {
    [[0, 112], [H - SAFE, SAFE]].forEach(([zy, zh]) => { ctx.save(); ctx.fillStyle = 'rgba(20,10,5,.42)'; ctx.fillRect(0, zy, W, zh); ctx.setLineDash([16, 10]); ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 3; ctx.strokeRect(6, zy + 6, W - 12, zh - 12); ctx.setLineDash([]);
      text(ctx, 'ZONA QUE TAPA LA APP', W / 2, zy + zh / 2 + 8, { font: FM(800, 22), fill: 'rgba(255,255,255,.9)', align: 'center', tracking: 3 }); ctx.restore(); });
  }
}

const TODOS_LOS_TEMAS = ['marca', 'fecha', 'impacto'];
Object.assign(LAYOUTS, {
  a4_10: { nombre: 'Folleto A4 · 10 ofertas', corto: 'A4 · 10 ofertas', w: 1240, h: 1754, slots: 10, hero: false, pdf: 'A4', grupo: 'folleto', temas: TODOS_LOS_TEMAS, draw: (c, S, T, e) => layoutA4Grid(c, S, T, e, 2, 5) },
  a4_10_tema: { nombre: 'Folleto A4 · 10 ofertas', corto: 'A4 · 10 ofertas', w: 1240, h: 1754, slots: 10, hero: false, pdf: 'A4', grupo: 'folleto', oculto: true, temas: TODOS_LOS_TEMAS, draw: (c, S, T, e) => layoutA4Grid(c, S, T, e, 2, 5) },
  a4_12: { nombre: 'Folleto A4 · 12 ofertas', corto: 'A4 · 12 ofertas', w: 1240, h: 1754, slots: 12, hero: false, pdf: 'A4', grupo: 'folleto', temas: TODOS_LOS_TEMAS, draw: (c, S, T, e) => layoutA4Grid(c, S, T, e, 3, 4) },
  a4_16: { nombre: 'Folleto A4 · 16 ofertas', corto: 'A4 · 16 ofertas', w: 1240, h: 1754, slots: 16, hero: false, pdf: 'A4', grupo: 'folleto', temas: TODOS_LOS_TEMAS, draw: (c, S, T, e) => layoutA4Grid(c, S, T, e, 4, 4) },
  post_4: { nombre: 'Post Facebook / Instagram · 4 ofertas', corto: 'Post 4:5 · 4 ofertas', w: 1080, h: 1350, slots: 4, hero: false, grupo: 'redes', temas: TODOS_LOS_TEMAS, draw: (c, S, T, e) => layoutPost4(c, S, T, e) },
  destacado_a4: { nombre: 'Un solo producto · A4 (liquidación, efectivo)', corto: 'A4 · 1 producto', w: 1240, h: 1754, slots: 1, hero: true, pdf: 'A4', grupo: 'unico', temas: ['impacto', 'marca', 'fecha'], draw: (c, S, T, e) => layoutDestacado(c, S, T, e, 'a4') },
  destacado_post: { nombre: 'Un solo producto · Post 4:5', corto: 'Post 4:5 · 1 producto', w: 1080, h: 1350, slots: 1, hero: true, grupo: 'unico', temas: ['impacto', 'marca', 'fecha'], draw: (c, S, T, e) => layoutDestacado(c, S, T, e, 'post') },
  destacado_story: { nombre: 'Un solo producto · Historia 9:16', corto: 'Historia · 1 producto', w: 1080, h: 1920, slots: 1, hero: true, grupo: 'unico', temas: ['impacto', 'marca', 'fecha'], draw: (c, S, T, e) => layoutDestacado(c, S, T, e, 'story') },
  mensaje_a4: { nombre: 'Mensaje · A4 (anuncio sin productos)', corto: 'A4 · Mensaje', w: 1240, h: 1754, slots: 0, hero: false, pdf: 'A4', grupo: 'mensaje', temas: ['fecha', 'marca', 'impacto'], draw: (c, S, T, e) => layoutMensaje(c, S, T, e, 'a4') },
  mensaje_post: { nombre: 'Mensaje · Post 4:5', corto: 'Post 4:5 · Mensaje', w: 1080, h: 1350, slots: 0, hero: false, grupo: 'mensaje', temas: ['fecha', 'marca', 'impacto'], draw: (c, S, T, e) => layoutMensaje(c, S, T, e, 'post') },
  mensaje_story: { nombre: 'Mensaje · Historia 9:16', corto: 'Historia · Mensaje', w: 1080, h: 1920, slots: 0, hero: false, grupo: 'mensaje', temas: ['fecha', 'marca', 'impacto'], draw: (c, S, T, e) => layoutMensaje(c, S, T, e, 'story') },
});
// formatos que ya existían: agrupados y con todas las temáticas disponibles
Object.assign(LAYOUTS.a4_8, { grupo: 'folleto', temas: TODOS_LOS_TEMAS });
Object.assign(LAYOUTS.a4_star4, { grupo: 'folleto', temas: TODOS_LOS_TEMAS });
Object.assign(LAYOUTS.post_star4, { grupo: 'redes', temas: TODOS_LOS_TEMAS });
Object.assign(LAYOUTS.story_3, { grupo: 'redes', temas: TODOS_LOS_TEMAS });
delete LAYOUTS.cartel_1;
const MAX_SLOTS = 16;

/** Versiones de un mismo folleto según el destino: en redes van menos productos por imagen (se reparten en varias) para que se lean. */
const DESTINOS = {
  a4: { nombre: 'Imprimir en hoja A4', detalle: 'PDF A4 + imagen a 300 dpi', icono: '🖨' },
  post: { nombre: 'Publicación de Facebook / Instagram', detalle: '1080 × 1350 (4:5)', icono: '📰' },
  canal: { nombre: 'Canal de WhatsApp y chats', detalle: '1080 × 1350 en alta calidad', icono: '📢' },
  story: { nombre: 'Estado de WhatsApp / Historia de Facebook e Instagram', detalle: '1080 × 1920 (9:16)', icono: '📱' },
  story1: { nombre: 'Estados e Historias · UN PRODUCTO POR IMAGEN', detalle: '1080 × 1920, una imagen por cada producto del folleto', icono: '🧩', individual: true },
  post1: { nombre: 'Facebook y canal de WhatsApp · UN PRODUCTO POR IMAGEN', detalle: '1620 × 2025, una imagen por cada producto del folleto', icono: '🧩', individual: true },
};
const FAMILIA = {
  folleto: { a4: null, post: 'post_4', canal: 'post_4', story: 'story_3', story1: 'destacado_story', post1: 'destacado_post' },
  redes: { a4: 'a4_10', post: 'post_4', canal: 'post_4', story: 'story_3', story1: 'destacado_story', post1: 'destacado_post' },
  unico: { a4: 'destacado_a4', post: 'destacado_post', canal: 'destacado_post', story: 'destacado_story' },
  coleccion: { a4: 'coleccion_a4', post: 'coleccion_post', canal: 'coleccion_post', story: 'coleccion_story' },
  mensaje: { a4: 'mensaje_a4', post: 'mensaje_post', canal: 'mensaje_post', story: 'mensaje_story' },
};
/** Arma las imágenes para un destino: [{formato, productos (índices), pagina, total}]. */
function planDestino(S, dest) {
  const L = LAYOUTS[S.formato] || LAYOUTS.a4_10, fam = FAMILIA[L.grupo] || FAMILIA.folleto;
  let f = fam[dest]; if (f === null) f = L.pdf === 'A4' ? S.formato : 'a4_10';
  if (f === undefined) return [];                                   // este destino no corresponde a este tipo de folleto
  const LF = LAYOUTS[f], individual = !!(DESTINOS[dest] || {}).individual;
  if (!LF.slots || L.grupo === 'unico') return [{ formato: f, productos: null, pagina: 1, total: 1 }];
  // productos con contenido, en el orden del folleto (los del formato de origen)
  const fuente = L.grupo === 'redes' ? MAX_SLOTS : L.slots;
  const idx = S.productos.slice(0, fuente).map((p, i) => (productoVacio(p) ? -1 : i)).filter(i => i >= 0);
  if (!idx.length) return [{ formato: f, productos: [], pagina: 1, total: 1 }];
  if (individual) return idx.map((i, n) => ({ formato: f, productos: [i], pagina: n + 1, total: idx.length, individual: true, nombre: String(S.productos[i].nombre || '').trim() }));
  const out = []; for (let i = 0; i < idx.length; i += LF.slots) out.push(idx.slice(i, i + LF.slots));
  return out.map((prods, n) => ({ formato: f, productos: prods, pagina: n + 1, total: out.length }));
}
/** Estado para dibujar una página de un destino (sin tocar el original). */
function estadoParaPagina(S, pg) {
  const T = { ...S, formato: pg.formato };
  if (pg.productos) T.productos = [...pg.productos.map(i => S.productos[i]), ...Array.from({ length: MAX_SLOTS }, () => ({}))];
  // un producto por imagen sacado de un folleto de varios: el cartel grande lleva el título del folleto (no "OFERTA IMPERDIBLE")
  if (pg.individual && (LAYOUTS[S.formato] || {}).grupo !== 'unico') T.destacado = { mensaje: S.titulo || 'Ofertas de la semana', mensaje2: '' };
  return T;
}
