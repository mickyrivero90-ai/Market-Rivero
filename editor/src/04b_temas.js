// ───────────────────────── temas de fecha, decoraciones y promos de pago ─────────────────────────
function rnd(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// ── figuras sueltas ──
function heart(ctx, x, y, s, fill, rot = 0, alpha = 1) { if (!libre(x, y, s)) return;
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.globalAlpha = alpha; ctx.fillStyle = fill; ctx.beginPath();
  ctx.moveTo(0, s * 0.9); ctx.bezierCurveTo(-s * 1.15, s * 0.2, -s * 0.85, -s * 0.85, 0, -s * 0.35); ctx.bezierCurveTo(s * 0.85, -s * 0.85, s * 1.15, s * 0.2, 0, s * 0.9); ctx.fill(); ctx.restore();
}
function flower(ctx, x, y, r, petal = '#FFFFFF', center = '#FFC400', n = 6, rot = 0, alpha = 1) { if (!libre(x, y, r * 1.3)) return;
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.globalAlpha = alpha;
  shadow(ctx, 'rgba(60,0,30,.25)', r * 0.15, 0, r * 0.08);
  ctx.fillStyle = petal;
  for (let i = 0; i < n; i++) { ctx.save(); ctx.rotate((i / n) * TAU); ctx.beginPath(); ctx.ellipse(0, -r * 0.55, r * 0.34, r * 0.5, 0, 0, TAU); ctx.fill(); ctx.restore(); }
  noShadow(ctx); ctx.fillStyle = center; ctx.beginPath(); ctx.arc(0, 0, r * 0.28, 0, TAU); ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,.12)'; ctx.beginPath(); ctx.arc(r * 0.05, r * 0.05, r * 0.16, 0, TAU); ctx.fill(); ctx.restore();
}
function leaf(ctx, x, y, s, rot, fill = '#2E9E5B') { if (!libre(x, y, s)) return; ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.fillStyle = fill; ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(s * 0.5, -s * 0.35, s, 0); ctx.quadraticCurveTo(s * 0.5, s * 0.35, 0, 0); ctx.fill(); ctx.restore(); }
function pumpkin(ctx, x, y, s, rot = 0) { if (!libre(x, y, s)) return;
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
  shadow(ctx, 'rgba(0,0,0,.45)', s * 0.12, 0, s * 0.08);
  const g = ctx.createRadialGradient(0, -s * 0.1, s * 0.1, 0, 0, s * 0.8); g.addColorStop(0, '#FFB14A'); g.addColorStop(1, '#E56A00');
  ctx.fillStyle = g;
  for (const [dx, w] of [[-0.42, 0.52], [0.42, 0.52], [-0.2, 0.62], [0.2, 0.62], [0, 0.6]]) { ctx.beginPath(); ctx.ellipse(s * dx, 0, s * w * 0.72, s * 0.62, 0, 0, TAU); ctx.fill(); }
  noShadow(ctx); ctx.strokeStyle = 'rgba(120,40,0,.45)'; ctx.lineWidth = s * 0.025;
  for (const dx of [-0.62, -0.3, 0, 0.3, 0.62]) { ctx.beginPath(); ctx.ellipse(s * dx, 0, s * (0.14 + Math.abs(dx) * 0.05), s * 0.6, 0, 0, TAU); ctx.stroke(); }
  ctx.fillStyle = '#4F3A12'; ctx.beginPath(); ctx.moveTo(-s * 0.08, -s * 0.55); ctx.quadraticCurveTo(-s * 0.04, -s * 0.9, s * 0.16, -s * 0.85); ctx.lineTo(s * 0.12, -s * 0.72); ctx.quadraticCurveTo(s * 0.04, -s * 0.74, s * 0.06, -s * 0.54); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#2A0F4D';                                   // cara tallada
  ctx.beginPath(); ctx.moveTo(-s * 0.38, -s * 0.12); ctx.lineTo(-s * 0.14, -s * 0.12); ctx.lineTo(-s * 0.26, -s * 0.34); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(s * 0.38, -s * 0.12); ctx.lineTo(s * 0.14, -s * 0.12); ctx.lineTo(s * 0.26, -s * 0.34); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-s * 0.45, s * 0.14); for (let i = 0; i <= 6; i++) ctx.lineTo(-s * 0.45 + i * s * 0.15, s * (i % 2 ? 0.14 : 0.36)); ctx.lineTo(s * 0.45, s * 0.14); ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(255,220,90,.9)'; ctx.beginPath(); ctx.moveTo(-s * 0.3, -s * 0.16); ctx.lineTo(-s * 0.2, -s * 0.16); ctx.lineTo(-s * 0.25, -s * 0.25); ctx.fill();
  ctx.restore();
}
function bat(ctx, x, y, s, rot = 0, fill = '#0E0418', alpha = 1) { if (!libre(x, y, s)) return;
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.globalAlpha = alpha; ctx.fillStyle = fill;
  for (const m of [1, -1]) {
    ctx.beginPath(); ctx.moveTo(0, -s * 0.05); ctx.bezierCurveTo(m * s * 0.3, -s * 0.55, m * s * 0.9, -s * 0.5, m * s * 1.25, -s * 0.05);
    ctx.quadraticCurveTo(m * s * 1.02, s * 0.0, m * s * 0.9, s * 0.18); ctx.quadraticCurveTo(m * s * 0.7, s * 0.05, m * s * 0.55, s * 0.3); ctx.quadraticCurveTo(m * s * 0.32, s * 0.1, 0, s * 0.3); ctx.closePath(); ctx.fill();
  }
  ctx.beginPath(); ctx.ellipse(0, s * 0.05, s * 0.16, s * 0.26, 0, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-s * 0.14, -s * 0.12); ctx.lineTo(-s * 0.12, -s * 0.34); ctx.lineTo(-s * 0.02, -s * 0.16); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(s * 0.14, -s * 0.12); ctx.lineTo(s * 0.12, -s * 0.34); ctx.lineTo(s * 0.02, -s * 0.16); ctx.closePath(); ctx.fill();
  ctx.restore();
}
function cobweb(ctx, x, y, R, flipX = 1, color = 'rgba(255,255,255,.55)') { if (!libre(x, y, R * 0.6)) return;
  ctx.save(); ctx.translate(x, y); ctx.scale(flipX, 1); ctx.strokeStyle = color; ctx.lineWidth = Math.max(1.5, R * 0.012); ctx.lineCap = 'round';
  const n = 6, ang = i => (i / n) * (Math.PI / 2);
  for (let i = 0; i <= n; i++) { ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(ang(i)) * R, Math.sin(ang(i)) * R); ctx.stroke(); }
  for (let ring = 1; ring <= 5; ring++) {
    const rr = (ring / 5) * R; ctx.beginPath();
    for (let i = 0; i <= n; i++) { const px = Math.cos(ang(i)) * rr, py = Math.sin(ang(i)) * rr; if (i === 0) ctx.moveTo(px, py); else { const mx = Math.cos((ang(i) + ang(i - 1)) / 2) * rr * 0.86, my = Math.sin((ang(i) + ang(i - 1)) / 2) * rr * 0.86; ctx.quadraticCurveTo(mx, my, px, py); } }
    ctx.stroke();
  }
  ctx.restore();
}
function snowflake(ctx, x, y, r, alpha = 0.9, rot = 0) { if (!libre(x, y, r)) return;
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.globalAlpha = alpha; ctx.strokeStyle = '#fff'; ctx.lineWidth = Math.max(1.4, r * 0.1); ctx.lineCap = 'round';
  for (let i = 0; i < 6; i++) { ctx.save(); ctx.rotate((i / 6) * TAU); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -r); ctx.moveTo(0, -r * 0.55); ctx.lineTo(r * 0.28, -r * 0.8); ctx.moveTo(0, -r * 0.55); ctx.lineTo(-r * 0.28, -r * 0.8); ctx.stroke(); ctx.restore(); }
  ctx.restore();
}
function bauble(ctx, x, y, r, color, stringTop = 0) { if (!libre(x, y, r)) return;
  ctx.save();
  if (stringTop !== null) { ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, stringTop); ctx.lineTo(x, y - r); ctx.stroke(); }
  shadow(ctx, 'rgba(0,0,0,.35)', r * 0.3, 0, r * 0.15);
  const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.35, r * 0.1, x, y, r); g.addColorStop(0, '#fff'); g.addColorStop(0.18, color); g.addColorStop(1, 'rgba(0,0,0,.55)');
  ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); noShadow(ctx);
  ctx.fillStyle = g; ctx.globalAlpha = 0.9; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
  ctx.fillStyle = '#E8C45A'; rrPath(ctx, x - r * 0.28, y - r - r * 0.22, r * 0.56, r * 0.3, r * 0.08); ctx.fill();
  ctx.restore();
}
function xmasTree(ctx, x, y, s) { if (!libre(x, y, s)) return;
  ctx.save(); ctx.translate(x, y);
  shadow(ctx, 'rgba(0,0,0,.35)', s * 0.06, 0, s * 0.04);
  ctx.fillStyle = '#6B3F1D'; ctx.fillRect(-s * 0.08, s * 0.82, s * 0.16, s * 0.18);
  const tiers = [[0.02, 0.95, 0.62], [-0.22, 0.88, 0.8], [-0.46, 0.8, 1.0]];
  tiers.forEach(([ty, , tw], i) => { const g = vGradFast(ctx, s * (ty - 0.1), s * (ty + 0.5), ['#2FAF5B', '#0F6B35']); ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(0, s * (ty - 0.48 + i * 0.0)); ctx.lineTo(s * tw * 0.5, s * (ty + 0.3)); ctx.lineTo(-s * tw * 0.5, s * (ty + 0.3)); ctx.closePath(); ctx.fill(); });
  noShadow(ctx);
  iconStar(ctx, 0, -s * 0.5, s * 0.14, '#FFD84A');
  const r = rnd(11); const cols = ['#E5243B', '#FFD84A', '#7CC8FF', '#fff'];
  for (let i = 0; i < 9; i++) { const yy = -s * 0.25 + r() * s * 0.95, half = (yy + s * 0.5) / (s * 1.3) * s * 0.42; ctx.fillStyle = cols[i % cols.length]; ctx.beginPath(); ctx.arc((r() * 2 - 1) * half, yy, s * 0.035, 0, TAU); ctx.fill(); }
  ctx.restore();
}
function vGradFast(ctx, y0, y1, stops) { const g = ctx.createLinearGradient(0, y0, 0, y1); stops.forEach((c, i) => g.addColorStop(i / (stops.length - 1), c)); return g; }
function sunMay(ctx, x, y, R, alpha = 1) { if (!libre(x, y, R)) return;
  ctx.save(); ctx.translate(x, y); ctx.globalAlpha = alpha; ctx.fillStyle = '#F6B40E';
  for (let i = 0; i < 32; i++) { ctx.save(); ctx.rotate((i / 32) * TAU); ctx.beginPath(); const L = i % 2 ? R * 1.28 : R * 1.5; ctx.moveTo(-R * 0.07, -R * 1.02); ctx.lineTo(0, -L); ctx.lineTo(R * 0.07, -R * 1.02); ctx.closePath(); ctx.fill(); ctx.restore(); }
  const g = ctx.createRadialGradient(0, 0, R * 0.1, 0, 0, R); g.addColorStop(0, '#FFE27A'); g.addColorStop(1, '#F6B40E');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, R, 0, TAU); ctx.fill();
  ctx.fillStyle = '#C98A00'; ctx.beginPath(); ctx.arc(-R * 0.3, -R * 0.12, R * 0.07, 0, TAU); ctx.arc(R * 0.3, -R * 0.12, R * 0.07, 0, TAU); ctx.fill();
  ctx.strokeStyle = '#C98A00'; ctx.lineWidth = R * 0.06; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(0, R * 0.05, R * 0.38, 0.25, Math.PI - 0.25); ctx.stroke();
  ctx.restore();
}
function tie(ctx, x, y, s, fill, rot = 0, alpha = 1) { if (!libre(x, y, s)) return;
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.globalAlpha = alpha; ctx.fillStyle = fill;
  ctx.beginPath(); ctx.moveTo(-s * 0.2, -s * 0.5); ctx.lineTo(s * 0.2, -s * 0.5); ctx.lineTo(s * 0.12, -s * 0.28); ctx.lineTo(-s * 0.12, -s * 0.28); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-s * 0.12, -s * 0.26); ctx.lineTo(s * 0.12, -s * 0.26); ctx.lineTo(s * 0.3, s * 0.45); ctx.lineTo(0, s * 0.62); ctx.lineTo(-s * 0.3, s * 0.45); ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.22)'; ctx.beginPath(); ctx.moveTo(-s * 0.05, -s * 0.2); ctx.lineTo(s * 0.02, -s * 0.2); ctx.lineTo(s * 0.12, s * 0.4); ctx.lineTo(0, s * 0.46); ctx.closePath(); ctx.fill(); ctx.restore();
}
function mustache(ctx, x, y, s, fill, rot = 0, alpha = 1) { if (!libre(x, y, s)) return;
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.globalAlpha = alpha; ctx.fillStyle = fill; ctx.beginPath();
  ctx.moveTo(0, -s * 0.12);
  ctx.bezierCurveTo(s * 0.25, -s * 0.38, s * 0.6, -s * 0.3, s * 0.8, s * 0.05);
  ctx.bezierCurveTo(s * 0.95, s * 0.3, s * 0.6, s * 0.4, s * 0.5, s * 0.22); ctx.bezierCurveTo(s * 0.4, s * 0.1, s * 0.2, s * 0.12, 0, s * 0.14);
  ctx.bezierCurveTo(-s * 0.2, s * 0.12, -s * 0.4, s * 0.1, -s * 0.5, s * 0.22); ctx.bezierCurveTo(-s * 0.6, s * 0.4, -s * 0.95, s * 0.3, -s * 0.8, s * 0.05);
  ctx.bezierCurveTo(-s * 0.6, -s * 0.3, -s * 0.25, -s * 0.38, 0, -s * 0.12); ctx.fill(); ctx.restore();
}
function coin(ctx, x, y, r, alpha = 1) { if (!libre(x, y, r)) return;
  ctx.save(); ctx.globalAlpha = alpha; shadow(ctx, 'rgba(0,0,0,.3)', r * 0.2, 0, r * 0.1);
  const g = ctx.createLinearGradient(x - r, y - r, x + r, y + r); g.addColorStop(0, '#FFF29A'); g.addColorStop(0.5, '#FFD21F'); g.addColorStop(1, '#D79A00');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); noShadow(ctx);
  ctx.strokeStyle = 'rgba(150,90,0,.55)'; ctx.lineWidth = r * 0.1; ctx.beginPath(); ctx.arc(x, y, r * 0.78, 0, TAU); ctx.stroke();
  text(ctx, '$', x, y + r * 0.34, { font: FB(900, r * 1.05), fill: 'rgba(150,90,0,.8)', align: 'center' }); ctx.restore();
}
function confetti(ctx, W, hh, colors, count, seed, zone) {
  const r = rnd(seed);
  for (let i = 0; i < count; i++) {
    const x = (zone ? zone[0] : 0) + r() * (zone ? zone[1] : W), y = r() * hh, rot = r() * TAU, largo = 12 + r() * 8;
    if (!libre(x, y, 12)) continue;
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.fillStyle = colors[i % colors.length]; ctx.globalAlpha = 0.85; ctx.fillRect(-6, -3, largo, 6); ctx.restore();
  }
}
function hazard(ctx, x, y, w, h, c1 = '#FFD400', c2 = '#111', step = 46, skew = 0.9) {
  ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip(); ctx.fillStyle = c2; ctx.fillRect(x, y, w, h); ctx.fillStyle = c1;
  for (let i = -h * skew - step; i < w + step; i += step * 2) { ctx.beginPath(); ctx.moveTo(x + i, y + h); ctx.lineTo(x + i + step, y + h); ctx.lineTo(x + i + step + h * skew, y); ctx.lineTo(x + i + h * skew, y); ctx.closePath(); ctx.fill(); }
  ctx.restore();
}

// ── fondos especiales ──
function bgArgentina(ctx, W, H, T, hh) {
  ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, W, H);
  const n = 11, sw = W / n;
  for (let i = 0; i < n; i += 2) { ctx.fillStyle = vGrad(ctx, 0, H, ['#8DC3F0', '#6FB1E8', '#4F95D2']); ctx.fillRect(i * sw, 0, sw, H); }
  ctx.fillStyle = 'rgba(255,255,255,.0)';
  const top = hh || H * 0.28;                                   // franja de encabezado azul marino
  const g = ctx.createLinearGradient(0, 0, 0, top + 40); g.addColorStop(0, '#0A2552'); g.addColorStop(1, '#14408A'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, top + 6);
  ctx.fillStyle = '#F6B40E'; ctx.fillRect(0, top + 6, W, 5); ctx.fillStyle = '#fff'; ctx.fillRect(0, top + 11, W, 5);
  const rg = ctx.createRadialGradient(W * 0.5, 0, 0, W * 0.5, 0, W * 0.7); rg.addColorStop(0, 'rgba(255,255,255,.22)'); rg.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = rg; raysPath(ctx, W * 0.5, 0, W * 1.2, 36, 0.1); ctx.fill();
}
function bgHazard(ctx, W, H, T, hh) {
  ctx.fillStyle = vGrad(ctx, 0, H, T.bg); ctx.fillRect(0, 0, W, H);
  const cx = W * 0.5, cy = H * 0.34, R = Math.hypot(W, H);
  const rg = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 0.7); rg.addColorStop(0, 'rgba(255,214,0,.55)'); rg.addColorStop(1, 'rgba(255,214,0,0)');
  ctx.fillStyle = rg; raysPath(ctx, cx, cy, R, 44, 0.05); ctx.fill();
  hazard(ctx, 0, 0, W, Math.max(18, W * 0.022)); hazard(ctx, 0, H - Math.max(18, W * 0.022), W, Math.max(18, W * 0.022));
}
function bgFuego(ctx, W, H, T) {
  ctx.fillStyle = vGrad(ctx, 0, H, T.bg); ctx.fillRect(0, 0, W, H);
  const cx = W * 0.5, cy = H * 0.36, R = Math.hypot(W, H);
  const rg = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 0.75); rg.addColorStop(0, 'rgba(255,230,60,.85)'); rg.addColorStop(0.5, 'rgba(255,170,0,.35)'); rg.addColorStop(1, 'rgba(255,120,0,0)');
  ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(255,255,255,.16)'; raysPath(ctx, cx, cy, R, 52, 0.12); ctx.fill();
}
function bgEfectivo(ctx, W, H, T) {
  ctx.fillStyle = vGrad(ctx, 0, H, T.bg); ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(255,255,255,.08)'; ctx.font = FB(900, 120); ctx.textBaseline = 'alphabetic';
  const r = rnd(5); for (let i = 0; i < 26; i++) { ctx.save(); ctx.translate(r() * W, r() * H); ctx.rotate((r() - 0.5) * 0.9); ctx.font = FB(900, 90 + r() * 120); ctx.fillText('$', 0, 0); ctx.restore(); }
  const cx = W * 0.5, cy = H * 0.34, R = Math.hypot(W, H), rg = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 0.6); rg.addColorStop(0, 'rgba(255,255,255,.28)'); rg.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = rg; raysPath(ctx, cx, cy, R, 40, 0.1); ctx.fill();
}

// ── decoraciones por tema (detrás del contenido y, opcional, encima) ──
function decorMadre(ctx, W, H, hh) {
  const r = rnd(7);
  for (let i = 0; i < 16; i++) heart(ctx, r() * W, r() * H, 44 + r() * 120, '#fff', (r() - 0.5) * 0.7, 0.06 + r() * 0.05);
  [[0.585, 0.06, 40, '#fff', 0.95], [0.64, 0.30, 24, '#FFE9A8', 0.95], [0.5, 0.2, 18, '#fff', 0.85], [0.72, 0.04, 20, '#FFC857', 0.95], [0.44, 0.04, 26, '#fff', 0.8], [0.83, 0.52, 18, '#fff', 0.8], [0.04, 0.62, 22, '#FFE9A8', 0.9]]
    .forEach(([fx, fy, s, c, a], i) => heart(ctx, W * fx, hh * fy * 1.55 + 10, s * (W / 1240), c, i % 2 ? 0.28 : -0.28, a));
  const u = W / 1240;
  [[0.99, 0.03, 78, '#FFFFFF', '#FFC400', 0.2], [0.012, 0.52, 62, '#FFD9EA', '#FFC400', 0.5], [0.93, 0.5, 40, '#FFFFFF', '#FF8FB8', 0.1], [0.42, 0.0, 44, '#FFD9EA', '#FFC400', 0.3]]
    .forEach(([fx, fy, rr, p, c, rot]) => { leaf(ctx, W * fx - rr * 0.2, hh * fy * 1.7 + rr * 0.8, rr * 1.1 * u, 0.9, '#2E9E5B'); leaf(ctx, W * fx + rr * 0.1, hh * fy * 1.7 + rr * 0.9, rr * 1.0 * u, 2.2, '#26874D'); flower(ctx, W * fx, hh * fy * 1.7, rr * u, p, c, 6, rot); });
}
function decorMadreTop(ctx, W, H, hh, env) {
  const u = W / 1240, y = env.footerY || H - 300;
  [[0.028, 34, '#FFFFFF', '#FFC400'], [0.082, 24, '#FFD9EA', '#FFC400'], [0.968, 34, '#FFFFFF', '#FFC400'], [0.918, 24, '#FFD9EA', '#FFC400']].forEach(([fx, rr, p, c], i) => { leaf(ctx, W * fx - rr, y - 6 * u, rr * u * 1.2, 2.6 + i * 0.1, '#2E9E5B'); flower(ctx, W * fx, y - 10 * u, rr * u, p, c, 6, i); });
}
function decorHalloween(ctx, W, H, hh) {
  const u = W / 1240, r = rnd(13);
  ctx.save(); const mg = ctx.createRadialGradient(W * 0.77, hh * 0.35, 10, W * 0.77, hh * 0.35, 200 * u); mg.addColorStop(0, 'rgba(255,245,200,.95)'); mg.addColorStop(0.55, 'rgba(255,240,180,.5)'); mg.addColorStop(1, 'rgba(255,240,180,0)');
  ctx.fillStyle = mg; ctx.beginPath(); ctx.arc(W * 0.77, hh * 0.35, 200 * u, 0, TAU); ctx.fill();
  ctx.fillStyle = '#FFF3C4'; ctx.beginPath(); ctx.arc(W * 0.77, hh * 0.35, 92 * u, 0, TAU); ctx.fill(); ctx.fillStyle = 'rgba(200,170,90,.35)';
  for (const [dx, dy, rr] of [[-0.3, -0.2, 0.2], [0.25, 0.1, 0.26], [-0.1, 0.35, 0.14], [0.3, -0.35, 0.1]]) { ctx.beginPath(); ctx.arc(W * 0.77 + dx * 92 * u, hh * 0.35 + dy * 92 * u, rr * 92 * u, 0, TAU); ctx.fill(); } ctx.restore();
  for (let i = 0; i < 60; i++) { ctx.fillStyle = `rgba(255,255,255,${0.15 + r() * 0.5})`; ctx.beginPath(); ctx.arc(r() * W, r() * H * 0.55, 1.5 + r() * 2.5, 0, TAU); ctx.fill(); }
  cobweb(ctx, 0, 0, 230 * u, 1); cobweb(ctx, W, 0, 230 * u, -1);
  [[0.50, 0.06, 40], [0.60, 0.22, 26], [0.43, 0.30, 30], [0.90, 0.10, 34], [0.30, 0.04, 22], [0.70, 0.04, 28], [0.95, 0.58, 30]].forEach(([fx, fy, s], i) => bat(ctx, W * fx, hh * fy * 1.35 + 20, s * 1.4 * u, (i % 2 ? 0.2 : -0.18), '#0A0314', 0.95));
}
function decorHalloweenTop(ctx, W, H, hh, env) {
  const u = W / 1240, y = env.footerY || H - 300;
  pumpkin(ctx, W * 0.045, y - 24 * u, 62 * u, -0.1); pumpkin(ctx, W * 0.115, y - 6 * u, 36 * u, 0.15); pumpkin(ctx, W * 0.955, y - 24 * u, 62 * u, 0.1);
}
function decorArgentina(ctx, W, H, hh) {
  const u = W / 1240;
  sunMay(ctx, W * 0.5, hh * 0.46, 64 * u, 0.0);
  [[-1, 0], [0, -22], [1, 0]].forEach(([i, dy]) => iconStar(ctx, W * 0.5 + i * 62 * u, hh * 0.1 + 26 * u + dy * u, 24 * u, '#F6B40E'));
  confetti(ctx, W, hh, ['#8DC3F0', '#FFFFFF', '#F6B40E'], 36, 21);
  const r = rnd(5); for (let i = 0; i < 12; i++) { ctx.fillStyle = 'rgba(255,255,255,.25)'; starPath(ctx, r() * W, r() * hh, 8 + r() * 12, 4, 5); ctx.fill(); }
}
function decorNavidad(ctx, W, H, hh) {
  const u = W / 1240, r = rnd(17);
  for (let i = 0; i < 70; i++) { ctx.fillStyle = `rgba(255,255,255,${0.2 + r() * 0.6})`; ctx.beginPath(); ctx.arc(r() * W, r() * H, 1.5 + r() * 3.5, 0, TAU); ctx.fill(); }
  for (let i = 0; i < 9; i++) snowflake(ctx, r() * W, r() * hh * 1.2, (12 + r() * 20) * u, 0.5 + r() * 0.4, r());
  [[0.5, 70, 26, '#FFD84A'], [0.57, 120, 22, '#E5243B'], [0.64, 62, 19, '#7CC8FF'], [0.71, 105, 24, '#FFD84A'], [0.43, 105, 20, '#2FAF5B'], [0.78, 135, 20, '#E5243B'], [0.36, 62, 17, '#fff']]
    .forEach(([fx, yy, rr, c]) => bauble(ctx, W * fx, yy * u + 24 * u, rr * u, c, 0));
  xmasTree(ctx, W * 0.025, hh * 0.58, 150 * u); xmasTree(ctx, W * 0.975, hh * 0.72, 120 * u);
}
function decorPadre(ctx, W, H, hh) {
  const u = W / 1240, r = rnd(23);
  for (let i = 0; i < 12; i++) { const k = i % 2; (k ? mustache : tie)(ctx, r() * W, r() * H, (60 + r() * 100) * u, '#fff', (r() - 0.5) * 0.9, 0.06 + r() * 0.05); }
  [[0.6, 0.12, 52], [0.72, 0.34, 40], [0.5, 0.3, 34]].forEach(([fx, fy, s], i) => tie(ctx, W * fx, hh * fy * 1.5 + 10, s * u, i === 1 ? '#FFE27A' : '#fff', (i - 1) * 0.35, 0.95));
  [[0.46, 0.08, 50], [0.66, 0.36, 44]].forEach(([fx, fy, s]) => mustache(ctx, W * fx, hh * fy * 1.5 + 10, s * u, '#12275E', 0.1, 0.9));
  for (let i = 0; i < 10; i++) { ctx.fillStyle = 'rgba(255,226,122,.5)'; starPath(ctx, r() * W, r() * hh, 6 + r() * 10, 3, 5); ctx.fill(); }
}
function decorMP(ctx, W, H, hh) {
  const u = W / 1240;
  // sin «códigos QR» de adorno: parecían de verdad (el cliente los quería escanear) y dejaban agujeros transparentes en la imagen
  const r = rnd(5); for (let i = 0; i < 9; i++) { ctx.fillStyle = 'rgba(255,255,255,.28)'; starPath(ctx, r() * W, hh * (0.15 + r() * 0.8), (5 + r() * 9) * u, 2.5 * u, 4); ctx.fill(); }
  [[0.50, 0.30, 24], [0.62, 0.34, 18], [0.72, 0.05, 20], [0.45, 0.06, 16]].forEach(([fx, fy, rr]) => coin(ctx, W * fx, hh * fy * 1.6 + 14, rr * u, 0.95));
  ctx.strokeStyle = 'rgba(255,255,255,.18)'; ctx.lineWidth = 3 * u;
  for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(0, hh * (0.85 + i * 0.07)); ctx.bezierCurveTo(W * 0.3, hh * (0.65 + i * 0.07), W * 0.7, hh * (1.05 + i * 0.07), W, hh * (0.8 + i * 0.07)); ctx.stroke(); }
}
function decorBlack(ctx, W, H, hh) {
  const u = W / 1240;
  hazard(ctx, 0, 0, W, 20 * u, '#FFD400', '#111', 40 * u);
  confetti(ctx, W, hh, ['#FFD400', '#FF2D87', '#FFFFFF'], 40, 31);
  ctx.save(); ctx.fillStyle = 'rgba(255,212,0,.10)'; ctx.font = FB(900, 220 * u); ctx.textBaseline = 'alphabetic'; ctx.translate(W * 0.05, hh * 1.0); ctx.rotate(-0.08); ctx.fillText('%', 0, 0); ctx.restore();
}

// ── figuras y decoraciones de las fechas nuevas ──
function crown(ctx, x, y, s, fill = '#F7C948', rot = 0, alpha = 1) { if (!libre(x, y, s)) return;
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.globalAlpha = alpha;
  shadow(ctx, 'rgba(0,0,0,.35)', s * 0.12, 0, s * 0.06);
  ctx.fillStyle = vGrad(ctx, -s * 0.5, s * 0.3, ['#FFE9A0', fill, '#B9861A']);
  ctx.beginPath(); ctx.moveTo(-s * 0.55, s * 0.3); ctx.lineTo(-s * 0.6, -s * 0.35); ctx.lineTo(-s * 0.3, -s * 0.05); ctx.lineTo(0, -s * 0.5); ctx.lineTo(s * 0.3, -s * 0.05); ctx.lineTo(s * 0.6, -s * 0.35); ctx.lineTo(s * 0.55, s * 0.3); ctx.closePath(); ctx.fill(); noShadow(ctx);
  ctx.fillStyle = '#B9861A'; ctx.fillRect(-s * 0.55, s * 0.18, s * 1.1, s * 0.12);
  [[-0.6, -0.35, '#E5243B'], [0, -0.5, '#2F7BFF'], [0.6, -0.35, '#2FAF5B']].forEach(([dx, dy, c]) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(s * dx, s * dy, s * 0.08, 0, TAU); ctx.fill(); });
  ctx.restore();
}
function glowStar(ctx, x, y, R) { if (!libre(x, y, R)) return;
  const g = ctx.createRadialGradient(x, y, 0, x, y, R * 3); g.addColorStop(0, 'rgba(255,240,180,.75)'); g.addColorStop(1, 'rgba(255,240,180,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, R * 3, 0, TAU); ctx.fill();
  burstPath(ctx, x, y, R, R * 0.22, 4, -Math.PI / 2); ctx.fillStyle = '#FFF6D0'; ctx.fill();
  burstPath(ctx, x, y, R * 0.55, R * 0.16, 4, -Math.PI / 4); ctx.fillStyle = '#FFE27A'; ctx.fill();
}
function decorReyes(ctx, W, H, hh) {
  const u = W / 1240, r = rnd(41);
  for (let i = 0; i < 80; i++) { ctx.fillStyle = `rgba(255,240,190,${0.2 + r() * 0.6})`; ctx.beginPath(); ctx.arc(r() * W, r() * H * 0.6, 1.2 + r() * 2.6, 0, TAU); ctx.fill(); }
  glowStar(ctx, W * 0.6, hh * 0.22, 46 * u);
  crown(ctx, W * 0.47, hh * 0.5, 64 * u, '#F7C948', -0.2); crown(ctx, W * 0.72, hh * 0.56, 54 * u, '#F7C948', 0.18); crown(ctx, W * 0.03, hh * 1.25, 60 * u, '#F7C948', 0.25); crown(ctx, W * 0.97, hh * 1.5, 50 * u, '#F7C948', -0.2);
  confetti(ctx, W, hh, ['#F7C948', '#FFFFFF', '#E5243B'], 26, 43);
}
function rosette(ctx, x, y, R, rot = 0) { if (!libre(x, y, R)) return;                       // escarapela
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
  shadow(ctx, 'rgba(0,20,60,.35)', R * 0.2, 0, R * 0.1);
  ctx.fillStyle = '#6FB1E8'; ctx.beginPath(); ctx.moveTo(-R * 0.35, R * 0.4); ctx.lineTo(-R * 0.65, R * 1.6); ctx.lineTo(-R * 0.35, R * 1.4); ctx.lineTo(-R * 0.1, R * 1.65); ctx.lineTo(0, R * 0.5); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(R * 0.35, R * 0.4); ctx.lineTo(R * 0.65, R * 1.6); ctx.lineTo(R * 0.35, R * 1.4); ctx.lineTo(R * 0.1, R * 1.65); ctx.lineTo(0, R * 0.5); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#6FB1E8'; burstPath(ctx, 0, 0, R, R * 0.9, 24); ctx.fill(); noShadow(ctx);
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, 0, R * 0.68, 0, TAU); ctx.fill();
  ctx.fillStyle = '#6FB1E8'; ctx.beginPath(); ctx.arc(0, 0, R * 0.36, 0, TAU); ctx.fill();
  ctx.restore();
}
function bunting(ctx, W, y0, sag, n, s, colors) {               // guirnalda de banderines
  ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 3;
  const yAt = x => y0 + sag * (1 - Math.pow((x / W) * 2 - 1, 2));
  ctx.beginPath(); for (let x = 0; x <= W; x += 10) x ? ctx.lineTo(x, yAt(x)) : ctx.moveTo(x, yAt(x)); ctx.stroke();
  for (let i = 0; i < n; i++) {
    const x = (i + 0.5) * W / n, y = yAt(x); ctx.fillStyle = colors[i % colors.length];
    shadow(ctx, 'rgba(0,0,0,.25)', 6, 0, 3); ctx.beginPath(); ctx.moveTo(x - s * 0.5, y); ctx.lineTo(x + s * 0.5, y); ctx.lineTo(x, y + s * 0.95); ctx.closePath(); ctx.fill(); noShadow(ctx);
  }
  ctx.restore();
}
function decorPatrias(ctx, W, H, hh) {
  const u = W / 1240;
  sunMay(ctx, W * 0.62, hh * 0.32, 46 * u, 0.9);
  bunting(ctx, W, 4, 26 * u, 14, 44 * u, ['#6FB1E8', '#FFFFFF']);
  rosette(ctx, W * 0.46, hh * 0.5, 34 * u, -0.2); rosette(ctx, W * 0.78, hh * 0.62, 28 * u, 0.25);
  rosette(ctx, W * 0.03, hh * 1.3, 36 * u, 0.2); rosette(ctx, W * 0.975, hh * 1.7, 30 * u, -0.2);
  const r = rnd(9); for (let i = 0; i < 12; i++) { ctx.fillStyle = 'rgba(255,255,255,.3)'; starPath(ctx, r() * W, hh * 0.2 + r() * hh, 6 + r() * 10, 3, 5); ctx.fill(); }
}
function gear(ctx, x, y, R, teeth, fill, alpha = 1, rot = 0) { if (!libre(x, y, R)) return;
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.globalAlpha = alpha; ctx.fillStyle = fill; ctx.beginPath();
  for (let i = 0; i < teeth * 2; i++) { const a0 = (i / (teeth * 2)) * TAU, a1 = ((i + 1) / (teeth * 2)) * TAU, rr = i % 2 ? R * 0.82 : R; ctx.arc(0, 0, rr, a0, a1); }
  ctx.closePath(); ctx.arc(0, 0, R * 0.36, 0, TAU, true); ctx.fill('evenodd'); ctx.restore();
}
function wrench(ctx, x, y, s, rot, fill, alpha = 1) { if (!libre(x, y, s)) return;
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.globalAlpha = alpha; ctx.fillStyle = fill;
  ctx.beginPath(); ctx.rect(-s, -s, s * 2, s * 2); ctx.rect(-s * 0.07, -s * 0.62, s * 0.14, s * 0.24); ctx.clip('evenodd');   // la boca de la llave queda sin pintar (sin borrar el fondo)
  rrPath(ctx, -s * 0.07, -s * 0.3, s * 0.14, s * 0.85, s * 0.06); ctx.fill();
  ctx.beginPath(); ctx.arc(0, -s * 0.38, s * 0.2, 0, TAU); ctx.fill(); ctx.restore();
}
function decorTrabajador(ctx, W, H, hh) {
  const u = W / 1240;
  gear(ctx, W * 0.02, hh * 1.4, 150 * u, 12, '#fff', 0.08, 0.2); gear(ctx, W * 0.98, H * 0.62, 190 * u, 14, '#fff', 0.07, 0.1); gear(ctx, W * 0.86, H * 0.9, 120 * u, 10, '#fff', 0.06);
  gear(ctx, W * 0.5, hh * 0.42, 40 * u, 10, '#FFD84A', 0.95, 0.2); gear(ctx, W * 0.565, hh * 0.27, 26 * u, 8, '#FFFFFF', 0.95, 0.5);
  wrench(ctx, W * 0.76, hh * 0.45, 110 * u, 0.7, '#FFFFFF', 0.9); wrench(ctx, W * 0.43, hh * 0.18, 80 * u, -0.6, '#FFD84A', 0.9);
  confetti(ctx, W, hh, ['#FFD84A', '#FFFFFF'], 18, 51);
}
function balloon(ctx, x, y, s, color) { if (!libre(x, y, s)) return;
  ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, y + s * 0.62); ctx.quadraticCurveTo(x - s * 0.2, y + s * 1.1, x + s * 0.05, y + s * 1.6); ctx.stroke();
  shadow(ctx, 'rgba(0,0,0,.25)', s * 0.15, 0, s * 0.08);
  const g = ctx.createRadialGradient(x - s * 0.15, y - s * 0.2, s * 0.05, x, y, s * 0.6); g.addColorStop(0, '#ffffff'); g.addColorStop(0.25, color); g.addColorStop(1, color);
  ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x, y, s * 0.46, s * 0.58, 0, 0, TAU); ctx.fill(); noShadow(ctx);
  ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(x - s * 0.06, y + s * 0.66); ctx.lineTo(x + s * 0.06, y + s * 0.66); ctx.lineTo(x, y + s * 0.56); ctx.closePath(); ctx.fill();
  ctx.restore();
}
function decorNino(ctx, W, H, hh) {
  const u = W / 1240, cols = ['#FF4FA3', '#FFD84A', '#7CE07C', '#FF7A3D', '#B48CFF', '#FFFFFF'];
  confetti(ctx, W, H * 0.7, cols, 50, 61);
  [[0.47, 0.28, 64], [0.56, 0.48, 52], [0.66, 0.2, 58], [0.75, 0.5, 46], [0.03, 1.15, 60], [0.97, 1.35, 56]].forEach(([fx, fy, sz], i) => balloon(ctx, W * fx, hh * fy, sz * u, cols[i % 5]));
  const r = rnd(7); for (let i = 0; i < 14; i++) { ctx.fillStyle = 'rgba(255,255,255,.45)'; starPath(ctx, r() * W, r() * hh, 6 + r() * 12, 3, 5); ctx.fill(); }
}
function egg(ctx, x, y, s, c1, c2, rot = 0) { if (!libre(x, y, s)) return;
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
  ctx.beginPath(); ctx.moveTo(0, -s * 0.62); ctx.bezierCurveTo(s * 0.48, -s * 0.62, s * 0.5, s * 0.5, 0, s * 0.5); ctx.bezierCurveTo(-s * 0.5, s * 0.5, -s * 0.48, -s * 0.62, 0, -s * 0.62); ctx.closePath();
  shadow(ctx, 'rgba(40,0,60,.35)', s * 0.15, 0, s * 0.08); ctx.fillStyle = c1; ctx.fill(); noShadow(ctx); ctx.clip();
  ctx.strokeStyle = c2; ctx.lineWidth = s * 0.08;
  ctx.beginPath(); for (let i = 0; i <= 8; i++) { const xx = -s * 0.5 + i * s * 0.125, yy = (i % 2 ? -0.02 : 0.08) * s; i ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy); } ctx.stroke();
  ctx.fillStyle = c2; [[-0.18, -0.28], [0.16, -0.32], [0, 0.3], [-0.24, 0.26], [0.24, 0.24]].forEach(([dx, dy]) => { ctx.beginPath(); ctx.arc(s * dx, s * dy, s * 0.06, 0, TAU); ctx.fill(); });
  ctx.restore();
}
function decorPascuas(ctx, W, H, hh) {
  const u = W / 1240;
  [[0.47, 0.42, 70, '#FFD84A', '#E5487F', -0.3], [0.58, 0.55, 56, '#7CE0C3', '#6A3FC2', 0.2], [0.68, 0.36, 62, '#FF9EC4', '#FFFFFF', -0.1], [0.78, 0.6, 48, '#FFFFFF', '#FF8A3D', 0.3],
    [0.03, 1.2, 66, '#FFD84A', '#6A3FC2', 0.3], [0.97, 1.5, 58, '#7CE0C3', '#E5487F', -0.3]].forEach(([fx, fy, sz, a, b, rt]) => egg(ctx, W * fx, hh * fy, sz * u, a, b, rt));
  [[0.52, 0.12, 22], [0.84, 0.18, 26], [0.4, 0.06, 18]].forEach(([fx, fy, rr]) => flower(ctx, W * fx, hh * fy + 14, rr * u, '#FFFFFF', '#FFD84A', 5, 0.3));
}
function firework(ctx, x, y, R, color, n = 18, seed = 1) { if (!libre(x, y, R)) return;
  const r = rnd(seed); ctx.save(); ctx.strokeStyle = color; ctx.lineCap = 'round';
  for (let i = 0; i < n; i++) { const a = (i / n) * TAU + r() * 0.1, r0 = R * (0.25 + r() * 0.15), r1 = R * (0.8 + r() * 0.25); ctx.lineWidth = Math.max(1.5, R * 0.035); ctx.globalAlpha = 0.9; ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * r0, y + Math.sin(a) * r0); ctx.lineTo(x + Math.cos(a) * r1, y + Math.sin(a) * r1); ctx.stroke(); ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x + Math.cos(a) * (r1 + R * 0.08), y + Math.sin(a) * (r1 + R * 0.08), R * 0.03, 0, TAU); ctx.fill(); }
  ctx.restore();
}
function decorAnioNuevo(ctx, W, H, hh) {
  const u = W / 1240, r = rnd(71);
  for (let i = 0; i < 70; i++) { ctx.fillStyle = `rgba(255,230,160,${0.15 + r() * 0.55})`; ctx.beginPath(); ctx.arc(r() * W, r() * H * 0.7, 1.2 + r() * 2.6, 0, TAU); ctx.fill(); }
  firework(ctx, W * 0.55, hh * 0.3, 90 * u, '#F7D774', 22, 3); firework(ctx, W * 0.74, hh * 0.52, 70 * u, '#FF7AB6', 18, 5); firework(ctx, W * 0.44, hh * 0.62, 50 * u, '#8FE3FF', 16, 7);
  firework(ctx, W * 0.04, hh * 1.3, 80 * u, '#F7D774', 20, 9); firework(ctx, W * 0.96, hh * 1.6, 70 * u, '#FF7AB6', 18, 11);
  confetti(ctx, W, hh, ['#F7D774', '#FFFFFF', '#FF7AB6'], 34, 73);
}
function sunSimple(ctx, x, y, R) { if (!libre(x, y, R)) return;
  ctx.save(); ctx.translate(x, y); ctx.fillStyle = 'rgba(255,230,90,.95)';
  for (let i = 0; i < 16; i++) { ctx.save(); ctx.rotate((i / 16) * TAU); ctx.beginPath(); ctx.moveTo(-R * 0.12, -R * 1.1); ctx.lineTo(0, -R * 1.55); ctx.lineTo(R * 0.12, -R * 1.1); ctx.closePath(); ctx.fill(); ctx.restore(); }
  const g = ctx.createRadialGradient(0, 0, R * 0.1, 0, 0, R); g.addColorStop(0, '#FFF6A8'); g.addColorStop(1, '#FFD21F'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, R, 0, TAU); ctx.fill(); ctx.restore();
}
function decorPrimavera(ctx, W, H, hh) {
  const u = W / 1240;
  sunSimple(ctx, W * 0.62, hh * 0.3, 50 * u);
  [[0.46, 0.5, 40, '#FF6FA8'], [0.74, 0.58, 34, '#FFFFFF'], [0.53, 0.14, 26, '#FFD84A'], [0.84, 0.22, 30, '#B48CFF'],
    [0.025, 1.2, 52, '#FF6FA8'], [0.08, 1.45, 30, '#FFFFFF'], [0.975, 1.5, 48, '#FFD84A'], [0.92, 1.7, 28, '#FF6FA8']]
    .forEach(([fx, fy, rr, c], i) => { leaf(ctx, W * fx - rr * u * 0.2, hh * fy + rr * u * 0.8, rr * 1.1 * u, 0.9, '#1E7F3A'); flower(ctx, W * fx, hh * fy, rr * u, c, '#FFC400', 6, i * 0.4); });
  const r = rnd(83); for (let i = 0; i < 16; i++) heart(ctx, r() * W, r() * H, 30 + r() * 60, '#fff', r(), 0.05);
}
function bgPatria(ctx, W, H, T) {
  ctx.fillStyle = vGrad(ctx, 0, H, T.bg); ctx.fillRect(0, 0, W, H);
  ctx.save(); ctx.globalAlpha = 0.5; ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, H * 0.18, W, H * 0.05); ctx.globalAlpha = 0.3; ctx.fillRect(0, H * 0.24, W, H * 0.02); ctx.restore();
  const cx = W * 0.5, cy = H * 0.12, R = Math.hypot(W, H), rg = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 0.75); rg.addColorStop(0, 'rgba(255,255,255,.35)'); rg.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = rg; raysPath(ctx, cx, cy, R, 40, 0.1); ctx.fill();
}

// ── registro de temas ──
const EV = o => ({ ..._base, grupo: 'fecha', ...o });
Object.assign(THEMES, {
  madre: EV({ nombre: 'Día de la Madre', swatch: '#E6287F', bg: ['#FF7DB8', '#E6287F', '#A5125E'], footer: '#3A0A2A', ribbon: ['#8E1A63', '#5A0F3E'], ribbonTail: '#3A0A28', ribbonFold: '#240618', ribbonInk: '#FFE9A8', ribbonStroke: '#2E0820',
    accent: ['#FFEDB0', '#FFC857'], accentInk: '#4A0F32', accentDeep: '#A80F5C', sello: ['#E8267F', '#A80F5C'], price: ['#E8267F', '#A80F5C'], priceShadow: 'rgba(70,0,40,.55)', glow: 'rgba(255,170,210,.75)', cardShadow: 'rgba(80,0,50,.40)',
    hero: ['#FFE6F2', '#FFB7D6'], heroRay: 'rgba(255,255,255,.6)', heroInk: '#5A0F3E', heroSoft: '#8E3A6A', titulo: 'Especial Día de la Madre', subtitulo: 'Regalale lo mejor', decor: decorMadre, decorTop: decorMadreTop }),
  padre: EV({ nombre: 'Día del Padre', swatch: '#1E3A8A', bg: ['#4A74D9', '#2447A0', '#12275E'], footer: '#0A1740', ribbon: ['#F7C21B', '#C98F00'], ribbonTail: '#8A6200', ribbonFold: '#5A4000', ribbonInk: '#12275E', ribbonStroke: '#FFF1B8',
    accent: ['#FFE98A', '#F6B40E'], accentInk: '#12275E', accentDeep: '#12275E', sello: ['#F7C21B', '#C98F00'], price: ['#1E3A8A', '#12275E'], priceShadow: 'rgba(0,10,50,.6)', glow: 'rgba(255,220,100,.6)', cardShadow: 'rgba(5,15,60,.45)',
    hero: ['#FFF3C4', '#FFD866'], heroInk: '#12275E', heroSoft: '#46598F', titulo: 'Especial Día del Padre', subtitulo: 'Para el mejor papá', decor: decorPadre }),
  halloween: EV({ nombre: 'Halloween', swatch: '#6B2FB5', bg: ['#5A2394', '#321458', '#12061F'], ray0: 'rgba(255,140,0,.24)', dots: 'rgba(255,140,0,.10)', footer: '#0E0418', ribbon: ['#FF9A1F', '#D96A00'], ribbonTail: '#8A4000', ribbonFold: '#552700', ribbonInk: '#1A0830', ribbonStroke: '#FFE2B0',
    accent: ['#FFC266', '#FF9A1F'], accentInk: '#1A0830', accentDeep: '#7A2D00', sello: ['#7A2BD1', '#4A148C'], price: ['#3B1066', '#1E0838'], priceInk: '#FFA52E', priceShadow: 'rgba(0,0,0,.65)', glow: 'rgba(255,150,30,.6)', cardShadow: 'rgba(10,0,25,.6)',
    hero: ['#FFD59A', '#FF9F3A'], heroRay: 'rgba(255,255,255,.4)', heroInk: '#1A0830', heroSoft: '#6B3A00', titulo: 'Ofertas de Halloween', subtitulo: 'Dulces precios, nada de sustos', decor: decorHalloween, decorTop: decorHalloweenTop }),
  argentina: EV({ nombre: 'Selección', swatch: '#75AADB', bg: ['#8DC3F0', '#6FB1E8', '#4F95D2'], bgFn: bgArgentina, footer: '#0A2552', ribbon: ['#1A4A99', '#0A2552'], ribbonTail: '#06173A', ribbonFold: '#030C20', ribbonInk: '#FFFFFF', ribbonStroke: '#06173A',
    accent: ['#FFE98A', '#F6B40E'], accentInk: '#0A2552', accentDeep: '#0A2552', sello: ['#1A4A99', '#0A2552'], price: ['#1A4A99', '#0A2552'], priceShadow: 'rgba(0,10,50,.6)', glow: 'rgba(255,215,90,.55)', cardShadow: 'rgba(5,25,70,.45)',
    hero: ['#FFFFFF', '#CFE6FA'], heroRay: 'rgba(143,195,240,.6)', heroInk: '#0A2552', heroSoft: '#3A5F8F', titulo: '¡Vamos Argentina!', subtitulo: 'Ofertas para alentar', decor: decorArgentina }),
  navidad: EV({ nombre: 'Navidad', swatch: '#C8102E', bg: ['#EA2C42', '#B80F25', '#7E0A1A'], footer: '#0B3B1D', ribbon: ['#1A8A45', '#0B5A2A'], ribbonTail: '#06381B', ribbonFold: '#032612', ribbonInk: '#FFFFFF', ribbonStroke: '#06381B',
    accent: ['#FFEFB0', '#FFC83A'], accentInk: '#4A1500', accentDeep: '#B3081D', sello: ['#1A8A45', '#0B5A2A'], price: ['#1A8A45', '#0B5A2A'], priceShadow: 'rgba(0,40,15,.6)', glow: 'rgba(255,220,120,.6)', cardShadow: 'rgba(60,0,10,.45)',
    hero: ['#FFF3C4', '#FFD866'], heroInk: '#5A0A12', heroSoft: '#8A3A3A', titulo: 'Ofertas de Navidad', subtitulo: 'Brindá con precios de fiesta', decor: decorNavidad }),
  mercadopago: EV({ nombre: 'Mercado Pago', swatch: '#009EE3', bg: ['#3CC8F7', '#009EE3', '#0A6DB5'], footer: '#14235E', ribbon: ['#2D3277', '#1B1F55'], ribbonTail: '#10133A', ribbonFold: '#080A22', ribbonInk: '#FFE600', ribbonStroke: '#0B0E30',
    accent: ['#FFF37A', '#FFE600'], accentInk: '#14235E', accentDeep: '#14235E', sello: ['#2D3277', '#1B1F55'], price: ['#2D3277', '#1B1F55'], priceShadow: 'rgba(5,10,60,.6)', glow: 'rgba(255,230,0,.5)', cardShadow: 'rgba(5,40,90,.45)',
    hero: ['#E4F8FF', '#8AD9F5'], heroRay: 'rgba(255,255,255,.6)', heroInk: '#14235E', heroSoft: '#3A5A8F', titulo: 'Pagá con Mercado Pago', subtitulo: 'Más ahorro en cada compra', decor: decorMP }),
  blackfriday: EV({ nombre: 'Black Friday', swatch: '#111111', bg: ['#2E2E2E', '#151515', '#050505'], ray0: 'rgba(255,212,0,.16)', dots: 'rgba(255,212,0,.09)', footer: '#000000', ribbon: ['#FFE24A', '#FFC400'], ribbonTail: '#A88300', ribbonFold: '#6E5600', ribbonInk: '#0A0A0A', ribbonStroke: '#FFF3A0',
    accent: ['#FFE24A', '#FFC400'], accentInk: '#0A0A0A', accentDeep: '#B3081D', sello: ['#E5202F', '#B3101C'], price: ['#FFE24A', '#FFC400'], priceInk: '#0A0A0A', priceShadow: 'rgba(255,255,255,.0)', glow: 'rgba(255,212,0,.55)', cardShadow: 'rgba(0,0,0,.6)',
    hero: ['#FFF3A0', '#FFD400'], heroInk: '#0A0A0A', heroSoft: '#5A4A00', titulo: 'Black Friday', subtitulo: 'Los precios más negros del año', decor: decorBlack }),
  reyes: EV({ nombre: 'Reyes Magos', swatch: '#1A1D5E', bg: ['#3A3FA8', '#20247A', '#0B0C35'], ray0: 'rgba(255,230,150,.18)', dots: 'rgba(255,230,150,.08)', footer: '#0B0C2E', ribbon: ['#F7C948', '#C9921A'], ribbonTail: '#8A6200', ribbonFold: '#5A4000', ribbonInk: '#1A1D5E', ribbonStroke: '#FFF3C4',
    accent: ['#FFE9A0', '#F7C948'], accentInk: '#1A1D5E', accentDeep: '#8E1B4C', sello: ['#C62E6B', '#8E1B4C'], price: ['#C62E6B', '#8E1B4C'], priceShadow: 'rgba(40,0,20,.55)', glow: 'rgba(255,220,120,.6)', cardShadow: 'rgba(5,5,40,.5)',
    hero: ['#FFF3C4', '#FFD866'], heroInk: '#1A1D5E', heroSoft: '#4A4F8F', titulo: 'Llegan los Reyes', subtitulo: 'Regalos para toda la familia', decor: decorReyes }),
  patrias: EV({ nombre: 'Fechas patrias', swatch: '#6FB1E8', bg: ['#A9D6F5', '#74B4E6', '#3F86C8'], bgFn: bgPatria, footer: '#0A2552', ribbon: ['#1A4A99', '#0A2552'], ribbonTail: '#06173A', ribbonFold: '#030C20', ribbonInk: '#FFFFFF', ribbonStroke: '#06173A',
    accent: ['#FFE98A', '#F6B40E'], accentInk: '#0A2552', accentDeep: '#0A2552', sello: ['#1A4A99', '#0A2552'], price: ['#1A4A99', '#0A2552'], priceShadow: 'rgba(0,10,50,.6)', glow: 'rgba(255,215,90,.55)', cardShadow: 'rgba(5,25,70,.45)',
    hero: ['#FFFFFF', '#D6EAFB'], heroRay: 'rgba(143,195,240,.6)', heroInk: '#0A2552', heroSoft: '#3A5F8F', titulo: '¡Viva la Patria!', subtitulo: 'Ofertas para festejar', decor: decorPatrias }),
  trabajador: EV({ nombre: 'Día del Trabajador', swatch: '#D8261E', bg: ['#FF5A4E', '#D8261E', '#8E0F0B'], footer: '#1B1F2E', ribbon: ['#2B2F3E', '#14171F'], ribbonTail: '#08090D', ribbonFold: '#000000', ribbonInk: '#FFD84A', ribbonStroke: '#08090D',
    accent: ['#FFE98A', '#FFC400'], accentInk: '#1B1F2E', accentDeep: '#B3081D', sello: ['#2B2F3E', '#14171F'], price: ['#2B2F3E', '#14171F'], priceInk: '#FFD84A', priceShadow: 'rgba(0,0,0,.55)', glow: 'rgba(255,220,100,.6)', cardShadow: 'rgba(60,0,0,.45)',
    hero: ['#FFF3C4', '#FFD866'], heroInk: '#1B1F2E', heroSoft: '#5A4A2A', titulo: 'Feliz Día del Trabajador', subtitulo: 'Para descansar y disfrutar', decor: decorTrabajador }),
  nino: EV({ nombre: 'Día del Niño', swatch: '#22A7F0', bg: ['#5CD6FF', '#22A7F0', '#1167C4'], footer: '#0B2D5E', ribbon: ['#FF4FA3', '#D61F7A'], ribbonTail: '#8E0E4E', ribbonFold: '#5A0730', ribbonInk: '#FFFFFF', ribbonStroke: '#7A0C44',
    accent: ['#FFF37A', '#FFD400'], accentInk: '#0B2D5E', accentDeep: '#D61F7A', sello: ['#FF4FA3', '#D61F7A'], price: ['#FF7A00', '#D85A00'], priceShadow: 'rgba(90,30,0,.5)', glow: 'rgba(255,240,120,.65)', cardShadow: 'rgba(0,30,80,.4)',
    hero: ['#FFFDE0', '#FFE680'], heroInk: '#0B2D5E', heroSoft: '#3A5F8F', titulo: 'Feliz Día del Niño', subtitulo: 'Para los más chicos de la casa', decor: decorNino }),
  pascuas: EV({ nombre: 'Pascuas', swatch: '#9B6BF0', bg: ['#C9A7FF', '#9B6BF0', '#6A3FC2'], footer: '#2A1260', ribbon: ['#FFD84A', '#F2B705'], ribbonTail: '#A07800', ribbonFold: '#6E5300', ribbonInk: '#4E1FA0', ribbonStroke: '#FFF6C8',
    accent: ['#FFF37A', '#FFD84A'], accentInk: '#2A1260', accentDeep: '#7A3FD1', sello: ['#7A3FD1', '#4E1FA0'], price: ['#7A3FD1', '#4E1FA0'], priceShadow: 'rgba(30,0,60,.55)', glow: 'rgba(255,230,140,.6)', cardShadow: 'rgba(40,0,80,.45)',
    hero: ['#FFF8DC', '#FFE38A'], heroInk: '#2A1260', heroSoft: '#5E4A8F', titulo: 'Felices Pascuas', subtitulo: 'Huevos, roscas y chocolates', decor: decorPascuas }),
  primavera: EV({ nombre: 'Primavera y Estudiante', swatch: '#4CB944', bg: ['#9BE15D', '#4CB944', '#1E7F3A'], footer: '#0F3D1E', ribbon: ['#FF6FA8', '#E0357A'], ribbonTail: '#97204F', ribbonFold: '#5E1231', ribbonInk: '#FFFFFF', ribbonStroke: '#7A1A40',
    accent: ['#FFF37A', '#FFD84A'], accentInk: '#0F3D1E', accentDeep: '#C81E52', sello: ['#FF6FA8', '#E0357A'], price: ['#FF4F7B', '#C81E52'], priceShadow: 'rgba(80,0,30,.5)', glow: 'rgba(255,240,120,.65)', cardShadow: 'rgba(10,50,20,.4)',
    hero: ['#FFFDE0', '#FFE680'], heroInk: '#0F3D1E', heroSoft: '#3E6F4E', titulo: 'Llegó la primavera', subtitulo: 'Día del Estudiante y de la Primavera', decor: decorPrimavera }),
  anionuevo: EV({ nombre: 'Año Nuevo', swatch: '#141E45', bg: ['#2A3C7A', '#141E45', '#070B1F'], ray0: 'rgba(247,215,116,.16)', dots: 'rgba(247,215,116,.08)', footer: '#070B1F', ribbon: ['#F7D774', '#C99A2E'], ribbonTail: '#8A6A12', ribbonFold: '#5A450A', ribbonInk: '#141E45', ribbonStroke: '#FFF6D6',
    accent: ['#FFF0B0', '#F7D774'], accentInk: '#141E45', accentDeep: '#9E0F25', sello: ['#D4213D', '#9E0F25'], price: ['#D4213D', '#9E0F25'], priceShadow: 'rgba(50,0,10,.55)', glow: 'rgba(255,225,140,.6)', cardShadow: 'rgba(0,0,20,.55)',
    hero: ['#FFF3C4', '#F7D774'], heroInk: '#141E45', heroSoft: '#4A4F7A', titulo: '¡Feliz Año Nuevo!', subtitulo: 'Brindá con nosotros', decor: decorAnioNuevo }),
  // estilos de impacto (para un solo producto: liquidación, fuego, efectivo)
  liquidacion: { ..._base, grupo: 'impacto', nombre: 'Liquidación', swatch: '#FFD400', bg: ['#2E2E2E', '#151515', '#050505'], bgFn: bgHazard, footer: '#000000', ribbon: ['#E5202F', '#B3101C'], ribbonTail: '#6E0A12', ribbonFold: '#3A0509', ribbonInk: '#FFFFFF', ribbonStroke: '#4A0509',
    accent: ['#FFE24A', '#FFC400'], accentInk: '#0A0A0A', accentDeep: '#B3081D', sello: ['#E5202F', '#B3101C'], hero: ['#FFF3A0', '#FFD400'], heroInk: '#0A0A0A', heroSoft: '#5A4A00', glow: 'rgba(255,212,0,.6)', cardShadow: 'rgba(0,0,0,.6)', titulo: 'Oferta imperdible', subtitulo: '' },
  fuego: { ..._base, grupo: 'impacto', nombre: 'Fuego', swatch: '#E5202F', bg: ['#FF3B30', '#D00F1C', '#7E0610'], bgFn: bgFuego, footer: '#2D0508', ribbon: ['#FFE24A', '#FFC400'], ribbonTail: '#C99700', ribbonFold: '#8F6A00', ribbonInk: '#B3081D', ribbonStroke: '#FFFFFF',
    accent: ['#FFE98A', '#FFC400'], accentInk: '#3A0508', accentDeep: '#B3081D', sello: ['#2B0A0E', '#120406'], hero: ['#FFF3B0', '#FFC81A'], glow: 'rgba(255,230,90,.7)', titulo: 'Oferta imperdible', subtitulo: '' },
  efectivo: { ..._base, grupo: 'impacto', nombre: 'Efectivo', swatch: '#1F9E49', bg: ['#2DBE5C', '#16863F', '#0B5A2A'], bgFn: bgEfectivo, footer: '#06301A', ribbon: ['#FFE24A', '#FFC400'], ribbonTail: '#C99700', ribbonFold: '#8F6A00', ribbonInk: '#0B5A2A', ribbonStroke: '#FFFFFF',
    accent: ['#FFF37A', '#FFD400'], accentInk: '#06301A', accentDeep: '#B3081D', sello: ['#E5202F', '#B3101C'], price: ['#0B5A2A', '#06301A'], priceInk: '#FFE24A', priceShadow: 'rgba(0,30,10,.6)', hero: ['#EFFFF3', '#A8EBBE'], heroInk: '#06301A', heroSoft: '#3E6F4E', glow: 'rgba(255,230,90,.6)', titulo: 'Oferta en efectivo', subtitulo: '' },
});
Object.values(THEMES).forEach(T => { if (!T.grupo) T.grupo = 'marca'; });
/** Títulos y frases sugeridas por temática (botones rápidos debajo del título). */
const SUGERENCIAS = {
  marca: [['Ofertas de la semana', 'Ofertas del fin de semana', 'Precios de locura', 'Súper ofertas'], ['Los precios más bajos del barrio', 'Calidad y buen precio', 'Precios que rinden']],
  madre: [['Especial Día de la Madre', 'Feliz día, mamá', 'Para mamá, lo mejor'], ['Regalale lo mejor', 'Agasajala con lo que más le gusta']],
  padre: [['Especial Día del Padre', 'Feliz día, papá', 'Para el mejor papá'], ['Para el mejor papá', 'El asado de papá, acá', 'Picada y bebida para festejar']],
  argentina: [['¡Vamos Argentina!', 'Día de partido', 'Especial Selección', 'Todo para ver el partido'], ['Ofertas para alentar', 'Picada y bebida para el partido', 'Argentina vs. ...']],
  navidad: [['Ofertas de Navidad', 'Felices Fiestas', 'Especial Nochebuena'], ['Brindá con precios de fiesta', 'Todo para tu mesa navideña']],
  anionuevo: [['¡Feliz Año Nuevo!', 'Especial Fin de Año', 'Brindis de Año Nuevo'], ['Brindá con nosotros', 'Todo para recibir el año']],
  reyes: [['Llegan los Reyes', 'Especial Reyes Magos'], ['Regalos para toda la familia', 'Dulces y golosinas para los chicos']],
  patrias: [['¡Viva la Patria!', 'Especial 25 de Mayo', 'Especial 9 de Julio', 'Fiestas patrias'], ['Ofertas para festejar', 'Locro, empanadas y pastelitos', 'Todo para el locro']],
  trabajador: [['Feliz Día del Trabajador', 'Especial 1.º de Mayo'], ['Para descansar y disfrutar', 'El asado del feriado, acá']],
  nino: [['Feliz Día del Niño', 'Especial Día del Niño'], ['Para los más chicos de la casa', 'Golosinas y juegos al mejor precio']],
  pascuas: [['Felices Pascuas', 'Especial Semana Santa'], ['Huevos, roscas y chocolates', 'Todo para la Pascua']],
  primavera: [['Llegó la primavera', 'Día del Estudiante', 'Especial Primavera'], ['Día del Estudiante y de la Primavera', 'Todo para el picnic']],
  halloween: [['Ofertas de Halloween', 'Noche de brujas'], ['Dulces precios, nada de sustos']],
  mercadopago: [['Pagá con Mercado Pago', 'Promo Mercado Pago', '10% con QR'], ['Más ahorro en cada compra', 'Escaneá el QR y ahorrá']],
  blackfriday: [['Black Friday', 'Viernes negro'], ['Los precios más negros del año', 'Solo por esta semana']],
  impacto: [['Oferta imperdible', 'Liquidación total', 'Últimas unidades'], ['Hasta agotar stock', 'Solo en efectivo']],
};
const sugerenciasDe = id => SUGERENCIAS[id] || SUGERENCIAS[(THEMES[id] || {}).grupo] || SUGERENCIAS.marca;
const TITULOS_POR_DEFECTO = new Set(['', 'Ofertas de la semana', ...Object.values(THEMES).map(T => T.titulo).filter(Boolean)]);
const SUBTITULOS_POR_DEFECTO = new Set(['', 'Los precios más bajos del barrio', ...Object.values(THEMES).map(T => T.subtitulo).filter(Boolean)]);

// ───────── promos de pago y medios de pago ─────────
/** Medios de pago. Solo colores y un ícono genérico (sin logos de terceros); el logo oficial se puede subir aparte. */
const PAGOS = {
  mp: { leyenda: 'PAGANDO CON QR MP', nombre: 'Mercado Pago (QR)', corto: 'QR MERCADO PAGO', texto: 'PAGANDO CON QR DE MERCADO PAGO', frase: 'pagando con QR de Mercado Pago', etiqueta: 'CON MP', selloL1: 'CON QR MP', c: ['#33C2F5', '#0A8FD6'], c2: ['#FFF37A', '#FFE600'], ink: '#14235E', icon: 'qr' },
  modo: { leyenda: 'PAGANDO CON QR MODO', nombre: 'MODO (QR de bancos)', corto: 'QR MODO', texto: 'PAGANDO CON QR DE MODO', frase: 'pagando con QR de MODO', etiqueta: 'CON MODO', selloL1: 'CON MODO', c: ['#3A3F4B', '#15181F'], c2: ['#7CF2B8', '#2FD38A'], ink: '#0B2A1C', icon: 'qr' },
  efectivo: { leyenda: 'SOLO EN EFECTIVO', nombre: 'Efectivo', corto: 'EFECTIVO', texto: 'SOLO PAGANDO EN EFECTIVO', frase: 'pagando en efectivo', etiqueta: 'EFECTIVO', selloL1: 'EN EFECTIVO', c: ['#2DBE5C', '#12803A'], c2: ['#FFF37A', '#FFD400'], ink: '#06301A', icon: 'cash' },
  transferencia: { leyenda: 'CON TRANSFERENCIA', nombre: 'Transferencia', corto: 'TRANSFERENCIA', texto: 'PAGANDO CON TRANSFERENCIA', frase: 'pagando con transferencia bancaria', etiqueta: 'TRANSF.', selloL1: 'CON TRANSF.', c: ['#8A6CFF', '#5434D6'], c2: ['#FFF37A', '#FFE600'], ink: '#24125E', icon: 'transfer' },
  debito: { leyenda: 'CON DÉBITO', nombre: 'Tarjeta de débito', corto: 'DÉBITO', texto: 'PAGANDO CON TARJETA DE DÉBITO', frase: 'pagando con tarjeta de débito', etiqueta: 'DÉBITO', selloL1: 'CON DÉBITO', c: ['#3AA0FF', '#1565C0'], c2: ['#FFF37A', '#FFE600'], ink: '#0D2B5C', icon: 'card' },
  credito: { leyenda: 'CON TARJ. DE CRÉDITO', nombre: 'Tarjeta de crédito', corto: 'CRÉDITO', texto: 'PAGANDO CON TARJETA DE CRÉDITO', frase: 'pagando con tarjeta de crédito', etiqueta: 'CRÉDITO', selloL1: 'CON CRÉDITO', c: ['#FF8A3D', '#D9531E'], c2: ['#FFF37A', '#FFE600'], ink: '#4A1500', icon: 'card', cuotas: true },
  visa: { leyenda: 'CON TARJETA VISA', nombre: 'Tarjeta Visa', corto: 'VISA', texto: 'PAGANDO CON TARJETA VISA', frase: 'pagando con tarjetas Visa', etiqueta: 'CON VISA', selloL1: 'CON VISA', c: ['#2B3A9E', '#1A1F71'], c2: ['#FFD45A', '#F7B600'], ink: '#1A1F71', icon: 'card', cuotas: true },
  mastercard: { leyenda: 'CON MASTERCARD', nombre: 'Tarjeta Mastercard', corto: 'MASTERCARD', texto: 'PAGANDO CON MASTERCARD', frase: 'pagando con tarjetas Mastercard', etiqueta: 'MASTER', selloL1: 'CON MASTER', c: ['#F4511E', '#B71C1C'], c2: ['#FFE082', '#FFB300'], ink: '#4A0B0B', icon: 'card', cuotas: true },
  tarjetas: { leyenda: 'CON TARJETAS', nombre: 'Tarjetas (crédito y débito)', corto: 'TARJETAS', texto: 'PAGANDO CON TARJETAS DE CRÉDITO Y DÉBITO', frase: 'pagando con tarjetas de crédito y débito', etiqueta: 'TARJETAS', selloL1: 'CON TARJETAS', c: ['#5C6BC0', '#303F9F'], c2: ['#FFF37A', '#FFE600'], ink: '#1A237E', icon: 'card' },
  texto: { leyenda: 'CON LA PROMO', nombre: 'Otro (texto propio)', corto: 'PROMO', texto: 'PROMOCIÓN', frase: 'con la promoción vigente', etiqueta: 'PROMO', selloL1: '', c: ['#7A2BD1', '#4A148C'], c2: ['#FFF37A', '#FFE600'], ink: '#2A0F4D', icon: 'tag', cuotas: true },
};
const PROMO_TIPOS = { ninguna: 'Sin promo de pago', ...Object.fromEntries(Object.entries(PAGOS).map(([k, v]) => [k, v.nombre])) };
const LEYENDA_CUOTAS = 'Cuotas sin interés: CFT 0,00 % · TNA 0,00 % · TEA 0,00 %. El precio en cuotas es igual al precio de contado.';
/** Datos de la promo. modo "incluido" (el normal): el % ya está en el precio final de cada producto (precio normal − % = final).
 *  modo "extra" (opcional): un descuento adicional que se resta al precio final, solo si se elige a propósito. */
function promoInfo(S) {
  const P = S.promo || {}, t = P.tipo || 'ninguna';
  if (t === 'ninguna' || !PAGOS[t]) return null;
  const pct = numPct(P.pct);                                      // «12,5» → 12.5 (antes salía 125 %)
  const base = { ...PAGOS[t] };
  if (t === 'texto' && P.texto) { base.texto = String(P.texto).toUpperCase(); base.frase = String(P.texto).trim(); base.leyenda = base.texto.length <= 22 ? base.texto : 'CON LA PROMO'; }
  const tb = String(P.textoBarra || '').trim();                   // texto propio de la barra ("PAGANDO CON QR DE MERCADO PAGO", "EN TODO EL LOCAL"…)
  if (tb) { base.texto = tb.toUpperCase(); if (t === 'texto') base.frase = tb; }
  if (P.etiqueta) base.etiqueta = String(P.etiqueta).toUpperCase().slice(0, 10);
  const cuotas = base.cuotas ? (parseInt(String(P.cuotas || '').replace(/\D/g, ''), 10) || 0) : 0;
  const extra = !!pct && P.modo === 'extra';
  const verPrecio = P.verPrecio !== false;
  return { ...base, tipo: t, pct, pctTxt: txtPct(pct), cuotas: cuotas > 1 ? cuotas : 0, extra, verPrecio, chipLabel: extra ? base.etiqueta : cuotas > 1 ? cuotas + ' CUOTAS' : base.etiqueta };
}
/** Precio que paga el cliente con el descuento extra (con centavos), o null si no corresponde. */
function precioConPromo(p, P) {
  const F = parsePrecio(p.final);
  return F && P && P.verPrecio && P.extra ? conDescuento(F.num, P.pct) : null;
}
/** Texto de la cápsula de cada producto: "$16.686" con la promo, o "$6.180" por cuota. null si no corresponde. */
function precioPromoTexto(p, P) {
  if (!P || !P.verPrecio) return null;
  const F = parsePrecio(p.final); if (!F) return null;
  if (P.extra) return '$' + precioATexto(precioConPromo(p, P));
  if (P.cuotas) return '$' + precioATexto(Math.ceil(F.num * 100 / P.cuotas) / 100);   // por cuota, hacia arriba: nunca menos de lo que se paga
  return null;
}
/** Cápsula debajo de cada precio: {label, price}. Con el % ya incluido muestra solo la condición ("PAGANDO CON QR MP");
 *  con cuotas, el valor de la cuota; con un descuento adicional (opcional), el precio con ese descuento. */
function chipDe(p, P) {
  if (!P || !P.verPrecio) return null;
  const v = precioPromoTexto(p, P);
  if (v != null) return { label: P.chipLabel, price: v };
  return parsePrecio(p.final) ? { label: P.leyenda, price: '' } : null;
}
let S_DIBUJO = null;                                               // folleto que se está dibujando (para la condición de cada producto)
/** Promo que corresponde a un producto: la propia (p.pago) o la general del folleto. null = sin condición. */
function promoDeProducto(p, S) {
  const PG = promoInfo(S || {}), t = p && p.pago;
  if (t === 'ninguno') return null;
  if (!t || !PAGOS[t] || (PG && PG.tipo === t)) return PG;
  const B = PAGOS[t];
  return { ...B, tipo: t, pct: 0, cuotas: 0, extra: false, verPrecio: true, chipLabel: B.etiqueta };
}
/** Cápsula de un producto con su propia condición de pago ({label, price, P}) o null. */
function chipProducto(p, S) {
  if (!S || (S.promo && S.promo.verPrecio === false)) return null;
  const P = promoDeProducto(p, S); if (!P) return null;
  const c = chipDe(p, P); return c ? { ...c, P } : null;
}
/** ¿Algún producto tiene una condición de pago distinta de la general? */
const hayCondicionPorProducto = S => {
  const L = LAYOUTS[S.formato] || {}, gen = (S.promo || {}).tipo;
  return (S.productos || []).slice(0, L.slots || 0).some(p => !productoVacio(p) && p.pago && p.pago !== gen && p.pago !== 'ninguno');
};
/** Texto escrito en la barra ("PAGANDO CON QR DE MERCADO PAGO (DINERO EN CUENTA)") como frase para el medio de una oración. */
function fraseNatural(t) {
  let s = String(t || '').trim();
  if (!/[a-záéíóúñü]/.test(s)) {                                   // escrito todo en mayúsculas: minúsculas, salvo siglas y marcas
    s = s.toLocaleLowerCase('es-AR').replace(/\b(qr|mp|cft|tna|tea|modo)\b/g, x => x.toUpperCase())
      .replace(/mercado pago/g, 'Mercado Pago').replace(/\bvisa\b/g, 'Visa').replace(/\bmastercard\b/g, 'Mastercard').replace(/\bnaranja x\b/g, 'Naranja X');
  }
  return /^[A-ZÁÉÍÓÚÑ][a-záéíóúñü]/.test(s) ? s.charAt(0).toLocaleLowerCase('es-AR') + s.slice(1) : s;
}
/** La condición de la promo para la letra chica del pie (sin repetir la fecha: va una sola vez, al principio). */
function promoLetraChica(PF, S) {
  const tb = String(((S || {}).promo || {}).textoBarra || '').trim(), cond = tb ? fraseNatural(tb) : PF.frase;
  const mensaje = (LAYOUTS[(S || {}).formato] || {}).grupo === 'mensaje';
  if (PF.pct && PF.extra) return `Además, ${PF.pctTxt}% de descuento sobre el precio final ${cond}.`;
  if (PF.pct) return mensaje ? `${PF.pctTxt}% de descuento ${cond}.` : `Precios finales en pesos, con ${PF.pctTxt}% de descuento ${cond}.`;
  if (PF.cuotas) return `Precios finales en pesos. ${PF.cuotas} cuotas sin interés ${cond}.`;
  return `Precios finales en pesos, ${cond}.`;
}
/** ¿Se anuncian cuotas (en la promo o en la franja de medios de pago)? Entonces va la leyenda del CFT. */
const hayCuotas = (S, PF) => !!(PF && PF.cuotas) || pagosVisibles(S).some(x => /cuota/i.test(x.txt));
/** Medios de pago de la franja del pie: [{tipo, txt}] en el orden de PAGOS. */
function pagosVisibles(S) {
  const G = S.pagos || {};
  if (!G.ver) return [];
  return Object.keys(PAGOS).filter(k => k !== 'texto' && G.lista && G.lista.includes(k)).map(k => ({ tipo: k, txt: String((G.textos || {})[k] || '').trim() }));
}
/** Franja "ACEPTAMOS: [efectivo] [débito] [VISA · 3 cuotas sin interés]…" arriba del pie. */
function drawFranjaPagos(ctx, S, T, r, M) {
  const items = pagosVisibles(S); if (!items.length) return;
  const { x, y, w, h } = r;
  ctx.save();
  ctx.fillStyle = '#FFFFFF'; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = vGrad(ctx, y, y + 6, T.accent); ctx.fillRect(x, y, w, 6);
  const ch = h * 0.62, cy = y + 6 + (h - 6 - ch) / 2, lab = 'ACEPTAMOS';
  const piezas = (fs, conTxt) => items.map(it => { const P = PAGOS[it.tipo], t = P.corto + (conTxt && it.txt ? ' · ' + it.txt.toUpperCase() : ''); ctx.font = FB(900, fs); return { it, P, t, w: ch * 0.95 + measure(ctx, t, 0.4) + ch * 0.55 }; });
  let fs = ch * 0.62, conTxt = true, ps, total, lw;
  const medir = () => { ctx.font = FM(900, fs * 0.72); lw = measure(ctx, lab, fs * 0.06) + 14; ps = piezas(fs, conTxt); total = lw + ps.reduce((a, b) => a + b.w, 0) + 10 * (ps.length - 1); };
  medir();
  while (total > w - 2 * M && fs > ch * 0.4) { fs *= 0.95; medir(); }
  if (total > w - 2 * M && conTxt) { conTxt = false; fs = ch * 0.62; medir(); while (total > w - 2 * M && fs > ch * 0.35) { fs *= 0.95; medir(); } }
  let cx = x + Math.max(M, (w - total) / 2);
  text(ctx, lab, cx, cy + ch / 2 + fs * 0.26, { font: FM(900, fs * 0.72), fill: T.footer, tracking: fs * 0.06 }); cx += lw;
  ps.forEach(pz => {
    rrPath(ctx, cx, cy, pz.w, ch, ch / 2); ctx.fillStyle = vGrad(ctx, cy, cy + ch, pz.P.c); ctx.fill();
    promoIcono(ctx, pz.P.icon, cx + ch * 0.22, cy + ch * 0.17, ch * 0.66, pz.P.c[1], true);
    text(ctx, pz.t, cx + ch * 0.95, cy + ch / 2 + fs * 0.35, { font: FB(900, fs), fill: '#FFFFFF', tracking: 0.4 });
    cx += pz.w + 10;
  });
  ctx.restore();
}
let ETQ_PRECIO = 'FINAL', PROMO_ACT = null;
function promoIcono(ctx, tipo, x, y, s, ink, generico = false) {
  ctx.save(); ctx.translate(x, y);
  if (tipo === 'card') {                                        // tarjeta genérica
    rrPath(ctx, 0, s * 0.16, s, s * 0.68, s * 0.1); ctx.fillStyle = '#fff'; ctx.fill();
    ctx.fillStyle = ink; ctx.fillRect(0, s * 0.3, s, s * 0.13);
    rrPath(ctx, s * 0.12, s * 0.53, s * 0.22, s * 0.16, s * 0.03); ctx.fillStyle = '#E2B33C'; ctx.fill();
    ctx.fillStyle = ink; ctx.fillRect(s * 0.5, s * 0.6, s * 0.36, s * 0.06);
    ctx.restore(); return;
  }
  if (tipo === 'transfer') {                                    // dos flechas
    rrPath(ctx, 0, 0, s, s, s * 0.18); ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = ink; ctx.fillStyle = ink; ctx.lineWidth = s * 0.09; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(s * 0.2, s * 0.36); ctx.lineTo(s * 0.72, s * 0.36); ctx.stroke(); ctx.beginPath(); ctx.moveTo(s * 0.82, s * 0.36); ctx.lineTo(s * 0.64, s * 0.22); ctx.lineTo(s * 0.64, s * 0.5); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(s * 0.8, s * 0.66); ctx.lineTo(s * 0.28, s * 0.66); ctx.stroke(); ctx.beginPath(); ctx.moveTo(s * 0.18, s * 0.66); ctx.lineTo(s * 0.36, s * 0.52); ctx.lineTo(s * 0.36, s * 0.8); ctx.closePath(); ctx.fill();
    ctx.restore(); return;
  }
  if (RES.promoLogo && !generico) {
    rrPath(ctx, 0, 0, s, s, s * 0.18); ctx.fillStyle = '#fff'; ctx.fill();
    const iw = RES.promoLogo.naturalWidth || RES.promoLogo.width, ih = RES.promoLogo.naturalHeight || RES.promoLogo.height, k = Math.min((s * 0.84) / iw, (s * 0.84) / ih);
    ctx.drawImage(RES.promoLogo, (s - iw * k) / 2, (s - ih * k) / 2, iw * k, ih * k);
  } else if (tipo === 'qr') { rrPath(ctx, 0, 0, s, s, s * 0.18); ctx.fillStyle = '#fff'; ctx.fill(); ctx.fillStyle = ink; const c = s / 9;
    for (const [qx, qy] of [[1, 1], [5, 1], [1, 5]]) { ctx.fillRect(qx * c, qy * c, 3 * c, 3 * c); ctx.fillStyle = '#fff'; ctx.fillRect((qx + 0.6) * c, (qy + 0.6) * c, 1.8 * c, 1.8 * c); ctx.fillStyle = ink; ctx.fillRect((qx + 1) * c, (qy + 1) * c, 1 * c, 1 * c); }
    ctx.fillRect(5 * c, 5 * c, c * 1.1, c * 1.1); ctx.fillRect(7 * c, 6.4 * c, c * 1.1, c * 1.1); ctx.fillRect(5.6 * c, 7.2 * c, c * 1.1, c * 1.1); }
  else if (tipo === 'cash') { rrPath(ctx, 0, s * 0.18, s, s * 0.64, s * 0.1); ctx.fillStyle = '#fff'; ctx.fill(); ctx.fillStyle = ink; ctx.beginPath(); ctx.arc(s / 2, s / 2, s * 0.17, 0, TAU); ctx.fill(); ctx.fillRect(s * 0.1, s * 0.3, s * 0.1, s * 0.1); ctx.fillRect(s * 0.8, s * 0.6, s * 0.1, s * 0.1); }
  else { rrPath(ctx, s * 0.1, s * 0.1, s * 0.8, s * 0.8, s * 0.18); ctx.fillStyle = '#fff'; ctx.fill(); starPath(ctx, s / 2, s / 2, s * 0.28, s * 0.12, 5); ctx.fillStyle = ink; ctx.fill(); }
  ctx.restore();
}
const promoIconInk = P => P.c[1];
const pctTexto = P => (P.extra ? '+' : '') + P.pctTxt + '% OFF';
function fechaPillTexto(S, corto = false) {
  const V = S.vigencia || {}, dt = rangoCorto(V.desde, V.hasta), ag = V.agotar && !corto;
  return dt ? dt + (ag ? '  ·  HASTA AGOTAR STOCK' : '') : (ag ? 'HASTA AGOTAR STOCK' : '');
}
function datePillAncho(ctx, str, h) { const fs = h * 0.45; ctx.font = FM(800, fs); return h * 0.5 * 2 + h * 0.5 + h * 0.26 + measure(ctx, str, h * 0.045); }

function promoChipAncho(ctx, h, label, price) { const fs = h * 0.58; ctx.font = FB(900, fs); return measure(ctx, label, fs * 0.05) + h * 0.62 + (price ? measure(ctx, price, 0) + h * 0.62 : 0); }
/** Cápsula de dos colores: "CON MP | $16.686". Devuelve su ancho. */
function drawPromoChip(ctx, x, y, h, label, price, P, align = 'left') {
  ctx.save(); const fs = h * 0.58; ctx.font = FB(900, fs);
  const wl = measure(ctx, label, fs * 0.05) + h * 0.62, wp = price ? measure(ctx, price, 0) + h * 0.62 : 0, w = wl + wp;
  const x0 = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x;
  shadow(ctx, 'rgba(0,30,70,.4)', h * 0.3, 0, h * 0.14);
  rrPath(ctx, x0, y, w, h, h / 2); ctx.fillStyle = vGrad(ctx, y, y + h, P.c); ctx.fill(); noShadow(ctx);
  if (price) { rrPath(ctx, x0 + wl - h * 0.12, y + h * 0.07, wp + h * 0.05, h * 0.86, h * 0.43); ctx.fillStyle = vGrad(ctx, y, y + h, P.c2); ctx.fill(); }
  text(ctx, label, x0 + h * 0.34, y + h / 2 + fs * 0.35, { font: FB(900, fs), fill: '#fff', tracking: fs * 0.05, shadow: ['rgba(0,30,70,.45)', 2, 0, 1] });
  text(ctx, price, x0 + wl + h * 0.18, y + h / 2 + fs * 0.35, { font: FB(900, fs), fill: P.ink });
  ctx.restore(); return w;
}

/** Diseño de la barra de la promo (paso 3): tamaño, letra, alineación y altura. */
function barraOpciones(S) {
  const B = ((S || {}).promo || {}).barra || {};
  return { tam: clamp(+B.tam || 1, 0.7, 1.4), letra: B.letra === 'barlow' ? 'barlow' : 'mont', alinear: ['izquierda', 'derecha'].includes(B.alinear) ? B.alinear : 'centro', dy: clamp(+B.dy || 0, -30, 40) };
}
/** Barra grande de promo: [ícono] CONDICIÓN | +10 % OFF | fecha. Es lo primero que se ve bajo el título.
 *  letra: 'mont' (redonda) o 'barlow' (angosta: entra más texto). */
function barraPromoMedidas(ctx, P, str, h, letra = 'mont') {
  const fs = h * 0.37, fsP = h * 0.74, fsD = h * 0.33, fsC = h * 0.4;
  const fuente = letra === 'barlow' ? (z => FB(900, z * 1.22)) : (z => FM(800, z)), alto = letra === 'barlow' ? 0.43 : 0.35;
  ctx.font = fuente(fs); const wT = measure(ctx, P.texto, fs * 0.05);
  let wP = 0; if (P.pct) { ctx.font = FB(900, fsP); wP = measure(ctx, pctTexto(P), 0) + h * 0.7; }
  const cTxt = P.cuotas ? (P.pct ? 'O ' : '') + P.cuotas + ' CUOTAS SIN INTERÉS' : '';
  let wC = 0; if (cTxt) { ctx.font = FB(900, fsC); wC = measure(ctx, cTxt, 0.5) + h * 0.6; }
  let wD = 0; if (str) { ctx.font = fuente(fsD); wD = measure(ctx, str, fsD * 0.05) + h * 0.5 + h * 0.62; }
  const gap = h * 0.22, icon = h * 0.62;
  return { fuente, alto, fs, fsP, fsD, fsC, cTxt, wT, wP, wC, wD, gap, icon, total: h * 0.3 + icon + h * 0.3 + wT + h * 0.3 + (wP ? wP + gap : 0) + (wC ? wC + gap : 0) + (wD ? wD + h * 0.1 : 0) };
}
function drawBarraPromo(ctx, x, y, h, P, str, m, T) {
  ctx.save(); const w = m.total;
  shadow(ctx, 'rgba(0,30,70,.5)', 16, 0, 8);
  rrPath(ctx, x, y, w, h, h / 2); ctx.fillStyle = vGrad(ctx, y, y + h, P.c); ctx.fill(); noShadow(ctx);
  rrPath(ctx, x + 3, y + 3, w - 6, h - 6, h / 2 - 3); ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 2; ctx.stroke();
  promoIcono(ctx, P.icon, x + h * 0.3, y + h * 0.19, m.icon, promoIconInk(P));
  let cx = x + h * 0.3 + m.icon + h * 0.3;
  text(ctx, P.texto, cx, y + h / 2 + m.fs * m.alto, { font: m.fuente(m.fs), fill: '#FFFFFF', tracking: m.fs * 0.05, shadow: ['rgba(0,30,70,.5)', 3, 0, 2] });
  cx += m.wT + h * 0.3;
  if (P.pct) {
    rrPath(ctx, cx, y + h * 0.09, m.wP, h * 0.82, h * 0.41); ctx.fillStyle = vGrad(ctx, y, y + h, P.c2); ctx.fill();
    text(ctx, pctTexto(P), cx + m.wP / 2, y + h / 2 + m.fsP * 0.35, { font: FB(900, m.fsP), fill: P.ink, align: 'center' });
    cx += m.wP + m.gap;
  }
  if (m.cTxt) {
    rrPath(ctx, cx, y + h * 0.14, m.wC, h * 0.72, h * 0.36); ctx.fillStyle = vGrad(ctx, y, y + h, P.c2); ctx.fill();
    text(ctx, m.cTxt, cx + m.wC / 2, y + h / 2 + m.fsC * 0.35, { font: FB(900, m.fsC), fill: P.ink, align: 'center', tracking: 0.5 });
    cx += m.wC + m.gap;
  }
  if (str) {
    const dw = m.wD; rrPath(ctx, cx - h * 0.04, y + h * 0.14, dw, h * 0.72, h * 0.36); ctx.fillStyle = '#FFFFFF'; ctx.fill();
    iconCalendar(ctx, cx + h * 0.2, y + (h - h * 0.4) / 2 - 1, h * 0.4, P.ink, '#FFFFFF');
    text(ctx, str, cx + h * 0.2 + h * 0.4 + h * 0.18, y + h / 2 + m.fsD * m.alto, { font: m.fuente(m.fsD), fill: P.ink, tracking: m.fsD * 0.05 });
  }
  ctx.restore(); return w;
}
/** Fila de información: fechas y, si hay promo de pago, la barra grande de promo. Devuelve el borde inferior. */
function drawInfoRow(ctx, W, S, T, g) {
  const y0 = drawInfoRowCuerpo(ctx, W, S, T, g), yTop = g.y + barraOpciones(S).dy;
  HITS.push({ tipo: 'barra', i: 0, x: g.M, y: yTop - 4, w: W - 2 * g.M, h: y0 - yTop + 8 });   // clic en la barra: lleva a "Barra de la promo"
  return y0;
}
function drawInfoRowCuerpo(ctx, W, S, T, g) {
  const P = (S.promo || {}).verBarra === false ? null : promoInfo(S), M = g.M, avail = W - 2 * M, B = barraOpciones(S);
  const y = g.y + B.dy, gh = g.h * B.tam;
  const xDe = ancho => (B.alinear === 'izquierda' ? M : B.alinear === 'derecha' ? W - M - ancho : (W - ancho) / 2);
  const pildora = (yy, hh) => { const str = fechaPillTexto(S); if (str) drawDatePill(ctx, xDe(datePillAncho(ctx, str, hh)) + datePillAncho(ctx, str, hh) / 2, yy, hh, str, T); };
  if (!P) { pildora(y, gh); return y + gh; }
  const corto = fechaPillTexto(S, true);
  let h = gh * 1.3, m = barraPromoMedidas(ctx, P, corto, h, B.letra);
  while (m.total > avail && h > gh * 0.82) { h *= 0.96; m = barraPromoMedidas(ctx, P, corto, h, B.letra); }
  if (m.total <= avail) { drawBarraPromo(ctx, xDe(m.total), y, h, P, corto, m, T); return y + h; }
  const hh = gh * 1.05, m2 = barraPromoMedidas(ctx, P, '', hh, B.letra);              // no entra: la fecha va aparte, abajo
  const sc = Math.min(1, avail / m2.total);
  ctx.save(); ctx.translate(xDe(m2.total * sc), y); ctx.scale(sc, sc); drawBarraPromo(ctx, 0, 0, hh, P, '', m2, T); ctx.restore();
  const yb = y + hh * sc + 8;
  if (corto) pildora(yb, gh);
  return yb + (corto ? gh : 0);
}
