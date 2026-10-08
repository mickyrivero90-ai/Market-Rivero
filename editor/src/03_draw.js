// ───────────────────────── primitivas de dibujo (canvas 2D) ─────────────────────────
let SC = 1;                                   // escala de exportación: las sombras de canvas no escalan solas
const setSC = v => { SC = v; };
const TAU = Math.PI * 2;

const FM = (w, s) => `${w} ${s}px "RM Mont", system-ui, sans-serif`;                              // Montserrat
const FB = (w, s, it = true) => `${it ? 'italic ' : ''}${w} ${s}px "RM Barlow", "Arial Narrow", sans-serif`;   // Barlow Condensed

function shadow(ctx, color, blur, ox = 0, oy = 0) { ctx.shadowColor = color; ctx.shadowBlur = blur * SC; ctx.shadowOffsetX = ox * SC; ctx.shadowOffsetY = oy * SC; }
function noShadow(ctx) { ctx.shadowColor = 'rgba(0,0,0,0)'; ctx.shadowBlur = 0; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0; }

function rrPath(ctx, x, y, w, h, r) {
  const k = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + k, y);
  ctx.arcTo(x + w, y, x + w, y + h, k); ctx.arcTo(x + w, y + h, x, y + h, k);
  ctx.arcTo(x, y + h, x, y, k); ctx.arcTo(x, y, x + w, y, k);
  ctx.closePath();
}
function vGrad(ctx, y0, y1, stops) { const g = ctx.createLinearGradient(0, y0, 0, y1); stops.forEach((c, i) => g.addColorStop(i / (stops.length - 1), c)); return g; }

// ── texto ──
function measure(ctx, str, tracking = 0) {
  if (!tracking) return ctx.measureText(str).width;
  let w = 0; for (const ch of str) w += ctx.measureText(ch).width + tracking;
  return w - tracking;
}
function fillTextT(ctx, str, x, y, tracking, stroke) {
  if (!tracking) { stroke ? ctx.strokeText(str, x, y) : ctx.fillText(str, x, y); return; }
  let cx = x;
  for (const ch of str) { stroke ? ctx.strokeText(ch, cx, y) : ctx.fillText(ch, cx, y); cx += ctx.measureText(ch).width + tracking; }
}
/** Dibuja texto. o: font, fill, stroke, strokeW, align, tracking, shadow:[color,blur,ox,oy], extrude:{n,color,dx,dy}, maxW, gradient:[c0,c1], gh */
function text(ctx, str, x, y, o = {}) {
  if (str == null || str === '') return 0;
  const { font, fill = '#000', stroke, strokeW = 0, align = 'left', tracking = 0, shadow: shd, extrude, maxW, gradient, gh = 0 } = o;
  ctx.save();
  ctx.font = font; ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left'; ctx.lineJoin = 'round'; ctx.miterLimit = 2;
  const w = measure(ctx, str, tracking);
  const sx = maxW && w > maxW ? maxW / w : 1;
  const x0 = align === 'center' ? x - (w * sx) / 2 : align === 'right' ? x - w * sx : x;
  ctx.translate(x0, y); ctx.scale(sx, 1);
  if (stroke && strokeW) {                         // contorno exterior
    ctx.strokeStyle = stroke; ctx.lineWidth = strokeW * 2;
    if (shd) shadow(ctx, ...shd);
    fillTextT(ctx, str, 0, 0, tracking, true); noShadow(ctx);
  }
  if (extrude) {                                   // extrusión 3D hacia abajo-derecha
    ctx.fillStyle = extrude.color;
    for (let i = extrude.n; i >= 1; i--) fillTextT(ctx, str, i * (extrude.dx ?? 0.6), i * (extrude.dy ?? 1), tracking, false);
  }
  if (shd && !(stroke && strokeW)) shadow(ctx, ...shd);
  ctx.fillStyle = gradient ? vGrad(ctx, -gh, 0, gradient) : fill;
  fillTextT(ctx, str, 0, 0, tracking, false);
  ctx.restore();
  return w * sx;
}
/** Mayor tamaño (≤ max) con que `str` entra en maxW. */
function fitSize(ctx, str, mk, max, min, maxW, tracking = 0) {
  for (let s = max; s > min; s -= 1) { ctx.font = mk(s); if (measure(ctx, str, tracking) <= maxW) return s; }
  return min;
}
/** Parte en líneas y busca el tamaño más grande que entra en maxLines líneas de ancho maxW. */
function wrapFit(ctx, str, mk, max, min, maxW, maxLines, tracking = 0) {
  const words = String(str || '').trim().split(/\s+/).filter(Boolean);
  if (!words.length) return { size: max, lines: [] };
  for (let s = max; s >= min; s -= 1) {
    ctx.font = mk(s);
    const lines = []; let cur = '', ok = true;
    for (const w of words) {
      const t = cur ? cur + ' ' + w : w;
      if (measure(ctx, t, tracking) <= maxW) cur = t;
      else { if (cur) lines.push(cur); cur = w; if (measure(ctx, w, tracking) > maxW) ok = false; }
    }
    if (cur) lines.push(cur);
    if (ok && lines.length <= maxLines) {
      if (lines.length === 2 && words.length > 2) {                 // repartir parejo (evita "ML" solo en la 2ª línea)
        let best = lines, bw = Math.max(measure(ctx, lines[0], tracking), measure(ctx, lines[1], tracking));
        for (let i = 1; i < words.length; i++) {
          const a = words.slice(0, i).join(' '), b = words.slice(i).join(' '), m = Math.max(measure(ctx, a, tracking), measure(ctx, b, tracking));
          if (m <= maxW && m < bw - 0.5) { best = [a, b]; bw = m; }
        }
        return { size: s, lines: best };
      }
      return { size: s, lines };
    }
  }
  ctx.font = mk(min);                               // no entra: recorta con puntos suspensivos
  const lines = []; let cur = '', sobra = false;
  for (const w of words) {
    const t = cur ? cur + ' ' + w : w;
    if (!cur || measure(ctx, t, tracking) <= maxW) cur = t;   // una palabra más larga que el renglón va sola (y se recorta abajo)
    else { lines.push(cur); cur = w; if (lines.length === maxLines) { sobra = true; cur = ''; break; } }
  }
  if (cur) lines.push(cur);
  const puntos = s => { while (s.length > 1 && measure(ctx, s + '…', tracking) > maxW) s = s.slice(0, -1); return s.replace(/\s+$/, '') + '…'; };
  const shown = lines.map(l => (measure(ctx, l, tracking) > maxW ? puntos(l) : l));
  if (sobra && !shown[shown.length - 1].endsWith('…')) shown[shown.length - 1] = puntos(shown[shown.length - 1]);
  return { size: min, lines: shown };
}

// ── formas ──
/** Lugares donde no van los adornos del tema (el logo): solo valen mientras se dibujan los adornos (ver adornos()). */
let ZONAS_LIBRES = [];
const libre = (x, y, r) => !ZONAS_LIBRES.length || !ZONAS_LIBRES.some(z => x + r > z.x && x - r < z.x + z.w && y + r > z.y && y - r < z.y + z.h);
function burstPath(ctx, cx, cy, R, r, n, rot = 0) {
  ctx.beginPath();
  if (!libre(cx, cy, R)) return;                                  // adorno sobre el logo: camino vacío (el fill() que sigue no pinta nada)
  for (let i = 0; i < n * 2; i++) {
    const a = rot + (i * Math.PI) / n, rad = i % 2 ? r : R;
    const px = cx + rad * Math.cos(a), py = cy + rad * Math.sin(a);
    i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
  }
  ctx.closePath();
}
function starPath(ctx, cx, cy, R, r, n, rot = -Math.PI / 2) { burstPath(ctx, cx, cy, R, r, n, rot); }
function raysPath(ctx, cx, cy, R, n, rot = 0) {
  ctx.beginPath();
  for (let i = 0; i < n; i += 2) {
    const a0 = rot + (i / n) * TAU, a1 = rot + ((i + 1) / n) * TAU;
    ctx.moveTo(cx, cy); ctx.lineTo(cx + R * Math.cos(a0), cy + R * Math.sin(a0)); ctx.lineTo(cx + R * Math.cos(a1), cy + R * Math.sin(a1)); ctx.closePath();
  }
}
function halftone(ctx, W, H, color, cx, cy, R, step = 24) {
  ctx.fillStyle = color;
  let row = 0;
  for (let y = 0; y < H; y += step * 0.866, row++) {
    for (let x = (row % 2) * step / 2; x < W; x += step) {
      const d = Math.hypot(x - cx, y - cy) / R;
      if (d > 1) continue;
      const r = (1 - d) * step * 0.36;
      if (r < 0.7) continue;
      ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    }
  }
}
/** Chip tipo etiqueta (píldora). Devuelve su ancho. */
function chip(ctx, x, y, str, o = {}) {
  const { h = 34, font = FB(800, 24), fill = ['#FFD84A', '#FFC400'], ink = '#4A1500', padX = 14, tracking = 1, align = 'left', rot = 0, shadowOn = true, stroke } = o;
  ctx.save(); ctx.font = font;
  const w = measure(ctx, str, tracking) + padX * 2;
  const x0 = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x;
  ctx.translate(x0 + w / 2, y + h / 2); ctx.rotate(rot); ctx.translate(-w / 2, -h / 2);
  if (shadowOn) shadow(ctx, 'rgba(60,20,0,.35)', 8, 0, 4);
  rrPath(ctx, 0, 0, w, h, h / 2); ctx.fillStyle = Array.isArray(fill) ? vGrad(ctx, 0, h, fill) : fill; ctx.fill(); noShadow(ctx);
  if (stroke) { ctx.lineWidth = 2; ctx.strokeStyle = stroke; ctx.stroke(); }
  ctx.font = font; ctx.textBaseline = 'alphabetic'; ctx.fillStyle = ink;
  const fs = parseFloat(font.match(/(\d+(\.\d+)?)px/)[1]);
  fillTextT(ctx, str, padX, h / 2 + fs * 0.35, tracking, false);     // mayúsculas centradas: altura de cap ≈ 0,7 em
  ctx.restore();
  return w;
}

// ── íconos ──
function iconPin(ctx, cx, cy, r, fill, hole) {
  ctx.save(); ctx.beginPath();
  ctx.moveTo(cx, cy + r * 2.0);
  ctx.bezierCurveTo(cx - r * 1.7, cy + r * 0.5, cx - r * 1.05, cy - r * 1.05, cx, cy - r * 1.05);
  ctx.bezierCurveTo(cx + r * 1.05, cy - r * 1.05, cx + r * 1.7, cy + r * 0.5, cx, cy + r * 2.0);
  ctx.fillStyle = fill; ctx.fill();
  ctx.beginPath(); ctx.arc(cx, cy - r * 0.05, r * 0.42, 0, TAU); ctx.fillStyle = hole; ctx.fill();
  ctx.restore();
}
function iconFacebook(ctx, cx, cy, r) {
  ctx.save();
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.fillStyle = '#1877F2'; ctx.fill();
  ctx.clip();
  ctx.fillStyle = '#fff'; ctx.font = `800 ${r * 2.05}px "RM Mont", Arial, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  ctx.fillText('f', cx + r * 0.1, cy + r * 1.12);
  ctx.restore();
}
function iconWhatsApp(ctx, cx, cy, r) {
  ctx.save();
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.fillStyle = '#25D366'; ctx.fill();
  ctx.translate(cx - r * 0.62, cy - r * 0.62); ctx.scale((r * 1.24) / 24, (r * 1.24) / 24);
  const p = new Path2D('M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.16-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.88-.79-1.48-1.76-1.65-2.06-.17-.3-.02-.46.13-.6.13-.14.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.61-.92-2.2-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.48 0 1.46 1.07 2.88 1.21 3.07.15.2 2.1 3.2 5.08 4.49.7.3 1.26.49 1.7.62.72.23 1.37.2 1.88.12.57-.09 1.76-.72 2-1.41.25-.7.25-1.29.17-1.41-.07-.12-.27-.2-.57-.35z');
  ctx.fillStyle = '#fff'; ctx.fill(p);
  ctx.restore();
}
function iconCalendar(ctx, x, y, s, ink, bg) {
  ctx.save(); ctx.translate(x, y);
  rrPath(ctx, 0, s * 0.12, s, s * 0.88, s * 0.16); ctx.fillStyle = ink; ctx.fill();
  rrPath(ctx, s * 0.1, s * 0.4, s * 0.8, s * 0.5, s * 0.08); ctx.fillStyle = bg; ctx.fill();
  ctx.fillStyle = ink; rrPath(ctx, s * 0.22, 0, s * 0.14, s * 0.32, s * 0.07); ctx.fill(); rrPath(ctx, s * 0.64, 0, s * 0.14, s * 0.32, s * 0.07); ctx.fill();
  ctx.fillStyle = ink; for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) ctx.fillRect(s * (0.2 + i * 0.25), s * (0.48 + j * 0.2), s * 0.14, s * 0.1);
  ctx.restore();
}
function iconStar(ctx, cx, cy, R, fill) { starPath(ctx, cx, cy, R, R * 0.45, 5); ctx.fillStyle = fill; ctx.fill(); }

// ── QR ──
const _qrCache = new Map();
function qrMatrix(url) {
  if (!url || typeof qrcode !== 'function') return null;
  if (_qrCache.has(url)) return _qrCache.get(url);
  let m = null;
  try { const q = qrcode(0, 'M'); q.addData(url); q.make(); const n = q.getModuleCount(); m = Array.from({ length: n }, (_, r) => Array.from({ length: n }, (_, c) => q.isDark(r, c))); } catch (e) { m = null; }
  _qrCache.set(url, m); return m;
}
function drawQR(ctx, x, y, s, url, ink = '#1A0A02') {
  const m = qrMatrix(url);
  rrPath(ctx, x, y, s, s, s * 0.09); ctx.fillStyle = '#fff'; ctx.fill();
  if (!m) return;
  const pad = s * 0.075, cell = (s - pad * 2) / m.length;
  ctx.fillStyle = ink;
  for (let r = 0; r < m.length; r++) for (let c = 0; c < m.length; c++) if (m[r][c]) ctx.fillRect(x + pad + c * cell - 0.15, y + pad + r * cell - 0.15, cell + 0.3, cell + 0.3);
}

/** Reparte palabras en líneas a un tamaño dado. ok=false si alguna palabra sola no entra. */
function layoutLines(ctx, words, mk, size, maxW, tracking = 0) {
  ctx.font = mk(size);
  const lines = []; let cur = '', ok = true;
  for (const w of words) {
    const t = cur ? cur + ' ' + w : w;
    if (measure(ctx, t, tracking) <= maxW) cur = t;
    else { if (cur) lines.push(cur); cur = w; if (measure(ctx, w, tracking) > maxW) ok = false; }
  }
  if (cur) lines.push(cur);
  return { lines, ok };
}
function balanceTwo(ctx, words, lines, maxW, tracking = 0) {
  let best = lines, bw = Math.max(measure(ctx, lines[0], tracking), measure(ctx, lines[1], tracking));
  for (let i = 1; i < words.length; i++) {
    const a = words.slice(0, i).join(' '), b = words.slice(i).join(' '), m = Math.max(measure(ctx, a, tracking), measure(ctx, b, tracking));
    if (m <= maxW && m < bw - 0.5) { best = [a, b]; bw = m; }
  }
  return best;
}
/** Mayor tamaño (≤ max) con que el texto entra en maxLines líneas de ancho maxW y en availH de alto (líneas × tamaño × lh). */
function fitBlock(ctx, str, mk, max, min, maxW, maxLines, availH, lh = 0.92, tracking = 0) {
  const words = String(str || '').trim().split(/\s+/).filter(Boolean);
  if (!words.length) return { size: max, lines: [] };
  for (let sz = max; sz >= min; sz -= Math.max(0.75, sz * 0.012)) {
    const r = layoutLines(ctx, words, mk, sz, maxW, tracking);
    if (!r.ok || r.lines.length > maxLines || sz * lh * r.lines.length > availH) continue;
    if (r.lines.length === 2 && words.length > 2) ctx.font = mk(sz), r.lines = balanceTwo(ctx, words, r.lines, maxW, tracking);
    return { size: sz, lines: r.lines };
  }
  return wrapFit(ctx, str, mk, min, min, maxW, maxLines, tracking);      // no entra: recorta con “…” en el tamaño mínimo
}
