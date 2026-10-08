// ───────────────────────── colección de productos (sin precios): "acá tenemos todo para tus recetas" ─────────────────────────

/** Cinta de varias líneas (mensaje largo). */
function drawRibbonMulti(ctx, x, y, w, h, str, T) {
  const fold = h * 0.24, drop = h * 0.14;
  ctx.save();
  ctx.fillStyle = T.ribbonTail;
  ctx.beginPath(); ctx.moveTo(x, y + drop); ctx.lineTo(x + fold + 10, y + drop); ctx.lineTo(x + fold + 10, y + h + drop); ctx.lineTo(x, y + h + drop); ctx.lineTo(x + fold * 0.42, y + h / 2 + drop); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(x + w, y + drop); ctx.lineTo(x + w - fold - 10, y + drop); ctx.lineTo(x + w - fold - 10, y + h + drop); ctx.lineTo(x + w, y + h + drop); ctx.lineTo(x + w - fold * 0.42, y + h / 2 + drop); ctx.closePath(); ctx.fill();
  ctx.fillStyle = T.ribbonFold;
  ctx.beginPath(); ctx.moveTo(x + fold, y + h); ctx.lineTo(x + fold, y + h + drop); ctx.lineTo(x + fold + drop, y + h); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(x + w - fold, y + h); ctx.lineTo(x + w - fold, y + h + drop); ctx.lineTo(x + w - fold - drop, y + h); ctx.closePath(); ctx.fill();
  shadow(ctx, 'rgba(50,8,0,.42)', 20, 0, 10);
  ctx.fillStyle = vGrad(ctx, y, y + h, T.ribbon); ctx.fillRect(x + fold, y, w - fold * 2, h); noShadow(ctx);
  ctx.fillStyle = 'rgba(255,255,255,.15)'; ctx.fillRect(x + fold, y, w - fold * 2, h * 0.3);
  ctx.fillStyle = 'rgba(0,0,0,.16)'; ctx.fillRect(x + fold, y + h - 5, w - fold * 2, 5);
  const t = String(str || '').toUpperCase(), bw = w - fold * 2 - 60;
  const f = fitBlock(ctx, t, s => FB(900, s), h * 0.5, 22, bw, 2, h * 0.84, 0.98, 1.2);
  const lh = f.size * 0.98, y0 = y + (h - lh * f.lines.length) / 2 + f.size * 0.8;
  f.lines.forEach((ln, i) => text(ctx, ln, x + w / 2, y0 + i * lh, { font: FB(900, f.size), fill: T.ribbonInk, align: 'center', stroke: T.ribbonStroke, strokeW: Math.max(2, f.size * 0.045), tracking: 1.2, shadow: ['rgba(0,0,0,.30)', 4, 0, 4] }));
  ctx.restore();
  return { bottom: y + h + drop };
}

/** Dibuja las fotos de productos apiladas en `box`. Con fondo transparente se ven recortadas; si no, en un marco. */
function drawFotosColeccion(ctx, S, T, env, box) {
  const fotos = ((S.coleccion || {}).fotos || []).map((f, i) => ({ f, i, img: env.getImg(f) })).filter(it => it.img);
  if (!fotos.length) {
    HITS.push({ tipo: 'foto', i: 0, x: box.x + 20, y: box.y + 20, w: box.w - 40, h: box.h - 40 });
    if (env.preview) {
      ctx.save(); rrPath(ctx, box.x + 20, box.y + 20, box.w - 40, box.h - 40, 34); ctx.fillStyle = 'rgba(255,255,255,.10)'; ctx.fill(); ctx.setLineDash([20, 14]); ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.stroke(); ctx.setLineDash([]);
      text(ctx, 'ELEGÍ LAS FOTOS DE TUS PRODUCTOS', box.x + box.w / 2, box.y + box.h / 2, { font: FM(800, 30), fill: 'rgba(255,255,255,.85)', align: 'center', tracking: 3 }); ctx.restore();
    }
    return;
  }
  const gap = 14, asp = fotos.map(it => (it.img.naturalWidth || it.img.width) / (it.img.naturalHeight || it.img.height));
  const sumInv = asp.reduce((a, v) => a + 1 / v, 0), Wc = Math.min(box.w, (box.h - gap * (fotos.length - 1)) / sumInv);
  const total = sumInv * Wc + gap * (fotos.length - 1);
  let y = box.y + (box.h - total) / 2;
  fotos.forEach((it, n) => {
    const w = Wc, h = Wc / asp[n], x = box.x + (box.w - w) / 2;
    const corte = it.f.alfa || it.f.quitarFondo;
    ctx.save();
    const gl = ctx.createRadialGradient(x + w / 2, y + h * 0.55, 0, x + w / 2, y + h * 0.55, w * 0.62);
    gl.addColorStop(0, 'rgba(255,255,255,.34)'); gl.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gl; ctx.save(); ctx.translate(x + w / 2, y + h * 0.55); ctx.scale(1, h / (w * 0.9)); ctx.beginPath(); ctx.arc(0, 0, w * 0.62, 0, TAU); ctx.fill(); ctx.restore();
    if (corte) { shadow(ctx, 'rgba(60,0,35,.38)', 22, 0, 12); ctx.drawImage(it.img, x, y, w, h); noShadow(ctx); }
    else {
      shadow(ctx, 'rgba(60,0,35,.45)', 26, 0, 14); rrPath(ctx, x, y, w, h, 30); ctx.fillStyle = '#fff'; ctx.fill(); noShadow(ctx);
      ctx.save(); rrPath(ctx, x + 10, y + 10, w - 20, h - 20, 22); ctx.clip(); ctx.drawImage(it.img, x + 10, y + 10, w - 20, h - 20); ctx.restore();
    }
    const tit = String(it.f.titulo || '').trim();
    if (tit) chip(ctx, x + 6, y - 6, tit.toUpperCase(), { h: 40, font: FB(900, 26), fill: T.sello, ink: '#fff', padX: 18, tracking: 1.2, rot: -0.025 });
    ctx.restore();
    casillero(ctx, env, 'foto', it.i, { x, y, w, h });
    y += h + gap;
  });
}

function layoutColeccion(ctx, S, T, env, kind) {
  const C = S.coleccion || {};
  const [W, H] = { a4: [1240, 1754], post: [1080, 1350], story: [1080, 1920] }[kind];
  const P = { a4: { M: 44, logoW: 470, logoY: 16, chipY: 146, chipH: 38, ribY: 198, ribH: 152, foot: 'print' },
    post: { M: 34, logoW: 380, logoY: 12, chipY: 118, chipH: 32, ribY: 162, ribH: 128, foot: 'post' },
    story: { M: 40, logoW: 480, logoY: 114, chipY: 246, chipH: 36, ribY: 296, ribH: 158, foot: 'story' } }[kind];
  const SAFE = kind === 'story' ? 176 : 0;
  drawBackground(ctx, W, H, T, 0.5, 0.08, P.ribY + P.ribH);
  const L = RES.logoH;
  if (L) { const lw = P.logoW, lh = lw * (L.naturalHeight || L.height) / (L.naturalWidth || L.width); shadow(ctx, 'rgba(90,25,0,.40)', 18, 0, 8); ctx.drawImage(L, (W - lw) / 2, P.logoY, lw, lh); noShadow(ctx); }
  // etiquetas: ocasión + para quién
  const oc = String(C.ocasion || '').trim().toUpperCase(), kk = String(C.kicker || '').trim().toUpperCase();
  const fs = P.chipH * 0.5, trk = fs * 0.08; ctx.font = FM(800, fs);
  const w1 = oc ? measure(ctx, oc, trk) + fs * 2.2 : 0, w2 = kk ? measure(ctx, kk, trk) + fs * 2.2 : 0, gp = fs * 0.9, tot = w1 + w2 + (w1 && w2 ? gp : 0);
  let cx = (W - tot) / 2;
  if (oc) { chip(ctx, cx, P.chipY, oc, { h: P.chipH, font: FM(800, fs), fill: T.accent, ink: T.accentInk, padX: fs * 1.1, tracking: trk }); cx += w1 + gp; }
  if (kk) chip(ctx, cx, P.chipY, kk, { h: P.chipH, font: FM(800, fs), fill: 'rgba(50,15,3,.92)', ink: T.accent[0], padX: fs * 1.1, tracking: trk });
  const rb = drawRibbonMulti(ctx, P.M, P.ribY, W - 2 * P.M, P.ribH, C.mensaje || 'Aquí tenemos todos los productos para tus recetas', T);
  const fp = footerPlan(ctx, S, W, H, P.foot, { infoH: kind === 'a4' ? 150 : kind === 'post' ? 138 : 146 }), fy = H - SAFE - fp.total;
  if (SAFE) { ctx.fillStyle = T.footer; ctx.fillRect(0, H - SAFE - 2, W, SAFE + 2); }
  const top = rb.bottom + 18, bottom = fy - 10;
  drawFotosColeccion(ctx, S, T, env, { x: P.M, y: top, w: W - 2 * P.M, h: bottom - top });
  if (T.decorTop) T.decorTop(ctx, W, H, P.ribY + P.ribH, { footerY: fy });
  drawFooter(ctx, S, T, env, { x: 0, y: fy, w: W }, fp, { m: P.M });
  if (SAFE && env.preview) {
    [[0, 112], [H - SAFE, SAFE]].forEach(([zy, zh]) => { ctx.save(); ctx.fillStyle = 'rgba(20,10,5,.42)'; ctx.fillRect(0, zy, W, zh); ctx.setLineDash([16, 10]); ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 3; ctx.strokeRect(6, zy + 6, W - 12, zh - 12); ctx.setLineDash([]);
      text(ctx, 'ZONA QUE TAPA LA APP', W / 2, zy + zh / 2 + 8, { font: FM(800, 22), fill: 'rgba(255,255,255,.9)', align: 'center', tracking: 3 }); ctx.restore(); });
  }
}

Object.assign(LAYOUTS, {
  coleccion_a4: { nombre: 'Colección de productos · A4 (sin precios)', corto: 'A4 · Colección', w: 1240, h: 1754, slots: 0, hero: false, pdf: 'A4', grupo: 'coleccion', temas: ['fecha', 'marca'], draw: (c, S, T, e) => layoutColeccion(c, S, T, e, 'a4') },
  coleccion_post: { nombre: 'Colección de productos · Post 4:5', corto: 'Post 4:5 · Colección', w: 1080, h: 1350, slots: 0, hero: false, grupo: 'coleccion', temas: ['fecha', 'marca'], draw: (c, S, T, e) => layoutColeccion(c, S, T, e, 'post') },
  coleccion_story: { nombre: 'Colección de productos · Historia 9:16', corto: 'Historia · Colección', w: 1080, h: 1920, slots: 0, hero: false, grupo: 'coleccion', temas: ['fecha', 'marca'], draw: (c, S, T, e) => layoutColeccion(c, S, T, e, 'story') },
});
