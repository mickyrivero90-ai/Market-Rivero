// ───────────────────────── estado y datos de ejemplo ─────────────────────────
const ESTADO_VERSION = 7;
const LEGALES_VIEJO = 'Imágenes ilustrativas. Precios finales en pesos argentinos.';   // hasta la v3.0 (ahora «precios finales» ya va en la letra chica)

// `archivo` = ruta de la foto dentro de la carpeta "productos" (programa local); `img` = foto incrustada (página suelta).
const nuevoProducto = (o = {}) => ({ id: uid(), nombre: '', desc: '', regular: '', pct: '', final: '', unidad: '', etiqueta: '', nota: '', pago: '', img: null, imgV: 0, archivo: null, mtime: null, demo: null, recordado: false, alfa: false, quitarFondo: false, tol: 40, zoom: 1, dx: 0, dy: 0, ...o });
const nuevaFoto = (o = {}) => ({ id: uid(), img: null, imgV: 0, archivo: null, mtime: null, demo: null, alfa: false, quitarFondo: false, tol: 40, titulo: '', ...o });

/** Los 8 productos del folleto original (precios del local), con botellas de muestra en vez de fotos reales, y 2 inventados para completar 10. */
function productosDemo() {
  const A = (typeof ASSETS !== 'undefined' && ASSETS.productos) || {};
  // precios de oferta (los del folleto anterior); el descuento de Mercado Pago se calcula aparte
  const d = [
    ['Fernet Branca 750 ml', 'Botella 750 ml', '18540', 'fernet'],
    ['Vino Colón Frutos Rojos 750 ml', 'Rosado · botella 750 ml', '6930', 'rosado_frutos'],
    ['SKY Infusions Cosmic 750 ml', 'Vodka saborizada', '10710', 'vodka_azul'],
    ['Vino Canciller', 'Tinto o blanco', '2520', 'tinto_blanco'],
    ['Gancia Americano', 'Aperitivo', '7470', 'aperitivo_verde'],
    ['Viñas de Balbo Clásico', 'Vino tinto', '2970', 'tinto_clasico'],
    ['Smirnoff Raspberry', 'Vodka sabor frambuesa', '10530', 'vodka_frambuesa'],
    ['Vino Dilema Rosado', 'Botella 750 ml', '3420', 'rosado_negro'],
    ['Espumante Brut 750 ml', 'Para brindar con mamá', '6120', 'espumante'],
    ['Cerveza rubia lata 473 ml', 'Bien fría', '1710', 'cerveza'],
  ];
  const normal = ['20.600', '7.700', '11.900', '2.800', '8.300', '3.300', '11.700', '3.800', '6.800', '1.900'];   // precio normal del folleto anterior
  return d.map(([nombre, desc, final, demo], i) => nuevoProducto({ nombre, desc, regular: normal[i], pct: '10', final: precioATexto(ofertaDesde(normal[i], '10')), img: A[demo] || null, demo }));
}

const WA_CANAL = 'https://whatsapp.com/channel/0029VauDHnQHFxOtGnhaa53E';   // leído del QR del cartel del local

function estadoDemo() {
  const C = (typeof ASSETS !== 'undefined' && ASSETS.colecciones) || {};
  return {
    v: ESTADO_VERSION,
    formato: 'a4_10',
    tema: 'madre',
    titulo: 'Especial Día de la Madre',
    subtitulo: 'Regalale lo mejor',
    sello: { modo: 'auto', l1: '', l2: '', l3: '' },
    vigencia: { desde: '', hasta: '2026-10-18', agotar: true },
    promo: { tipo: 'mp', pct: '10', cuotas: '', texto: '', textoBarra: '', verBarra: true, etiqueta: '', logo: '', modo: 'incluido', verPrecio: true, barra: { tam: 1, letra: 'mont', alinear: 'centro', dy: 0 } },
    precio: { antes: 'antes', etiqueta: 'FINAL', ahorro: true, grande: true, insignia: 1.3, placa: 1, ahorroTam: 1 },
    pagos: { ver: false, lista: ['efectivo', 'debito', 'credito', 'mp', 'transferencia'], textos: {} },
    mensaje: { kicker: '¡Aprovechá!', titulo: 'Descuento en todos los productos', grande: '', grande2: '', condicion: '', texto: 'Válido para todas tus compras en el local.' },
    destacado: { mensaje: 'OFERTA IMPERDIBLE', mensaje2: 'SOLO EN EFECTIVO' },
    legal: { banda: true, bandaTam: 1, letraChica: true, alcohol: 'no', stock: '' },
    opciones: { pdf: true, destinos: ['a4', 'post', 'story'] },
    coleccion: {
      mensaje: 'Aquí tenemos todos los productos para tus recetas', kicker: 'Para reposteras y reposteros', ocasion: 'Especial Día de la Madre',
      pie: 'Imágenes ilustrativas. Consultá disponibilidad y precios en el local.', alcohol: false,
      fotos: [nuevaFoto({ img: C.reposteria_1 || null, demo: 'reposteria_1', alfa: true, titulo: 'Coberturas, decoración y esencias' }),
        nuevaFoto({ img: C.reposteria_2 || null, demo: 'reposteria_2', alfa: true, titulo: 'Lácteos, harinas y grasas' }), nuevaFoto()],
    },
    avisoEjemplo: true,
    comercio: {
      nombre: 'Rivero Market',
      direccion: 'Barrio San José, Avenida Solís Pizarro 1430',
      facebook: 'Fiambrería Rivero',
      telefono: '',
      waCanal: WA_CANAL,
      qrUrl: '',
      consulta: 'Facebook: Fiambrería Rivero',
      razon: '', cuit: '',
      legales: 'Imágenes ilustrativas.',
    },
    productos: [...productosDemo(), ...Array.from({ length: MAX_SLOTS - 10 }, () => nuevoProducto())],
  };
}

/** Folleto en blanco: conserva formato, tema, promo, datos del local y legales; vacía productos, fotos y fechas. */
function estadoNuevo(S) {
  const T = THEMES[S.tema] || THEMES.naranja;
  return normalizarEstado({
    ...S,
    titulo: T.titulo || 'Ofertas de la semana',
    subtitulo: T.grupo !== 'marca' && T.subtitulo ? T.subtitulo : 'Los precios más bajos del barrio',
    vigencia: { desde: '', hasta: '', agotar: !!(S.vigencia && S.vigencia.agotar) },
    productos: Array.from({ length: MAX_SLOTS }, () => nuevoProducto()),
    coleccion: { ...S.coleccion, fotos: [nuevaFoto(), nuevaFoto(), nuevaFoto()] },
    avisoEjemplo: false,
  });
}

/** Las fotos de muestra no se guardan en el archivo del estado (se recuperan solas): así queda liviano. */
function estadoParaGuardar(S) {
  const sinDemo = o => (o.demo && !o.archivo ? { ...o, img: null } : o);
  return { ...S, productos: S.productos.map(sinDemo), coleccion: { ...S.coleccion, fotos: S.coleccion.fotos.map(sinDemo) } };
}

/** Completa un estado viejo o parcial con los campos nuevos. */
function normalizarEstado(S, op = {}) {
  const base = estadoDemo(), A = (typeof ASSETS !== 'undefined' && ASSETS) || {};
  const out = { ...base, ...S };
  const recuperar = (o, tabla) => { if (o.demo && !o.img && !o.archivo) o.img = (tabla || {})[o.demo] || null; return o; };
  out.sello = { ...base.sello, ...(S.sello || {}) };
  out.vigencia = { ...base.vigencia, ...(S.vigencia || {}) };
  out.promo = { ...base.promo, ...(S.promo || {}) };
  out.promo.barra = { ...base.promo.barra, ...((S.promo || {}).barra || {}) };
  out.destacado = { ...base.destacado, ...(S.destacado || {}) };
  out.legal = { ...base.legal, ...(S.legal || {}) };
  if (!(S.v >= 6) && out.promo.modo === 'extra') out.promo.modo = 'incluido';   // v2.1: el % ya está en el precio final; nunca se suma otro descuento sin querer
  if (!(S.v >= 5)) { out.legal.alcohol = 'no'; if (S.coleccion) S.coleccion.alcohol = false; }   // v2.0: la leyenda de alcohol viene apagada (se puede volver a activar en Legales)
  out.opciones = { ...base.opciones, ...(S.opciones || {}) };
  out.precio = { ...base.precio, ...(S.precio || {}) };
  out.pagos = { ...base.pagos, ...(S.pagos || {}), textos: { ...((S.pagos || {}).textos || {}) } };
  out.mensaje = { ...base.mensaje, ...(S.mensaje || {}) };
  out.coleccion = { ...base.coleccion, ...(S.coleccion || {}) };
  out.coleccion.fotos = ((S.coleccion && S.coleccion.fotos) || base.coleccion.fotos).map(f => recuperar(nuevaFoto(f), A.colecciones));
  while (out.coleccion.fotos.length < 3) out.coleccion.fotos.push(nuevaFoto());
  out.comercio = { ...base.comercio, ...(S.comercio || {}) };
  if (!(S.v >= 7) && out.comercio.legales === LEGALES_VIEJO) out.comercio.legales = base.comercio.legales;   // v3.1: sin repetir «precios finales» en la letra chica
  if (/facebook\.com\/search/.test(out.comercio.qrUrl || '')) out.comercio.qrUrl = '';   // era un marcador de posición
  if (!out.comercio.waCanal) out.comercio.waCanal = WA_CANAL;
  if (out.formato === 'cartel_1') out.formato = 'destacado_a4';
  if (out.formato === 'a4_10_tema') out.formato = 'a4_10';             // el "temático" ahora es el mismo de 10: cualquier fondo sirve en cualquier formato
  if (!LAYOUTS[out.formato]) out.formato = 'a4_10';
  if (!THEMES[out.tema]) out.tema = 'naranja';
  out.avisoEjemplo = S.avisoEjemplo !== false;
  const prods = (S.productos || []).map(p => recuperar(nuevoProducto(p), A.productos));
  out.productos = op.compactar === false ? prods : [...prods.filter(p => !productoVacio(p)), ...prods.filter(p => productoVacio(p))];   // los casilleros vacíos van al final
  while (out.productos.length < MAX_SLOTS) out.productos.push(nuevoProducto());
  out.v = ESTADO_VERSION;
  return out;
}

/** Carga de recursos de marca y fuentes (antes del primer dibujo). */
async function cargarRecursos() {
  const specs = ['900 20px "RM Barlow"', 'italic 900 20px "RM Barlow"', '800 20px "RM Barlow"', 'italic 800 20px "RM Barlow"', '700 20px "RM Barlow"', 'italic 700 20px "RM Barlow"', '600 20px "RM Barlow"',
    '500 20px "RM Mont"', '600 20px "RM Mont"', '700 20px "RM Mont"', '800 20px "RM Mont"', '900 20px "RM Mont"'];
  await Promise.all(specs.map(f => document.fonts.load(f, 'ÁÉÍÓÚÑ$%0123456789')));
  await document.fonts.ready;
  RES.logoH = await cargarImagen(ASSETS.logos.horizontal);
  RES.logoV = await cargarImagen(ASSETS.logos.vertical);
  RES.insignia = await cargarImagen(ASSETS.logos.insignia);
}
