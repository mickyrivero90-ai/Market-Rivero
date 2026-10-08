// ───────────────────────── programa local: servidor, buscador de la carpeta, finalizar ─────────────────────────
const MSJ_SIN_PROGRAMA = 'No pude hablar con el programa. ¿Se cerró? Abrilo de nuevo con el ícono «Folletos Rivero Market» del Escritorio.';
const sinTildes = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

const API = {
  activo: false, info: null,
  /** ¿Estamos dentro del programa local (servidor.py)? En la página suelta o en el visor, no. */
  async iniciar() {
    try {
      const r = await fetch('/api/hola', { cache: 'no-store' });
      if (r.ok) { const d = await r.json(); if (d && d.programa === 'rivero-market') { this.activo = true; this.info = d; } }
    } catch (e) { this.activo = false; }
    return this.activo;
  },
  async pedir(metodo, ruta, cuerpo, cab = {}) {
    let r;
    try { r = await fetch(ruta, { method: metodo, body: cuerpo, headers: { 'X-Rivero': '1', ...cab } }); } catch (e) { throw new Error(MSJ_SIN_PROGRAMA); }
    if (!r.ok) { let m = ''; try { m = (await r.json()).error; } catch (e) { /* sin detalle */ } throw new Error(m || 'Error ' + r.status); }
    return r;
  },
  async json(ruta) {
    let r;
    try { r = await fetch(ruta, { cache: 'no-store' }); } catch (e) { throw new Error(MSJ_SIN_PROGRAMA); }
    if (!r.ok) throw new Error('Error ' + r.status);
    return r.json();
  },
  put(ruta, obj) { return this.pedir('PUT', ruta, JSON.stringify(obj), { 'Content-Type': 'application/json' }).then(r => r.json()); },
  productos() { return this.json('/api/productos'); },
  guardarArchivo(blob, nombre, tipo, q) { const extra = q && q.carpeta ? `&carpeta=${encodeURIComponent(q.carpeta)}&nueva=${q.nueva || ''}` : ''; return this.pedir('POST', `/api/guardar?nombre=${encodeURIComponent(nombre)}&tipo=${encodeURIComponent(tipo)}${extra}`, blob).then(r => r.json()); },
  subir(blob, nombre, carpeta) { return this.pedir('POST', `/api/subir?nombre=${encodeURIComponent(nombre)}&carpeta=${encodeURIComponent(carpeta || '')}`, blob).then(r => r.json()); },
  recortar(ruta) { return this.pedir('POST', '/api/recortar?ruta=' + encodeURIComponent(ruta)).then(r => r.json()); },
  procesar(blob, nombre, carpeta) { return this.pedir('POST', `/api/procesar?nombre=${encodeURIComponent(nombre)}&carpeta=${encodeURIComponent(carpeta || '')}`, blob).then(r => r.json()); },
  abrirCarpeta(cual) { return this.pedir('POST', '/api/abrir-carpeta?cual=' + cual).then(r => r.json()); },
  abrirArchivo(ruta) { return this.pedir('POST', '/api/abrir-archivo?ruta=' + encodeURIComponent(ruta)).then(r => r.json()); },
  cerrar() { return this.pedir('POST', '/api/cerrar').then(r => r.json()); },
};

// ── ventanitas ──
const MODALES = [];
document.addEventListener('keydown', e => { if (e.key === 'Escape' && MODALES.length) { e.preventDefault(); MODALES[MODALES.length - 1].cerrar(); } }, true);
function abrirModal({ titulo, cuerpo, ancho = 560, acciones = [], clase = '', alCerrar }) {
  const previo = document.activeElement;
  const fondo = h('div', { class: 'modal-fondo', onmousedown: e => { if (e.target === fondo) ctrl.cerrar(); } });
  const caja = h('div', { class: 'modal ' + clase, role: 'dialog', 'aria-modal': 'true', 'aria-label': titulo, style: `max-width:${ancho}px` });
  const tit = h('h2', null, titulo);
  const cue = h('div', { class: 'modal-cuerpo' }, cuerpo);
  const pie = acciones.length ? h('footer', { class: 'modal-pie' }, ...acciones) : null;
  caja.append(h('header', { class: 'modal-cab' }, tit, h('button', { class: 'btn small ghost', type: 'button', 'aria-label': 'Cerrar', onclick: () => ctrl.cerrar() }, '✕')), cue);
  if (pie) caja.append(pie);
  fondo.append(caja); document.body.append(fondo); document.body.classList.add('modal-abierto');
  let cerrado = false;
  const ctrl = {
    cuerpo: cue, caja, pie, tit,
    cerrar() {
      if (cerrado) return; cerrado = true;
      const k = MODALES.indexOf(ctrl); if (k >= 0) MODALES.splice(k, 1);
      fondo.remove(); if (!MODALES.length) document.body.classList.remove('modal-abierto');
      if (previo && previo.focus && document.contains(previo)) { try { previo.focus({ preventScroll: true }); } catch (e) { /* sin foco */ } }
      if (alCerrar) alCerrar();
    },
  };
  MODALES.push(ctrl);
  return ctrl;
}
function confirmar(titulo, texto, si = 'Aceptar', no = 'Cancelar') {
  return new Promise(res => {
    let r = false;
    const m = abrirModal({ titulo, ancho: 460, cuerpo: h('p', { class: 'confirm-texto' }, texto), alCerrar: () => res(r),
      acciones: [h('button', { class: 'btn ghost', type: 'button', onclick: () => m.cerrar() }, no), h('button', { class: 'btn primary', type: 'button', onclick: () => { r = true; m.cerrar(); } }, si)] });
    setTimeout(() => { const b = m.pie && m.pie.lastChild; if (b) b.focus(); }, 0);
  });
}

// ── buscador de la carpeta de productos ──
let CATEGORIAS_CONOCIDAS = [];
/** Abre el buscador de la carpeta. Devuelve la lista de productos elegidos (o null si se cancela). */
function abrirSelector({ titulo, multi = false, max = 1 }) {
  return new Promise(resolve => {
    let todos = [], cat = null, q = '', modoMulti = multi, sel = [], resultado = null, cargando = true, carpetaTxt = '', pendientes = [], reloj = null;
    const nuevos = new Set();
    const coincide = it => { const ts = sinTildes(q).split(/\s+/).filter(Boolean); return (cat === null || (it.categoria.split('/')[0] || '') === cat) && ts.every(t => it._n.includes(t)); };
    const itemsSel = () => sel.map(r => todos.find(t => t.ruta === r)).filter(Boolean);
    const visibles = () => todos.filter(coincide);
    const elegir = it => { resultado = [it]; m.cerrar(); };
    const alternar = it => {
      const k = sel.indexOf(it.ruta);
      if (k >= 0) sel.splice(k, 1); else if (sel.length < max) sel.push(it.ruta); else aviso(`En este folleto entran ${max} más a partir de este casillero.`);
      pintar();
    };
    const buscador = h('input', { type: 'search', class: 'busca', placeholder: 'Buscar por nombre…', 'aria-label': 'Buscar producto', autocomplete: 'off',
      oninput: e => { q = e.target.value; pintar(); },
      onkeydown: e => { if (e.key === 'Enter') { e.preventDefault(); const v = visibles(); if (v[0]) (modoMulti ? alternar(v[0]) : elegir(v[0])); } } });
    const cats = h('div', { class: 'cats', role: 'group', 'aria-label': 'Categorías' });
    const grilla = h('div', { class: 'grilla-prod', role: 'list' });
    const cuenta = h('span', { class: 'sel-cuenta' });
    const btnMulti = h('button', { class: 'btn small', type: 'button', onclick: () => { modoMulti = !modoMulti; if (!modoMulti) sel = []; pintar(); } }, 'Elegir varios');
    const btnCargar = h('button', { class: 'btn primary', type: 'button', onclick: () => { resultado = itemsSel(); m.cerrar(); } }, 'Cargar');
    const archivos = h('input', { type: 'file', accept: 'image/png,image/jpeg,image/webp', multiple: true, hidden: true, onchange: e => { const fs = [...e.target.files]; e.target.value = ''; if (fs.length) subir(fs); } });

    async function refrescar(forzar = false) {
      try {
        const r = await CARPETA.productos(forzar), antes = new Set(todos.map(t => t.ruta)); carpetaTxt = r.carpeta;
        todos = r.productos.map(p => ({ ...p, _n: sinTildes(p.nombre + ' ' + p.categoria) })); pendientes = (r.pendientes || []).map(p => ({ ...p, _n: sinTildes(p.nombre + ' ' + p.categoria) }));
        if (antes.size) todos.forEach(t => { if (!antes.has(t.ruta)) nuevos.add(t.ruta); });          // las que llegaron recién (por ejemplo, ya sin fondo)
        CATEGORIAS_CONOCIDAS = [...new Set([...todos, ...pendientes].map(p => p.categoria.split('/')[0]).filter(Boolean))];
      } catch (e) { aviso(e.message); }
      cargando = false; pintar();
      clearTimeout(reloj); if (pendientes.length) reloj = setTimeout(() => refrescar(true), 20000);       // en la nube: se actualiza sola mientras GitHub recorta
    }
    async function subir(files) {
      const creados = await agregarFotosALaCarpeta(files, cat || '');
      if (!creados) return;
      if (!creados.length) { if (creados.enCola) await refrescar(true); return; }      // en la nube, las que van a la IA aparecen «quitando fondo»
      creados.forEach(c => nuevos.add(c.ruta));
      await refrescar();
      if (modoMulti) { creados.forEach(c => { if (sel.length < max && !sel.includes(c.ruta)) sel.push(c.ruta); }); pintar(); }
      else if (creados.length === 1) { const it = todos.find(t => t.ruta === creados[0].ruta); if (it) elegir(it); }
    }
    function pintar() {
      const v = visibles(), conteo = new Map(), pv = pendientes.filter(coincide); let sueltos = 0;
      todos.forEach(it => { const c = it.categoria.split('/')[0]; if (c) conteo.set(c, (conteo.get(c) || 0) + 1); else sueltos++; });
      const chip = (rotulo, valor, n) => h('button', { class: 'cat' + (cat === valor ? ' on' : ''), type: 'button', 'aria-pressed': String(cat === valor), onclick: () => { cat = valor; pintar(); } }, rotulo, h('small', null, String(n)));
      cats.replaceChildren(...(conteo.size ? [chip('Todos', null, todos.length), ...[...conteo.entries()].sort((a, b) => sinTildes(a[0]).localeCompare(sinTildes(b[0]), 'es')).map(([c, n]) => chip(c, c, n)), ...(sueltos ? [chip('Sin categoría', '', sueltos)] : [])] : []));
      const enEspera = pv.map(it => h('div', { class: 'tile pend', role: 'listitem', title: 'GitHub le está quitando el fondo (1 a 3 minutos)' },
        h('span', { class: 'timg' }, h('img', { src: urlMiniatura(it.ruta, it.mtime), loading: 'lazy', alt: '' }), h('b', { class: 'nuevo' }, '✂ Quitando fondo…')), h('span', { class: 'tnom' }, it.nombre), it.categoria ? h('span', { class: 'tcat' }, it.categoria) : null));
      grilla.replaceChildren(...(cargando ? [h('p', { class: 'hint' }, CARPETA.nube ? 'Cargando las fotos de la nube…' : 'Cargando la carpeta…')] : !todos.length && !pendientes.length ? [vacio()] : !v.length && !pv.length ? [h('p', { class: 'hint' }, 'No encontré productos con ese nombre. Revisá cómo está escrito o agregá la foto con «＋ Agregar fotos».')]
        : [...enEspera, ...v.map(it => {
          const k = sel.indexOf(it.ruta);
          return h('button', { class: 'tile' + (k >= 0 ? ' on' : ''), type: 'button', role: 'listitem', title: it.ruta, 'aria-pressed': modoMulti ? String(k >= 0) : null, onclick: () => (modoMulti ? alternar(it) : elegir(it)) },
            h('span', { class: 'timg' }, h('img', { src: urlMiniatura(it.ruta, it.mtime), loading: 'lazy', alt: '' }), k >= 0 ? h('b', { class: 'orden' }, String(k + 1)) : null, nuevos.has(it.ruta) ? h('b', { class: 'nuevo' }, 'Nueva') : null),
            h('span', { class: 'tnom' }, it.nombre), it.categoria ? h('span', { class: 'tcat' }, it.categoria) : null);
        })]));
      btnMulti.setAttribute('aria-pressed', String(modoMulti)); btnMulti.classList.toggle('on', modoMulti);
      btnCargar.hidden = !modoMulti; btnCargar.disabled = !sel.length; btnCargar.textContent = sel.length ? `Cargar ${sel.length} ${sel.length === 1 ? 'producto' : 'productos'}` : 'Cargar';
      cuenta.textContent = modoMulti ? (sel.length ? `${sel.length} elegidos · el primero va en este casillero y los demás en los libres que siguen` : 'Tocá los productos que quieras cargar') : `${v.length} ${v.length === 1 ? 'producto' : 'productos'}` + (pendientes.length ? ` · ${pendientes.length} quitando el fondo` : '');
    }
    const vacio = () => CARPETA.nube
      ? h('div', { class: 'vacio-carpeta' }, h('b', null, 'Todavía no hay fotos en la nube.'), h('p', null, 'Subí las fotos de tus productos (el nombre que les pongas es el nombre del producto) o traé de una vez las que tenés en la PC del negocio.'),
        h('div', { class: 'row-actions' }, h('button', { class: 'btn small primary', type: 'button', onclick: () => agregarClic() }, '＋ Agregar fotos'), h('button', { class: 'btn small', type: 'button', onclick: () => { m.cerrar(); abrirTraer(); } }, '⇪ Traer lo de esta PC')))
      : h('div', { class: 'vacio-carpeta' }, h('b', null, 'La carpeta de productos está vacía.'), h('p', null, 'Copiá tus fotos ahí (el nombre del archivo es el nombre del producto) o agregalas desde acá.'),
        h('div', { class: 'row-actions' }, h('button', { class: 'btn small primary', type: 'button', onclick: () => archivos.click() }, '＋ Agregar fotos'), h('button', { class: 'btn small', type: 'button', onclick: () => abrirLaCarpeta() }, 'Abrir carpeta')));
    const abrirLaCarpeta = () => API.abrirCarpeta('productos').then(() => aviso('Abrí la carpeta. Copiá tus fotos ahí y volvé: se actualiza sola.')).catch(e => aviso(e.message));
    /** En la nube sin conectar: subir pide la llave; igual se puede usar una foto de esta PC solo para este folleto. */
    const agregarClic = () => { if (CARPETA.puedeSubir) archivos.click(); else { aviso('Para subir fotos a la nube, primero conectá tu cuenta de GitHub.'); abrirConectar(); } };
    const usarDeEstaPC = () => { resultado = null; m.cerrar(); DOM.selArchivo.multiple = !!multi; DOM.selArchivo._destino = { tipo: ACTIVO.tipo, i: ACTIVO.i }; DOM.selArchivo.click(); };

    const cuerpo = h('div', { class: 'selector' }, h('div', { class: 'sel-barra' }, buscador, cuenta), cats, grilla, archivos);
    const m = abrirModal({ titulo, ancho: 1020, clase: 'selector-modal', cuerpo, alCerrar: () => { removeEventListener('focus', alVolver); clearTimeout(reloj); resolve(resultado); },
      acciones: [h('button', { class: 'btn small', type: 'button', onclick: () => agregarClic() }, '＋ Agregar fotos'), h('button', { class: 'btn small ghost', type: 'button', onclick: () => refrescar(true) }, '↻ Actualizar'),
        CARPETA.nube ? (CARPETA.puedeSubir ? null : h('button', { class: 'btn small ghost', type: 'button', onclick: usarDeEstaPC }, 'Usar una foto de esta PC')) : h('button', { class: 'btn small ghost', type: 'button', onclick: abrirLaCarpeta }, 'Abrir carpeta'),
        h('span', { class: 'sp' }), btnMulti, h('button', { class: 'btn ghost', type: 'button', onclick: () => m.cerrar() }, 'Cancelar'), btnCargar] });
    const alVolver = () => refrescar();                                  // al volver de copiar fotos en el explorador, se actualiza sola
    addEventListener('focus', alVolver);
    m.caja.addEventListener('dragover', e => { if ([...(e.dataTransfer.types || [])].includes('Files')) { e.preventDefault(); m.caja.classList.add('soltar'); } });
    m.caja.addEventListener('dragleave', e => { if (e.target === m.caja) m.caja.classList.remove('soltar'); });
    m.caja.addEventListener('drop', e => { e.preventDefault(); m.caja.classList.remove('soltar'); const fs = [...e.dataTransfer.files]; if (fs.length) { if (CARPETA.puedeSubir) subir(fs); else agregarClic(); } });
    pintar(); refrescar(); setTimeout(() => buscador.focus(), 30);
  });
}

/** Guarda fotos nuevas en la carpeta de productos, pidiendo el nombre de cada una. Devuelve [{ruta,nombre,mtime}] o null. */
function agregarFotosALaCarpeta(files, categoria = '') {
  return new Promise(resolve => {
    const arch = [...files].filter(f => /^image\/(png|jpe?g|webp)$/.test(f.type) || /\.(png|jpe?g|webp)$/i.test(f.name));
    if (!arch.length) { aviso('Solo se pueden agregar fotos JPG, PNG o WEBP.'); return resolve(null); }
    if (CARPETA.nube && !NUBE.puedeEscribir) { aviso('Para subir fotos a la nube, primero conectá tu cuenta de GitHub.'); abrirConectar(); return resolve(null); }
    const nube = CARPETA.nube;
    let resultado = null;
    const filas = arch.map(f => {
      const base = nombreLindo(f.name.replace(/\.[^.]+$/, '')), url = URL.createObjectURL(f);
      const nombre = h('input', { type: 'text', value: esNombreDeCamara(base) ? '' : base, placeholder: '¿Cómo se llama este producto?', maxlength: 80, 'aria-label': 'Nombre del producto' });
      return { f, url, nombre, el: h('div', { class: 'sube-fila' }, h('img', { src: url, alt: '' }), h('label', { class: 'fld' }, h('span', null, f.name), nombre)) };
    });
    const carpeta = h('input', { type: 'text', value: categoria, placeholder: 'Ej.: Bebidas (opcional)', list: 'lista-categorias', maxlength: 60 });
    const hayIA = CARPETA.hayIA;
    const chkIA = hayIA ? check('Quitar el fondo con IA', nube ? 'GitHub deja cada producto recortado y bien presentado, listo para el folleto. Tarda 1 a 3 minutos: las fotos aparecen solas en el buscador. (Las que ya vienen sin fondo se suben tal cual.)' : 'Deja cada producto recortado y bien presentado, listo para el folleto. Tarda unos segundos por foto.', true, () => {}) : null;
    const guardar = h('button', { class: 'btn primary', type: 'button', onclick: async () => {
      const falta = filas.find(x => !x.nombre.value.trim());
      if (falta) { aviso('Ponele un nombre a cada foto: así la vas a encontrar después.'); falta.nombre.focus(); return; }
      const conIA = hayIA && $('input', chkIA).checked;
      guardar.disabled = true;
      const creados = [];
      if (nube) {
        try {
          const r = await NUBE.subirFotos(filas.map(x => ({ file: x.f, nombre: x.nombre.value.trim(), conIA })), carpeta.value.trim(), {
            progreso: (i, n, fase) => { guardar.textContent = fase === 'preparar' ? `Preparando ${i + 1} de ${n}…` : `Subiendo a la nube ${Math.min(i + 1, n)} de ${n}…`; } });
          const partes = [];
          if (r.enCola.length) partes.push(`GitHub les está quitando el fondo a ${r.enCola.length === 1 ? '1 foto' : r.enCola.length + ' fotos'}: en 1 a 3 minutos ${r.enCola.length === 1 ? 'aparece' : 'aparecen'} en el buscador, sin fondo.`);
          if (r.fallidas.length) partes.push(`No pude abrir ${r.fallidas.map(x => '«' + x.file.name + '»').join(', ')}.`);
          if (partes.length) aviso((r.listos.length ? `Subí ${r.listos.length} ${r.listos.length === 1 ? 'foto' : 'fotos'}. ` : '') + partes.join(' '), 8000);
          resultado = r.listos; resultado.enCola = r.enCola.length; m.cerrar();
        } catch (e) { aviso(e.message, 7000); guardar.disabled = false; guardar.textContent = textoGuardar(); }
        return;
      }
      try {
        for (let n = 0; n < filas.length; n++) {
          guardar.textContent = conIA ? `Procesando ${n + 1} de ${filas.length}…` : `Guardando ${n + 1} de ${filas.length}…`;
          const x = filas[n], nm = x.nombre.value.trim();
          if (conIA) {
            try { creados.push(await API.procesar(x.f, nm, carpeta.value.trim())); }
            catch (e) { creados.push(await API.subir(x.f, nm, carpeta.value.trim())); x.falloIA = true; }   // si la IA falla en una, se guarda igual (con su fondo)
          } else creados.push(await API.subir(x.f, nm, carpeta.value.trim()));
        }
      } catch (e) { aviso(e.message); guardar.disabled = false; guardar.textContent = textoGuardar(); return; }
      const fallidas = filas.filter(x => x.falloIA).length;
      if (fallidas) aviso(`Guardé todo. A ${fallidas} ${fallidas === 1 ? 'foto no le pude' : 'fotos no les pude'} quitar el fondo con IA: ${fallidas === 1 ? 'quedó' : 'quedaron'} con su fondo (probá «Quitar fondo con IA» en el producto).`);
      resultado = creados; m.cerrar();
    } }, '');
    const textoGuardar = () => (hayIA && (!chkIA || $('input', chkIA).checked)) ? (arch.length === 1 ? 'Quitar fondo y guardar' : `Quitar fondo y guardar (${arch.length})`) : nube ? 'Subir a la nube' : 'Guardar en la carpeta';
    if (chkIA) $('input', chkIA).addEventListener('change', () => { guardar.textContent = textoGuardar(); });
    guardar.textContent = textoGuardar();
    const dondeTxt = nube ? 'a la nube' : 'a la carpeta';
    const m = abrirModal({ titulo: arch.length === 1 ? 'Agregar una foto ' + dondeTxt : `Agregar ${arch.length} fotos ${dondeTxt}`, ancho: 640, alCerrar: () => { filas.forEach(x => URL.revokeObjectURL(x.url)); resolve(resultado); },
      cuerpo: h('div', { class: 'stack' }, h('p', { class: 'hint', style: 'margin:0' }, 'El nombre que escribas es el nombre del archivo y del producto: así lo vas a encontrar después en el buscador.'),
        ...filas.map(x => x.el), campo('Categoría (subcarpeta)', carpeta, 'opcional'), chkIA, h('datalist', { id: 'lista-categorias' }, ...CATEGORIAS_CONOCIDAS.map(c => h('option', { value: c })))),
      acciones: [h('button', { class: 'btn ghost', type: 'button', onclick: () => m.cerrar() }, 'Cancelar'), guardar] });
    setTimeout(() => { const v = filas.find(x => !x.nombre.value.trim()) || filas[0]; v.nombre.focus(); }, 30);
  });
}

// ── finalizar: imagen en el Escritorio ──
const hayContenido = () => !S.avisoEjemplo && (L_ACTUAL().grupo === 'mensaje' || S.productos.some(p => !productoVacio(p)) || S.coleccion.fotos.some(f => srcDe(f)));
function nombreCopia() {
  const d = new Date(), p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())} ${nombreBase().replace(/^Rivero Market - /, '')}`;   // con segundos: dos copias seguidas no se pisan
}
async function guardarCopiaFolleto() { if (!CARPETA.guardaFolletos) throw new ErrorNube('sin-llave', 'Sin conexión a la nube: no se guardó la copia.'); await CARPETA.guardarProyecto(nombreCopia(), estadoParaGuardar(S)); }
async function recordarPrecios() {
  const ahora = Date.now(); let n = 0;
  for (const p of S.productos.slice(0, L_ACTUAL().slots)) {
    if (p.archivo && !productoVacio(p) && parsePrecio(p.final)) {
      const hist = ((CAT[p.archivo] || {}).hist || []).concat([{ ts: ahora, regular: p.regular, final: p.final }]).slice(-12);   // historial de precios del producto
      CAT[p.archivo] = { nombre: p.nombre, desc: p.desc, regular: p.regular, final: p.final, unidad: p.unidad, etiqueta: p.etiqueta, nota: p.nota, ts: ahora, hist }; n++;
    }
  }
  if (n) CAT = await CARPETA.guardarCatalogo(CAT);
}
// ── terminar: imágenes según el destino (A4, Facebook, canal de WhatsApp, Estados) ──
const DEST_CORTO = { a4: 'A4 para imprimir', post: 'Post Facebook', canal: 'Canal WhatsApp', story: 'Estado e Historia', story1: 'Estado e Historia', post1: 'Facebook y canal' };
const DEST_ESCALA = { a4: 2, post: 1, canal: 1.5, story: 1, story1: 1, post1: 1.5 };
const nombreCarpeta = () => nombreBase(true);
/** Descripción corta de lo que sale para un destino: "2 imágenes (de a 4 productos)". */
function resumenDestino(dest) {
  const plan = planDestino(S, dest); if (!plan.length) return '';
  const L = LAYOUTS[plan[0].formato], n = plan.length;
  const esc = DEST_ESCALA[dest], med = `${Math.round(L.w * esc)}×${Math.round(L.h * esc)}`;
  if (plan[0].individual) return `${n} ${n === 1 ? 'imagen' : 'imágenes'} (una por producto) · ${med} px`;
  return (n > 1 ? `${n} imágenes (de a ${L.slots} productos para que se lean bien)` : '1 imagen') + ` · ${med} px` + (dest === 'a4' && S.opciones.pdf !== false && L.pdf ? ' + PDF' : '');
}
/** Genera los archivos de un destino: [{blob, nombre, tipo, w, h}]. */
async function archivosDestino(dest) {
  const plan = planDestino(S, dest), out = [], base = nombreBase(true), esc = DEST_ESCALA[dest];
  for (const pg of plan) {
    const SP = estadoParaPagina(S, pg), c = document.createElement('canvas');
    renderFlyer(c, SP, { scale: esc, getImg, preview: false, exportar: true });
    const suf = ' - ' + DEST_CORTO[dest] + (pg.individual ? ` - ${String(pg.pagina).padStart(2, '0')} ${pg.nombre || 'producto'}`.slice(0, 70) : pg.total > 1 ? ` (${pg.pagina} de ${pg.total})` : '');
    out.push({ blob: await aBlob(c, 'image/png'), nombre: base + suf + '.png', tipo: 'png', w: c.width, h: c.height });
    if (dest === 'a4' && LAYOUTS[pg.formato].pdf && S.opciones.pdf !== false) out.push({ blob: await generarPDF(esc, c), nombre: base + suf + '.pdf', tipo: 'pdf' });
  }
  return out;
}
function filaAviso(r) { return h('li', { class: r.k }, h('span', { class: 'ic', 'aria-hidden': 'true' }, r.k === 'ok' ? '✓' : r.k === 'warn' ? '!' : 'i'), h('span', null, r.t, r.d ? h('small', null, r.d) : null)); }
/** Elegir para dónde es el folleto (y, sin programa local, dónde se guarda). Devuelve {destinos, modo} o null. */
function elegirDestinos() {
  return new Promise(res => {
    let r = null; const sel = new Set(S.opciones.destinos && S.opciones.destinos.length ? S.opciones.destinos : ['a4']);
    [...sel].forEach(k => { if (!planDestino(S, k).length) sel.delete(k); });
    if (!sel.size) sel.add('a4');
    const filas = Object.entries(DESTINOS).filter(([k]) => planDestino(S, k).length).map(([k, D]) => h('label', { class: 'dest' + (D.individual ? ' indiv' : '') },
      h('input', { type: 'checkbox', checked: sel.has(k) || null, onchange: e => { e.target.checked ? sel.add(k) : sel.delete(k); btn.disabled = !sel.size; } }),
      h('span', { class: 'dest-ic', 'aria-hidden': 'true' }, D.icono), h('span', null, h('b', null, D.nombre), h('small', null, resumenDestino(k)))));
    // sin programa local: descargar (varias imágenes van en un .zip) o guardar directo en una carpeta de la PC (Chrome y Edge)
    let modo = !API.activo && puedeElegirCarpeta() && S.opciones.entrega === 'carpeta' && CARPETA_PC.handle ? 'carpeta' : 'descarga';
    const nomCarpeta = h('b', null, CARPETA_PC.handle ? CARPETA_PC.handle.name : '');
    const rCarpeta = h('input', { type: 'radio', name: 'entrega', value: 'carpeta', checked: modo === 'carpeta' || null, disabled: !CARPETA_PC.handle || null, onchange: () => { modo = 'carpeta'; } });
    const entrega = !API.activo && puedeElegirCarpeta() ? h('div', { class: 'stack entrega' }, h('p', { class: 'lab', style: 'margin:0' }, '¿Dónde lo guardo?'),
      h('label', { class: 'chk' }, h('input', { type: 'radio', name: 'entrega', value: 'descarga', checked: modo === 'descarga' || null, onchange: () => { modo = 'descarga'; } }), h('span', null, 'Descargar', h('small', null, 'Van a la carpeta Descargas. Si son varias imágenes, juntas en un .zip.'))),
      h('label', { class: 'chk' }, rCarpeta, h('span', null, 'En una carpeta de esta PC ', nomCarpeta, h('small', null, 'Por ejemplo el Escritorio. Si son varias imágenes, van juntas en una carpeta nueva.'))),
      h('div', { class: 'row-actions' }, h('button', { class: 'btn small', type: 'button', onclick: async () => {
        try { const hd = await CARPETA_PC.elegir(); nomCarpeta.textContent = hd.name; rCarpeta.disabled = false; rCarpeta.checked = true; modo = 'carpeta'; }
        catch (e) { if (e && e.name !== 'AbortError') aviso('No pude usar esa carpeta: ' + (e.message || e)); } } }, CARPETA_PC.handle ? 'Cambiar carpeta…' : 'Elegir carpeta…'))) : null;
    const btn = h('button', { class: 'btn primary', type: 'button', onclick: () => {
      r = { destinos: [...sel], modo };
      if (modo === 'carpeta') r.permiso = CARPETA_PC.permiso();      // se pide ahora, mientras dura el clic
      m.cerrar(); } }, API.activo ? 'Generar y guardar' : 'Generar y descargar');
    const m = abrirModal({ titulo: '¿Para dónde es este folleto?', ancho: 620, alCerrar: () => res(r),
      cuerpo: h('div', { class: 'stack' }, h('p', { class: 'hint', style: 'margin:0' }, 'Cada destino sale con su medida. En redes van menos productos por imagen (se reparten en varias) para que el precio, el “antes” y el descuento se lean bien en el celular.'), ...filas,
        L_ACTUAL().pdf || planDestino(S, 'a4')[0] ? check('Con el A4, guardar también el PDF para imprimir', null, S.opciones.pdf !== false, v => { S.opciones.pdf = v; guardarAuto(); }) : null,
        entrega,
        h('p', { class: 'hint', style: 'margin:0' }, 'Consejo: para el canal y los chats de WhatsApp, mandá la imagen en calidad HD. Para que llegue sin perder nada, mandá el PDF como documento.')),
      acciones: [h('button', { class: 'btn ghost', type: 'button', onclick: () => m.cerrar() }, 'Cancelar'), btn] });
  });
}

async function finalizarFolleto() {
  const avisos = calcularRevision().filter(r => r.k === 'warn');
  if (avisos.length) {
    const seguir = await new Promise(res => {
      let r = false;
      const m = abrirModal({ titulo: 'Antes de terminar, revisá esto', ancho: 580, alCerrar: () => res(r),
        cuerpo: h('div', { class: 'stack' }, h('ul', { class: 'checks' }, ...avisos.map(filaAviso)), h('p', { class: 'hint', style: 'margin:0' }, 'Podés seguir igual si sabés lo que hacés, o volver a editar.')),
        acciones: [h('button', { class: 'btn ghost', type: 'button', onclick: () => m.cerrar() }, 'Volver a editar'), h('button', { class: 'btn primary', type: 'button', onclick: () => { r = true; m.cerrar(); } }, 'Seguir igual')] });
    });
    if (!seguir) return;
  }
  if (!API.activo) await CARPETA_PC.cargar();
  const eleccion = await elegirDestinos();
  if (!eleccion || !eleccion.destinos.length) return;
  const destinos = eleccion.destinos;
  S.opciones.destinos = destinos; if (!API.activo) S.opciones.entrega = eleccion.modo; guardarAuto();
  if (eleccion.permiso) await eleccion.permiso.catch(() => false);
  const vistas = [];
  const m = abrirModal({ titulo: 'Armando tu folleto…', ancho: 820, cuerpo: h('p', { class: 'confirm-texto' }, 'Estoy generando las imágenes en alta calidad. Un segundo…'), alCerrar: () => vistas.forEach(u => URL.revokeObjectURL(u)) });
  try {
    await prepararImagenes(S);
    const archivos = [];
    for (const d of destinos) { m.cuerpo.firstChild.textContent = `Generando: ${DESTINOS[d].nombre}…`; archivos.push(...(await archivosDestino(d)).map(a => ({ ...a, dest: d }))); }
    let guardados = [], carpeta = '', rutaCarpeta = '', entrega = null, notaNube = '';
    if (API.activo) {
      const enCarpeta = archivos.filter(a => a.tipo === 'png').length > 1;      // varias imágenes: van juntas en una carpeta; una sola (con su PDF), directo al Escritorio
      for (const a of archivos) {
        const q = enCarpeta ? { carpeta: carpeta || nombreCarpeta(), nueva: carpeta ? '' : '1' } : null;
        const g = await API.guardarArchivo(a.blob, a.nombre, a.tipo, q);
        if (enCarpeta && !carpeta) { carpeta = g.subcarpeta; rutaCarpeta = g.carpeta; }
        guardados.push(g);
      }
      await guardarCopiaFolleto().catch(e => console.error(e));
      await recordarPrecios().catch(e => console.error(e));
    } else {
      m.cuerpo.firstChild.textContent = eleccion.modo === 'carpeta' ? 'Guardando en tu carpeta…' : archivos.length > 2 ? 'Juntando las imágenes en un .zip…' : 'Descargando…';
      entrega = await entregarArchivos(archivos, nombreCarpeta(), eleccion.modo);
      if (NUBE.activo) {
        if (NUBE.puedeEscribir) {
          m.cuerpo.firstChild.textContent = 'Guardando una copia en la nube…';
          try { await guardarCopiaFolleto(); await recordarPrecios(); notaNube = 'También quedó una copia en «Mis folletos» (en la nube) y se recordaron los precios para la próxima, en cualquier computadora.'; }
          catch (e) { console.error(e); notaNube = 'Las imágenes están listas, pero no pude guardar la copia en la nube: ' + e.message; }
        } else notaNube = 'Conectá tu cuenta de GitHub (botón ☁ de arriba) para que quede una copia en «Mis folletos» y se recuerden los precios.';
      }
    }
    m.tit.textContent = '¡Folleto terminado!';
    const pngs = archivos.filter(a => a.tipo === 'png');
    const figura = a => {
      const u = URL.createObjectURL(a.blob); vistas.push(u);
      const etq = a.nombre.replace(nombreBase(true) + ' - ', '').replace(/\.png$/, '');
      const botones = API.activo ? null : h('div', { class: 'fig-acc' },
        h('button', { class: 'btn small', type: 'button', title: 'Descargar esta imagen', onclick: () => guardarArchivo(a.blob, a.nombre) }, '⬇ Bajar'),
        puedeCompartir(a.blob) ? h('button', { class: 'btn small', type: 'button', title: 'Compartir (WhatsApp, Facebook…)', onclick: () => compartirArchivo(a.blob, a.nombre) }, 'Compartir') : null);
      return h('figure', null, h('img', { src: u, alt: a.nombre }), h('figcaption', null, DESTINOS[a.dest].icono + ' ' + etq), botones);
    };
    m.cuerpo.replaceChildren(h('div', { class: 'stack' },
      h('p', { class: 'confirm-texto', style: 'margin:0' }, h('b', null, 'Listo. '), API.activo ? (carpeta ? `Guardé ${archivos.length} archivos en la carpeta «${carpeta}» del Escritorio.` : 'Guardé tu folleto en el Escritorio.') : entrega.texto),
      h('div', { class: 'fin-galeria' }, ...pngs.map(figura)),
      API.activo ? h('p', { class: 'hint', style: 'margin:0' }, 'También quedó una copia en «Mis folletos» para que la puedas retocar la semana que viene.') : notaNube ? h('p', { class: 'hint', style: 'margin:0' }, notaNube) : null));
    m.pie && m.pie.remove();
    const pie = h('footer', { class: 'modal-pie' },
      API.activo ? h('button', { class: 'btn primary', type: 'button', onclick: () => API.abrirArchivo(carpeta ? rutaCarpeta : guardados[0].ruta).catch(e => aviso(e.message)) }, carpeta ? 'Abrir la carpeta' : 'Abrir la imagen') : null,
      API.activo ? h('button', { class: 'btn', type: 'button', onclick: () => API.abrirCarpeta('escritorio').catch(e => aviso(e.message)) }, 'Abrir el Escritorio') : null,
      h('button', { class: 'btn' + (API.activo ? '' : ' primary'), type: 'button', onclick: () => abrirMarketing('textos') }, '📣 Textos para publicar'),
      h('span', { class: 'sp' }),
      h('button', { class: 'btn ghost', type: 'button', onclick: () => m.cerrar() }, 'Seguir editando'),
      CARPETA.activa ? h('button', { class: 'btn', type: 'button', onclick: () => { m.cerrar(); nuevoFolleto(true); } }, 'Folleto nuevo') : null);
    m.caja.append(pie);
  } catch (e) {
    console.error(e); m.tit.textContent = 'No pude terminar el folleto';
    m.cuerpo.replaceChildren(h('p', { class: 'confirm-texto' }, e && e.message || String(e)));
    m.caja.append(h('footer', { class: 'modal-pie' }, h('button', { class: 'btn', type: 'button', onclick: () => m.cerrar() }, 'Cerrar')));
  }
  programarDibujo();
}

// ── folleto nuevo, mis folletos, cerrar ──
async function nuevoFolleto(sinPreguntar = false) {
  if (!sinPreguntar) {
    const guarda = CARPETA.guardaFolletos;
    const ok = await confirmar('¿Empezar un folleto nuevo?', (guarda ? 'Se guarda una copia de este en «Mis folletos» y empezás' : 'Empezás') + ' con los casilleros vacíos. Se mantienen el tipo de folleto, la temática, la promo y los datos del local.'
      + (!guarda && hayContenido() ? ' OJO: este no queda guardado porque esta computadora no está conectada a la nube (botón ☁ de arriba).' : ''), 'Empezar de cero', 'Cancelar');
    if (!ok) return;
  }
  try { if (hayContenido() && CARPETA.guardaFolletos) await guardarCopiaFolleto(); } catch (e) { console.error(e); aviso('No pude guardar la copia del folleto anterior: ' + e.message); }
  S = estadoNuevo(S); ACTIVO = { tipo: esColeccion() ? 'foto' : 'producto', i: 0 };
  await prepararImagenes(S); construirPanel(); cambio(); reiniciarHistorial(); DOM.panel.scrollTop = 0;
  aviso('Listo: folleto nuevo. Tocá un casillero para elegir el primer producto.');
}
async function abrirFolleto(archivo, modal) {
  const ok = await confirmar('¿Abrir este folleto?', 'Reemplaza el que estás armando ahora.' + (CARPETA.guardaFolletos ? ' Antes guardo una copia del actual en «Mis folletos».' : ''), 'Abrir', 'Cancelar');
  if (!ok) return;
  try {
    if (hayContenido() && CARPETA.guardaFolletos) await guardarCopiaFolleto();
    const j = await CARPETA.leerProyecto(archivo);
    if (!j) throw new Error('No encuentro ese folleto: puede que lo hayan borrado desde la otra computadora.');
    S = normalizarEstado(j); S.avisoEjemplo = false; ACTIVO = { tipo: esColeccion() ? 'foto' : 'producto', i: 0 };
    await prepararImagenes(S); construirPanel(); cambio(); reiniciarHistorial(); modal.cerrar(); aviso('Folleto abierto. Revisá fechas y precios.');
  } catch (e) { aviso(e.message); }
}
async function abrirMisFolletos() {
  let lista;
  try { lista = await CARPETA.listarProyectos(); } catch (e) { aviso(e.message); return; }
  const cuerpo = h('div', { class: 'lista-proy' }), nube = CARPETA.nube, puedeBorrar = CARPETA.guardaFolletos;
  const m = abrirModal({ titulo: nube ? 'Mis folletos (en la nube)' : 'Mis folletos', ancho: 700, cuerpo,
    acciones: nube && CARPETA.guardaFolletos ? [h('button', { class: 'btn small', type: 'button', onclick: async () => { try { await guardarCopiaFolleto(); aviso('Guardé el folleto actual en «Mis folletos».'); m.cerrar(); abrirMisFolletos(); } catch (e) { aviso(e.message); } } }, '＋ Guardar el que estoy armando'), h('span', { class: 'sp' }), h('button', { class: 'btn ghost', type: 'button', onclick: () => m.cerrar() }, 'Cerrar')] : [] });
  const pintar = () => cuerpo.replaceChildren(...(lista.length ? lista.map(p => {
    const nombreFormato = (LAYOUTS[p.formato] || {}).corto || p.formato || '', fecha = p.mtime ? new Date(p.mtime * 1000).toLocaleString('es-AR', { dateStyle: 'medium', timeStyle: 'short' }) : '';
    const borrar = puedeBorrar ? h('button', { class: 'btn small danger ghost', type: 'button', onclick: async () => { if (await confirmar('¿Borrar este folleto?', nube ? 'Se borra de «Mis folletos» en la nube (para todas las computadoras). Las imágenes que ya descargaste no se tocan.' : 'Se borra de «Mis folletos». Las imágenes que ya guardaste en el Escritorio no se tocan.', 'Borrar', 'Cancelar')) { try { await CARPETA.borrarProyecto(p.archivo); lista = lista.filter(x => x !== p); pintar(); } catch (e) { aviso(e.message); } } } }, 'Borrar') : null;
    return h('div', { class: 'proy' }, h('div', { class: 'proy-datos' }, h('b', null, p.titulo || p.archivo.replace(/\.json$/, '')), h('small', null, [nombreFormato, fecha].filter(Boolean).join(' · '))),
      h('div', { class: 'row-actions' }, h('button', { class: 'btn small primary', type: 'button', onclick: () => abrirFolleto(p.archivo, m) }, 'Abrir'), borrar));
  }) : [h('p', { class: 'hint' }, nube ? 'Todavía no hay folletos guardados en la nube. Cada vez que finalizás uno, queda una copia acá para retocarlo después, desde cualquier computadora.' : 'Todavía no hay folletos guardados. Cada vez que finalizás uno, queda una copia acá para retocarlo después.')]));
  pintar();
  if (nube) {                                                     // en la nube el formato no está en el nombre: se lee de a poco
    const repintar = debounce(pintar, 120);
    lista.slice(0, 40).forEach(p => NUBE.leerProyecto(p.archivo).then(j => {
      if (!j) return; const f = String(j.formato || '');
      p.formato = j.formato; p.titulo = (f.startsWith('coleccion') ? (j.coleccion || {}).mensaje : f.startsWith('mensaje') ? (j.mensaje || {}).titulo : j.titulo) || p.titulo; repintar();
    }).catch(() => {}));
  }
}
async function cerrarPrograma() {
  if (!(await confirmar('¿Cerrar el programa?', 'Tu trabajo queda guardado. Para volver a usarlo, abrí «Folletos Rivero Market» desde el Escritorio.', 'Cerrar programa', 'Cancelar'))) return;
  try { await API.put('/api/estado', estadoParaGuardar(S)); } catch (e) { /* ya se guardó antes */ }
  try { await API.cerrar(); } catch (e) { /* el servidor puede cortar la conexión al apagarse */ }
  document.body.replaceChildren(h('div', { class: 'cerrado' }, h('img', { src: ASSETS.logos.insignia, alt: '' }), h('h1', null, 'Programa cerrado'), h('p', null, 'Podés cerrar esta pestaña. Para volver a abrirlo, usá el ícono «Folletos Rivero Market» del Escritorio.')));
}
