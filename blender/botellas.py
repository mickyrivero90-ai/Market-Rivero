"""
Rivero Market · botellas de ejemplo (genéricas, sin marcas) renderizadas con Cycles (CPU), fondo transparente.

Uso (desde la carpeta del proyecto):
  blender -b --factory-startup --python blender/botellas.py -- --only fernet --samples 24 --res 400x750 --outdir _trabajo/prev
  blender -b --factory-startup --python blender/botellas.py -- --samples 128          # todas, calidad final

Las etiquetas salen de blender/labels.py (PNG en blender/labels/).
"""
import bpy, bmesh, math, sys, os, argparse
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
ap = argparse.ArgumentParser()
ap.add_argument("--only", default="")
ap.add_argument("--samples", type=int, default=96)
ap.add_argument("--res", default="")
ap.add_argument("--outdir", default=os.path.join(HERE, "render"))
ap.add_argument("--save-blend", default="")
ap.add_argument("--ls", type=float, default=0.22, help="escala de intensidad de luces")
args = ap.parse_args(argv)
os.makedirs(args.outdir, exist_ok=True)


# ───────────────────────── utilidades ─────────────────────────
def srgb(h):
    if isinstance(h, str):
        h = h.lstrip("#"); r, g, b = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    else:
        r, g, b = [v / 255 for v in h]
    c = lambda x: x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4
    return (c(r), c(g), c(b), 1.0)


def clear_scene():
    for ob in list(bpy.data.objects): bpy.data.objects.remove(ob, do_unlink=True)
    for coll in (bpy.data.meshes, bpy.data.materials, bpy.data.lights, bpy.data.cameras, bpy.data.images, bpy.data.worlds):
        for it in list(coll): coll.remove(it)


def catmull(points, per=7):
    pts = [Vector(p) for p in points]; out = []; n = len(pts)
    for i in range(n - 1):
        p0 = pts[i - 1] if i > 0 else pts[i]
        p1, p2 = pts[i], pts[i + 1]
        p3 = pts[i + 2] if i + 2 < n else pts[i + 1]
        for k in range(per):
            t = k / per; t2 = t * t; t3 = t2 * t
            out.append(0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3))
    out.append(pts[-1])
    return out


def chain(*chains, per=7):
    """Une cadenas de puntos (r,z) en cm, cada una suavizada por separado (esquinas duras entre cadenas)."""
    prof = []
    for ch in chains:
        pts = catmull(ch, per) if len(ch) > 2 else [Vector(p) for p in ch]
        if prof and (prof[-1] - pts[0]).length < 1e-6: pts = pts[1:]
        prof += pts
    return prof


def offset_profile(prof, d):
    """Desplaza el perfil hacia adentro (normal saliente = (dz,-dr))."""
    out = []
    n = len(prof)
    for i, p in enumerate(prof):
        a = prof[max(i - 1, 0)]; b = prof[min(i + 1, n - 1)]
        t = (b - a)
        if t.length < 1e-9: out.append(p.copy()); continue
        t.normalize(); nrm = Vector((t.y, -t.x))
        out.append(p - nrm * d)
    return out


def lathe(name, prof_cm, steps=96):
    bm = bmesh.new(); rings = []
    angs = [2 * math.pi * j / steps for j in range(steps)]
    for (r, z) in prof_cm:
        r *= 0.01; z *= 0.01
        if r < 1e-7:
            v = bm.verts.new((0, 0, z)); rings.append([v] * steps)
        else:
            rings.append([bm.verts.new((r * math.cos(a), r * math.sin(a), z)) for a in angs])
    for i in range(len(prof_cm) - 1):
        for j in range(steps):
            vs = []
            for v in (rings[i][j], rings[i][(j + 1) % steps], rings[i + 1][(j + 1) % steps], rings[i + 1][j]):
                if v not in vs: vs.append(v)
            if len(vs) >= 3:
                try: bm.faces.new(vs)
                except ValueError: pass
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    ob = bpy.data.objects.new(name, me); bpy.context.collection.objects.link(ob)
    for p in me.polygons: p.use_smooth = True
    return ob


def label_band(name, r_cm, z0_cm, z1_cm, steps=192):
    """Etiqueta: banda cilíndrica con UV; costura atrás (+Y), frente (-Y) en U=0.5."""
    bm = bmesh.new(); uvl = bm.loops.layers.uv.new("UVMap")
    r = r_cm * 0.01; z0 = z0_cm * 0.01; z1 = z1_cm * 0.01
    r0, r1, uv = [], [], {}
    for j in range(steps + 1):
        th = math.pi / 2 + 2 * math.pi * j / steps
        a = bm.verts.new((r * math.cos(th), r * math.sin(th), z0)); b = bm.verts.new((r * math.cos(th), r * math.sin(th), z1))
        r0.append(a); r1.append(b); uv[a] = (j / steps, 0.0); uv[b] = (j / steps, 1.0)
    for j in range(steps):
        f = bm.faces.new((r0[j], r0[j + 1], r1[j + 1], r1[j]))
        for lp in f.loops: lp[uvl].uv = uv[lp.vert]
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    ob = bpy.data.objects.new(name, me); bpy.context.collection.objects.link(ob)
    for p in me.polygons: p.use_smooth = True
    return ob


def principled(mat):
    mat.use_nodes = True
    return next(n for n in mat.node_tree.nodes if n.type == "BSDF_PRINCIPLED")


def setin(b, names, value):
    for n in (names if isinstance(names, (list, tuple)) else [names]):
        if n in b.inputs:
            b.inputs[n].default_value = value; return True
    return False


def glass_mat(name, color, rough=0.03, ior=1.5):
    m = bpy.data.materials.new(name); b = principled(m)
    setin(b, "Base Color", srgb(color)); setin(b, "Roughness", rough); setin(b, "IOR", ior)
    setin(b, ["Transmission Weight", "Transmission"], 1.0); setin(b, "Metallic", 0.0)
    return m


def liquid_mat(name, color, opaque=False, ior=1.33):
    m = bpy.data.materials.new(name); b = principled(m)
    setin(b, "Base Color", srgb(color)); setin(b, "IOR", ior)
    if opaque:
        setin(b, "Roughness", 0.08); setin(b, ["Transmission Weight", "Transmission"], 0.0)
    else:
        setin(b, "Roughness", 0.0); setin(b, ["Transmission Weight", "Transmission"], 1.0)
    return m


def metal_mat(name, color, rough=0.28, metal=1.0, coat=0.0):
    m = bpy.data.materials.new(name); b = principled(m)
    setin(b, "Base Color", srgb(color)); setin(b, "Metallic", metal); setin(b, "Roughness", rough)
    setin(b, ["Coat Weight", "Clearcoat"], coat); setin(b, ["Coat Roughness", "Clearcoat Roughness"], 0.08)
    return m


def label_mat(name, path):
    m = bpy.data.materials.new(name); b = principled(m); nt = m.node_tree
    tex = nt.nodes.new("ShaderNodeTexImage"); tex.image = bpy.data.images.load(path)
    tex.image.colorspace_settings.name = "sRGB"; tex.interpolation = "Cubic"
    nt.links.new(tex.outputs["Color"], b.inputs["Base Color"])
    setin(b, "Roughness", 0.65)
    setin(b, ["Specular IOR Level", "Specular"], 0.12)
    return m


# ───────────────────────── geometría de botellas ─────────────────────────
PROFILES = {
    # (r, z) en cm
    "bordeaux": chain([(0, 0), (2.9, 0)], [(2.9, 0), (3.35, 0.08), (3.62, 0.4), (3.75, 1.0)], [(3.75, 1.0), (3.75, 18.8)],
                      [(3.75, 18.8), (3.72, 19.8), (3.5, 21.2), (3.0, 22.6), (2.35, 23.7), (1.9, 24.5), (1.63, 25.4), (1.52, 26.6)],
                      [(1.52, 26.6), (1.52, 28.5)], [(1.52, 28.5), (1.68, 28.75), (1.68, 29.45), (1.56, 29.85)]),
    "spirit": chain([(0, 0), (3.0, 0)], [(3.0, 0), (3.45, 0.12), (3.62, 0.6), (3.65, 1.4)], [(3.65, 1.4), (3.65, 13.0)],
                    [(3.65, 13.0), (3.6, 14.2), (3.4, 15.6), (3.0, 16.9), (2.4, 18.0), (1.9, 18.8), (1.55, 19.6), (1.45, 20.8)],
                    [(1.45, 20.8), (1.45, 22.4)], [(1.45, 22.4), (1.56, 22.6), (1.56, 23.2)]),
    "vodka": chain([(0, 0), (3.1, 0)], [(3.1, 0), (3.5, 0.15), (3.65, 0.7)], [(3.65, 0.7), (3.65, 15.5)],
                   [(3.65, 15.5), (3.55, 17.0), (3.2, 18.6), (2.5, 20.0), (1.9, 21.0), (1.55, 22.2), (1.5, 23.4)],
                   [(1.5, 23.4), (1.5, 25.0)], [(1.5, 25.0), (1.62, 25.2), (1.62, 25.8)]),
}
PROFILES["champagne"] = chain([(0, 0), (3.3, 0)], [(3.3, 0), (3.8, 0.1), (4.0, 0.5), (4.05, 1.2)], [(4.05, 1.2), (4.05, 15.5)],
                              [(4.05, 15.5), (3.95, 17.5), (3.5, 20.5), (2.8, 23.3), (2.1, 25.4), (1.75, 26.8), (1.6, 28.0)], [(1.6, 28.0), (1.6, 29.2)],
                              [(1.6, 29.2), (1.85, 29.45), (1.85, 30.1), (1.7, 30.4)])
PROFILES["can"] = chain([(0, 0.55), (2.4, 0.4), (2.9, 0.0)], [(2.9, 0.0), (3.15, 0.0), (3.3, 0.55)], [(3.3, 0.55), (3.3, 14.3)],
                        [(3.3, 14.3), (3.2, 14.8), (2.95, 15.1), (2.9, 15.3)], [(2.9, 15.3), (3.0, 15.4), (3.0, 15.55), (2.7, 15.55)], [(2.7, 15.55), (0, 15.55)])
HEIGHT = {"bordeaux": 30.1, "spirit": 24.7, "vodka": 27.2, "champagne": 31.6, "can": 15.6}
WALL = 0.25   # cm de vidrio


def build_bottle(spec, x_m=0.0):
    shape = spec["shape"]; prof = PROFILES[shape]
    objs = []
    if shape == "can":                                   # lata: sólido metálico + etiqueta impresa
        can = lathe("lata", [tuple(p) for p in prof])
        can.data.materials.append(metal_mat("alu_" + spec["name"], "#d9dde2", 0.26, 1.0)); objs.append(can)
        lb = spec["label"]
        lab = label_band("etiqueta", 3.3 + 0.02, lb["z0"], lb["z0"] + lb["h"])
        lm = label_mat("lab_" + spec["name"], os.path.join(HERE, "labels", lb["file"] + ".png")); b = principled(lm)
        setin(b, "Metallic", 0.45); setin(b, "Roughness", 0.34); lab.data.materials.append(lm); objs.append(lab)
        for ob in objs: ob.location.x = x_m
        return objs
    # vidrio (cáscara con grosor)
    glass = lathe("vidrio", [tuple(p) for p in prof])
    sol = glass.modifiers.new("grosor", "SOLIDIFY"); sol.thickness = WALL * 0.01; sol.offset = -1; sol.use_rim = True
    glass.data.materials.append(glass_mat("g_" + spec["name"], spec["glass"], spec.get("glass_rough", 0.03)))
    objs.append(glass)
    # líquido
    inner = offset_profile(prof, WALL + 0.03)
    fill = spec["fill"]; liq = []
    for p in inner:
        if p.y <= fill: liq.append((max(p.x, 0.0), p.y))
        else:
            if liq:
                a = Vector(liq[-1]); b = p; t = (fill - a.y) / (b.y - a.y) if b.y != a.y else 0
                liq.append((a.x + (b.x - a.x) * t, fill))
            break
    liq[0] = (0.0, liq[0][1]); liq.append((0.0, fill))
    liquid = lathe("liquido", liq)
    liquid.data.materials.append(liquid_mat("l_" + spec["name"], spec["liquid"], spec.get("liquid_opaque", False)))
    objs.append(liquid)
    # etiqueta
    lb = spec["label"]
    body_r = max(p.x for p in prof)   # el cuerpo recto es lo más ancho
    lab = label_band("etiqueta", body_r + 0.03, lb["z0"], lb["z0"] + lb.get("h", 9.75))
    lab.data.materials.append(label_mat("lab_" + spec["name"], os.path.join(HERE, "labels", lb["file"] + ".png")))
    objs.append(lab)
    # tapa / cápsula
    cap = spec["cap"]; r = cap["r"]; z0, z1 = cap["z0"], cap["z1"]
    if cap.get("foil"):                                  # cápsula que sigue la forma del cuello (espumante)
        out = [p for p in offset_profile(prof, -0.07) if p.y >= z0]
        top = max(p.y for p in prof)
        fprof = [(p.x, p.y) for p in out] + [(out[-1].x + 0.06, top + 0.1), (out[-1].x, z1 - 0.2), (out[-1].x - 0.5, z1), (0, z1)]
        fo = lathe("capsula", fprof)
        fo.data.materials.append(metal_mat("foil_" + spec["name"], cap["color"], cap.get("rough", 0.3), 1.0))
        for ob in [fo]: ob.location.x = x_m
        objs.append(fo)
        for ob in objs: ob.location.x = x_m
        return objs
    cprof = chain([(0, z0), (r - 0.1, z0)], [(r - 0.1, z0), (r, z0 + 0.12)], [(r, z0 + 0.12), (r, z1 - 0.35)],
                  [(r, z1 - 0.35), (r - 0.12, z1 - 0.1), (r - 0.4, z1)], [(r - 0.4, z1), (0, z1)])
    capo = lathe("tapa", [(p.x, p.y) if hasattr(p, "x") else p for p in cprof], steps=96)
    capo.data.materials.append(metal_mat("cap_" + spec["name"], cap["color"], cap.get("rough", 0.28), cap.get("metal", 1.0), cap.get("coat", 0.0)))
    objs.append(capo)
    if cap.get("band"):
        bprof = chain([(0, z0), (r + 0.015, z0)], [(r + 0.015, z0), (r + 0.015, z0 + 0.55)], [(r + 0.015, z0 + 0.55), (0, z0 + 0.55)])
        band = lathe("banda", [(p.x, p.y) for p in bprof], steps=96)
        band.data.materials.append(metal_mat("band_" + spec["name"], cap["band"], 0.22, 1.0))
        objs.append(band)
    for ob in objs: ob.location.x = x_m
    return objs


# ───────────────────────── escena ─────────────────────────
def add_area(name, loc, target, sx, sy, energy, color=(1, 1, 1)):
    ld = bpy.data.lights.new(name, "AREA"); ld.shape = "RECTANGLE"; ld.size = sx; ld.size_y = sy; ld.energy = energy; ld.color = color
    ob = bpy.data.objects.new(name, ld); bpy.context.collection.objects.link(ob); ob.location = loc
    ob.rotation_euler = (Vector(target) - Vector(loc)).to_track_quat("-Z", "Y").to_euler()
    return ob


def add_flag(name, loc, target, sx, sy):
    me = bpy.data.meshes.new(name)
    bm = bmesh.new(); bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=1.0); bm.to_mesh(me); bm.free()
    ob = bpy.data.objects.new(name, me); bpy.context.collection.objects.link(ob)
    ob.scale = (sx / 2, sy / 2, 1); ob.location = loc
    ob.rotation_euler = (Vector(target) - Vector(loc)).to_track_quat("Z", "Y").to_euler()
    m = bpy.data.materials.new(name); b = principled(m); setin(b, "Base Color", (0.003, 0.003, 0.003, 1)); setin(b, "Roughness", 0.9)
    me.materials.append(m)
    ob.visible_camera = False
    return ob


def setup_scene(height_cm, frame_w, frame_h, samples, bottle_w_cm):
    sc = bpy.context.scene
    sc.render.engine = "CYCLES"; sc.cycles.device = "CPU"
    sc.cycles.samples = samples; sc.cycles.use_adaptive_sampling = True; sc.cycles.adaptive_threshold = 0.02
    sc.cycles.use_denoising = True
    try: sc.cycles.denoiser = "OPENIMAGEDENOISE"
    except Exception: pass
    sc.cycles.max_bounces = 16; sc.cycles.transmission_bounces = 16; sc.cycles.glossy_bounces = 6; sc.cycles.transparent_max_bounces = 16
    sc.cycles.sample_clamp_indirect = 6; sc.cycles.caustics_reflective = False; sc.cycles.caustics_refractive = False
    sc.render.film_transparent = True
    sc.render.resolution_x, sc.render.resolution_y = frame_w, frame_h; sc.render.resolution_percentage = 100
    sc.render.image_settings.file_format = "PNG"; sc.render.image_settings.color_mode = "RGBA"; sc.render.image_settings.color_depth = "8"
    for vt in ("Khronos PBR Neutral", "Standard"):
        try: sc.view_settings.view_transform = vt; break
        except TypeError: continue
    try: sc.view_settings.look = "None"
    except Exception: pass
    # mundo: blanco suave
    w = bpy.data.worlds.new("Estudio"); w.use_nodes = True; sc.world = w
    bg = next(n for n in w.node_tree.nodes if n.type == "BACKGROUND")
    bg.inputs["Color"].default_value = (1, 1, 1, 1)
    # fondo brillante solo para la luz que atraviesa el vidrio (líquidos translúcidos "brillan");
    # reflejos y luz difusa usan un ambiente tenue para no lavar el contraste
    nt = w.node_tree
    lp = nt.nodes.new("ShaderNodeLightPath"); mad = nt.nodes.new("ShaderNodeMath"); mad.operation = "MULTIPLY_ADD"
    lo, hi = 0.9 * args.ls, 1.25
    mad.inputs[1].default_value = hi - lo; mad.inputs[2].default_value = lo
    nt.links.new(lp.outputs["Is Transmission Ray"], mad.inputs[0]); nt.links.new(mad.outputs["Value"], bg.inputs["Strength"])
    # cámara tele
    cd = bpy.data.cameras.new("Cam"); cd.lens = 200; cd.sensor_fit = "VERTICAL"; cd.sensor_height = 36
    cam = bpy.data.objects.new("Cam", cd); bpy.context.collection.objects.link(cam); sc.camera = cam
    H = height_cm * 0.01
    vis_h = H * 1.17
    dist = vis_h * 200 / 36
    cam.location = (0, -dist, H * 0.60)
    cam.rotation_euler = (Vector((0, 0, H * 0.50)) - cam.location).to_track_quat("-Z", "Y").to_euler()
    # luces de estudio
    c = Vector((0, 0, H * 0.5))
    L = args.ls
    add_area("key", (-0.95, -0.95, H * 2.4), c, 1.3, 1.3, 170 * L)
    add_area("tira_izq", (-0.55, 0.05, H * 0.55), c, 0.10, H * 4.0, 150 * L)
    add_area("tira_der", (0.62, 0.15, H * 0.55), c, 0.10, H * 4.0, 130 * L)
    add_area("tope", (0.0, -0.3, H * 3.2), c, 0.9, 0.9, 60 * L)
    add_area("relleno", (0.5, -1.4, H * 0.7), c, 1.0, 1.0, 24 * L)
    # banderas negras: dan el borde oscuro clásico al vidrio
    bw = max(bottle_w_cm * 0.01, 0.075)
    add_flag("flag_izq", (-(bw / 2 + 0.17), -0.20, H * 0.5), (0, 0, H * 0.5), 0.14, H * 1.5)
    add_flag("flag_der", ((bw / 2 + 0.17), -0.20, H * 0.5), (0, 0, H * 0.5), 0.14, H * 1.5)
    return sc


SPECS = {
    "fernet": dict(res="800x1500", bottles=[dict(shape="spirit", glass="#24150b", glass_rough=0.04, liquid="#0b0705", liquid_opaque=True, fill=21.0,
                   cap=dict(r=1.66, z0=21.0, z1=24.7, color="#08080a", metal=0.0, rough=0.42, coat=0.25, band="#d4aa4e"), label=dict(file="fernet", z0=3.0, z1=12.6))]),
    "vodka_azul": dict(res="800x1500", bottles=[dict(shape="vodka", glass="#0d2fa0", liquid="#eef6ff", fill=24.0,
                   cap=dict(r=1.7, z0=23.9, z1=27.2, color="#c9ced6", metal=1.0, rough=0.22), label=dict(file="vodka_azul", z0=3.2, z1=12.8))]),
    "aperitivo_verde": dict(res="800x1500", bottles=[dict(shape="spirit", glass="#1d6a30", liquid="#c28a10", fill=21.2,
                   cap=dict(r=1.64, z0=21.0, z1=24.7, color="#c9ced6", metal=1.0, rough=0.22), label=dict(file="aperitivo_verde", z0=3.4, z1=13.0))]),
    "vodka_frambuesa": dict(res="800x1500", bottles=[dict(shape="vodka", glass="#f4f9ff", liquid="#ffd9e2", fill=24.0,
                   cap=dict(r=1.7, z0=23.9, z1=27.2, color="#d01a2c", metal=0.0, rough=0.28, coat=0.7), label=dict(file="vodka_frambuesa", z0=3.0, z1=12.8))]),
    "rosado_frutos": dict(res="800x1500", bottles=[dict(shape="bordeaux", glass="#eef6ff", liquid="#ffb0c8", fill=27.4,
                   cap=dict(r=1.76, z0=26.0, z1=30.1, color="#c2185b", metal=1.0, rough=0.3), label=dict(file="rosado_frutos", z0=5.0, z1=14.0))]),
    "tinto_blanco": dict(res="1300x1500", bottles=[
                   dict(x=-0.047, shape="bordeaux", glass="#10301c", liquid="#2a0509", liquid_opaque=True, fill=27.4,
                        cap=dict(r=1.76, z0=26.0, z1=30.1, color="#7a0f1e", metal=1.0, rough=0.3), label=dict(file="tinto", z0=5.0, z1=14.0)),
                   dict(x=0.047, shape="bordeaux", glass="#b5d9a8", liquid="#ecdc8e", fill=27.4,
                        cap=dict(r=1.76, z0=26.0, z1=30.1, color="#d8c070", metal=1.0, rough=0.3), label=dict(file="blanco", z0=5.0, z1=14.0))]),
    "tinto_clasico": dict(res="800x1500", bottles=[dict(shape="bordeaux", glass="#10301c", liquid="#2a0509", liquid_opaque=True, fill=27.4,
                   cap=dict(r=1.76, z0=26.0, z1=30.1, color="#0c0c0d", metal=0.5, rough=0.34, coat=0.2), label=dict(file="tinto_clasico", z0=5.0, z1=14.0))]),
    "espumante": dict(res="800x1560", bottles=[dict(shape="champagne", glass="#0f2a17", liquid="#c9b45a", liquid_opaque=True, fill=27.0,
                   cap=dict(r=2.0, z0=22.0, z1=31.6, color="#d8b24a", foil=True, rough=0.28), label=dict(file="espumante", z0=5.0))]),
    "cerveza": dict(res="620x1300", bottles=[dict(shape="can", glass="#ffffff", liquid="#ffffff", fill=1.0,
                   cap=dict(r=1, z0=0, z1=1), label=dict(file="cerveza", z0=1.0, h=13.2))]),
    "rosado_negro": dict(res="800x1500", bottles=[dict(shape="bordeaux", glass="#eef6ff", liquid="#ffb8cf", fill=27.4,
                   cap=dict(r=1.76, z0=26.0, z1=30.1, color="#0c0c0d", metal=0.5, rough=0.34, coat=0.2), label=dict(file="rosado_negro", z0=5.0, z1=14.0))]),
}


def run():
    names = [n for n in SPECS if (not args.only or n in args.only.split(","))]
    for name in names:
        S = SPECS[name]
        clear_scene()
        res = args.res or S["res"]
        fw, fh = [int(v) for v in res.lower().split("x")]
        height = max(HEIGHT[b["shape"]] for b in S["bottles"])
        bw = (max(abs(b.get("x", 0)) for b in S["bottles"]) * 2 * 100) + 7.5
        sc = setup_scene(height, fw, fh, args.samples, bw)
        for i, b in enumerate(S["bottles"]):
            b = dict(b); b["name"] = f"{name}{i}"
            build_bottle(b, b.get("x", 0.0))
        out = os.path.join(args.outdir, name + ".png")
        sc.render.filepath = out
        bpy.ops.render.render(write_still=True)
        print("RENDER OK", out)
        if args.save_blend and name == names[-1]:
            bpy.ops.wm.save_as_mainfile(filepath=args.save_blend)


run()
