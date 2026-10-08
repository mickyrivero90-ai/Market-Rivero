import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib_logo import *
from marca import ORANGE, YELLOW, RED, BROWN, CREAM
HERE = os.path.dirname(os.path.abspath(__file__))
html = f'''<!doctype html><meta charset="utf-8"><style>
@font-face{{font-family:Mont;src:url("../_trabajo/fonts/Montserrat-VF.ttf");font-weight:100 900}}
*{{box-sizing:border-box}} body{{margin:0;width:1600px;background:#FFF6E5;font-family:Mont,sans-serif;color:{BROWN}}}
.wrap{{padding:56px 64px 64px}} h1{{font-weight:900;font-size:44px;margin:0;letter-spacing:-.5px}} .sub{{font-weight:600;font-size:20px;opacity:.7;margin:6px 0 34px}}
.row{{display:grid;gap:28px}} .card{{border-radius:28px;overflow:hidden;position:relative}} .lab{{position:absolute;left:24px;top:20px;font-weight:800;font-size:15px;letter-spacing:.2em;text-transform:uppercase;padding:7px 14px;border-radius:99px}}
.pad{{display:flex;align-items:center;justify-content:center}} img{{display:block}}
.k{{font-weight:800;font-size:15px;letter-spacing:.18em;text-transform:uppercase;opacity:.65;margin:34px 0 14px}}
ul{{margin:0;padding:0;list-style:none;display:grid;grid-template-columns:1fr 1fr;gap:16px 40px}} li{{font-size:19px;line-height:1.4;font-weight:500;padding-left:44px;position:relative}} li b{{font-weight:800}}
li:before{{content:attr(data-n);position:absolute;left:0;top:0;width:30px;height:30px;border-radius:50%;background:{ORANGE};color:#fff;font-weight:800;font-size:16px;display:flex;align-items:center;justify-content:center}}
.sw{{display:flex;gap:16px}} .sw div{{flex:1;border-radius:20px;padding:70px 16px 14px;font-weight:700;font-size:15px;line-height:1.35}} .sw b{{display:block;font-size:17px;font-weight:800}}
</style><div class="wrap">
<h1>Rivero Market · propuesta de identidad</h1><div class="sub">Logo mejorado a partir del que armaron con tu hermano · todo en vectores (se escala sin perder calidad)</div>
<div class="row" style="grid-template-columns:1fr 1.25fr">
 <div class="card pad" style="background:#EA571B;height:380px"><span class="lab" style="background:rgba(0,0,0,.28);color:#fff">Antes</span><img src="original_referencia.png" style="width:100%;height:100%;object-fit:contain"></div>
 <div class="card pad" style="background:{ORANGE};height:380px"><span class="lab" style="background:{YELLOW};color:{BROWN}">Ahora</span><img src="rivero-market_horizontal_sobre-naranja.svg" style="width:88%"></div>
</div>
<div class="k">Qué mejoré</div>
<ul>
<li data-n="1"><b>Insignia en vez de carrito suelto.</b> El carrito ahora vive dentro de un círculo con aro blanco: ya no se pega a la “O” y se reconoce hasta en la foto de perfil de WhatsApp.</li>
<li data-n="2"><b>La R como negativo.</b> En el carrito original la R repetía la del nombre; ahora está recortada en la canasta y suma identidad sin duplicar.</li>
<li data-n="3"><b>“MARKET” en etiqueta de precio.</b> Una etiqueta con agujerito: dice “ofertas” sin decirlo y arma un bloque prolijo bajo RIVERO.</li>
<li data-n="4"><b>Contraste y versiones.</b> Naranja apenas más profundo (el blanco pasa de 3,57:1 a 3,82:1) y versiones para fondo claro, oscuro y blanco, horizontal y vertical.</li>
</ul>
<div class="k">Versiones</div>
<div class="row" style="grid-template-columns:1.2fr 1.2fr 1fr 0.8fr 0.7fr">
 <div class="card pad" style="background:#fff;height:240px;border:2px solid #f0e2c8"><img src="rivero-market_horizontal_sobre-claro.svg" style="width:86%"></div>
 <div class="card pad" style="background:#2A0F05;height:240px"><img src="rivero-market_horizontal_sobre-oscuro.svg" style="width:86%"></div>
 <div class="card pad" style="background:{RED};height:240px"><img src="rivero-market_horizontal_blanco.svg" style="width:86%"></div>
 <div class="card pad" style="background:{ORANGE};height:240px"><img src="rivero-market_vertical_sobre-naranja.svg" style="width:86%"></div>
 <div class="card pad" style="background:#fff;height:240px;border:2px solid #f0e2c8;flex-direction:column;gap:14px"><img src="rivero-market_icono-perfil.svg" style="width:120px"><div style="display:flex;gap:12px;align-items:end"><img src="rivero-market_icono-perfil.svg" style="width:56px"><img src="rivero-market_icono-perfil.svg" style="width:36px"><img src="rivero-market_icono-perfil.svg" style="width:24px"></div></div>
</div>
<div class="k">Paleta</div>
<div class="sw">
 <div style="background:{ORANGE};color:#fff"><b>Naranja Rivero</b>{ORANGE}</div>
 <div style="background:{YELLOW};color:{BROWN}"><b>Amarillo Oferta</b>{YELLOW}</div>
 <div style="background:{RED};color:#fff"><b>Rojo Precio</b>{RED}</div>
 <div style="background:{BROWN};color:#fff"><b>Marrón Chocolate</b>{BROWN}</div>
 <div style="background:{CREAM};color:{BROWN};border:2px solid #f0e2c8"><b>Crema</b>{CREAM}</div>
</div></div>'''
p = os.path.join(HERE, "lamina_logo.html"); open(p, "w").write(html)
out = os.path.join(ROOT, "salidas", "01_logo_propuesta.png")
shot(p, out, 1600, 1400); print("ok", out)
