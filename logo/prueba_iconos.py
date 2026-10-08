import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib_logo import *
ORANGE="#EE5A12"; YELLOW="#FFC400"; BROWN="#4A1500"; WHITE="#FFFFFF"
mont9 = Face("static/Montserrat-900.ttf")

def badge(inner, ring=WHITE, fill=YELLOW):
    return f'<circle cx="100" cy="100" r="99" fill="{ring}"/><circle cx="100" cy="100" r="90" fill="{fill}"/>{inner}'

def icon_A(fg=BROWN, knock=YELLOW):
    rd, rw = mont9.path("R", 50, 114, 0, anchor="middle")
    # baseline: centrar R verticalmente en la canasta (centro y≈89)
    rd, rw = mont9.path("R", 50, 114, 89 + mont9.cap*50/2, anchor="middle")
    return f'''<g fill="{fg}" stroke="{fg}" stroke-linecap="round" stroke-linejoin="round">
<path d="M30 54 H52 L70 128 H158" fill="none" stroke-width="13"/>
<path d="M58 64 H172 L155 112 H68 Z" stroke-width="9"/>
<circle cx="90" cy="152" r="11" stroke="none"/><circle cx="140" cy="152" r="11" stroke="none"/></g>
<path d="{rd}" fill="{knock}"/>'''

def icon_B(fg=BROWN, line=YELLOW):
    return f'''<g stroke="{fg}" stroke-linecap="round" stroke-linejoin="round" stroke-width="15" fill="none">
<path d="M30 50 H62 V140"/>
<path d="M62 50 H150 L135 106 H62" fill="{fg}"/>
<path d="M98 106 L134 146"/></g>
<circle cx="62" cy="160" r="13" fill="{fg}"/><circle cx="144" cy="160" r="13" fill="{fg}"/>
<g stroke="{line}" stroke-width="5" stroke-linecap="round"><path d="M90 60 V98"/><path d="M118 60 V98"/></g>'''

def sheet():
    cells=[]
    for i,(name,fn) in enumerate((("A",icon_A),("B",icon_B))):
        for j,(sz) in enumerate((340,120,56)):
            x = 20 + i*400; y = 20 + [0,370,500][j]
            cells.append(f'<svg x="{x}" y="{y}" width="{sz}" height="{sz}" viewBox="0 0 200 200">{badge(fn())}</svg>')
    return f'<svg xmlns="http://www.w3.org/2000/svg" width="820" height="600" viewBox="0 0 820 600"><rect width="820" height="600" fill="{ORANGE}"/>{"".join(cells)}</svg>'
out=os.path.join(ROOT,"_trabajo","iconos_prueba.svg"); open(out,"w").write(sheet())
shot(out, os.path.join(ROOT,"_trabajo","iconos_prueba.png"), 820, 600); print("ok")
