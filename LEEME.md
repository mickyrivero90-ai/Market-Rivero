# Rivero Market · sistema de folletos de ofertas

**Versión 3.0** (se ve arriba a la izquierda del programa; la lista de cambios está en `CAMBIOS.txt`).

> **Desde la 3.0 la herramienta está online:** https://mickyrivero90-ai.github.io/Market-Rivero/ — siempre actualizada, con las fotos, los precios y «Mis folletos» compartidos entre la PC de casa, la del negocio y el celular, y con la sección **📣 Marketing**. Cómo se usa: ver `README.md`.

Folletos listos para imprimir y para redes. Vos cambiás **producto + descripción + precio + foto**; el logo, la dirección, el Facebook, el QR del canal de WhatsApp y la leyenda legal quedan fijos.

## El programa de folletos (lo que tenés que usar)

**Dónde está.** El código está en GitHub (https://github.com/mickyrivero90-ai/Market-Rivero) y en tu PC Linux (la que tiene Blender), en `/home/rivero/RiveroMarket/`, que es la copia de trabajo del repositorio. Este programa local sirve para usar sin internet.

**Cómo abrirlo.** Doble clic en el ícono **Folletos Rivero Market** del Escritorio (o `./iniciar.sh`). Se abre el navegador en `http://127.0.0.1:8780`. Solo escucha en tu computadora y no usa internet.

**Cómo se usa.** Elegís el tipo de folleto y la temática, tocás un casillero y buscás el producto en tu carpeta de fotos (`productos/`), escribís el precio y, al terminar, **✔ Finalizar** guarda la imagen (y el PDF en A4) en el Escritorio. Queda una copia en «Mis folletos».

**La carpeta de fotos.** `productos/`: el nombre del archivo es el nombre del producto y cada subcarpeta es una categoría. Ya tiene 42 productos de repostería recortados y dos fotos grandes con varios productos.

**Llevarlo a otra computadora.** Armé un ZIP (`_entregas/Rivero-Market-Folletos.zip`) que funciona en Windows y Linux; necesita Python 3 instalado. Se regenera con `python3 editor/empaquetar.py`. El que se baja de la herramienta online (⋯ Más → Programa para usar sin internet) viene sin fotos: el programa las trae con «☁ Traer las fotos de la nube».

## Qué hay en la carpeta

| Carpeta / archivo | Qué es |
|---|---|
| `programa/` | **El programa.** `servidor.py` lo abre; `web/index.html` es la pantalla; `datos/` guarda tu trabajo, tus copias y la memoria de precios. |
| `productos/` | **Tus fotos de productos.** El nombre del archivo es el nombre del producto. |
| `ofertas_rivero_market.html` | La misma herramienta como página suelta (sin carpeta ni Escritorio). Sirve de plan B. |
| `_entregas/` | ZIP para llevar el programa a otra computadora. |
| `CONTEXTO_DEL_PROYECTO.txt` | **La historia del proyecto:** qué se pidió, qué se decidió, qué se hizo, cómo está armado y qué falta. |
| `originales_del_cliente/` | Copias de lo que mandó el dueño: folleto anterior, logo original, cartel con el QR y fotos de repostería. |
| `investigacion/` | Folletos de mayoristas (solo inspiración) y textos oficiales de las normas. |
| `salidas/` | Muestras ya generadas (PNG y un PDF A4) y la lámina del logo. |
| `logo/` | Logo nuevo en vectores (SVG) y PNG transparentes: horizontal, vertical, íconos de perfil. |
| `assets/productos/` | Botellas de muestra (no son fotos reales). |
| `blender/` | Scripts de Blender que hicieron las botellas de muestra (`botellas.py`, `labels.py`). |
| `editor/` | Código fuente de la herramienta y `build.py` para reconstruirla. |
| `_trabajo/` | Herramientas de desarrollo (Python con recorte por IA, fuentes, pruebas). **No lo borres:** el recorte automático de fondo usa ese Python. |

## Cómo se usa, semana a semana

1. **Formato y fondo.** Ofertas A4 (10, 12 o 16), Post de 4, estrella + 4, Historia (estrella + 2 o 4 ofertas), un solo producto, **Mensaje** (anuncio sin productos) o colección sin precios. Los fondos se eligen mirando la miniatura y sirven en cualquier formato. Arriba aparece la próxima fecha especial con un botón que pone fondo y vigencia.
2. **Productos y precios.** Cada producto tiene *Precio normal · % desc. · Precio final*: **precio normal − % = precio final**, con centavos y sin redondear. El precio final es lo que paga el cliente; el medio de pago (QR de Mercado Pago, Visa, Mastercard, solo efectivo…) es solo la condición y sale debajo de cada precio. Cada producto puede tener su propio medio de pago («Descuento válido»: MP, efectivo, Visa, Mastercard, tarjetas…). Las insignias 2x1, 3x2, 2.ª al 50 %/70 % salen en rojo y su tamaño se ajusta (80–200 %). «Descuento para todos» lo hace en todos. «Pegar precios desde Excel» carga nombre, antes y oferta (y busca la foto por el nombre). Insignias rápidas 2x1, 3x2, 2.ª al 50 % / 70 % que escriben solas el precio por unidad.
3. **Leyenda del precio.** Precio anterior: ANTES / PRECIO NORMAL / PRECIO DE LISTA / DE $X A / solo tachado; palabra en la placa: FINAL / AHORA / OFERTA / ninguna; «AHORRÁS $X» y tamaño grande. El % de la insignia se redondea siempre hacia abajo (nunca anuncia más descuento que el real).
4. **Barra de la promo (un solo lugar).** Medio de pago, texto de la barra, %, cuotas y fechas Desde/Hasta, con vista previa. Las fechas y el % son un único dato para todo el folleto: si cambiás el %, los productos «como el folleto» se recalculan solos. **Fechas, promo y medios de pago.** Promo: Mercado Pago, MODO, efectivo, transferencia, débito, crédito, Visa, Mastercard o texto propio, con % y/o cuotas sin interés (cada producto muestra el valor de la cuota y al pie va «CFT 0,00 %»). Franja «Aceptamos» con los medios de pago y un texto opcional por cada uno.
5. **Finalizar según el destino.** A4 para imprimir (PNG 2480×3508 + PDF), publicación de Facebook/Instagram (1080×1350), canal y chats de WhatsApp (1620×2025), Estado/Historia (1080×1920). En redes, los productos se reparten parejo, hasta 4 por imagen (10 → 4, 3 y 3), para que se lean; si el folleto tiene producto estrella, va solo en la primera imagen. Si salen varias imágenes, van juntas en una carpeta del Escritorio. Con **«Un producto por imagen»** sale además una imagen individual por cada producto del folleto (Estados/Historias 1080×1920 o Facebook/canal 1620×2025), numeradas 01, 02… para mandarlas de a una.

Mientras editás: zoom con − / + / «🔍 Leer» o Ctrl + rueda; deshacer ↶ (Ctrl+Z) y rehacer ↷ (Ctrl+Y). El trabajo se guarda solo.

## QR del canal de WhatsApp

Salió de la foto del cartel del local: `https://whatsapp.com/channel/0029VauDHnQHFxOtGnhaa53E`. Probé leer el QR de los PNG exportados (a tamaño normal y a 300 dpi) y devuelve ese link. Se cambia en **Datos del local → Link del canal de WhatsApp**. Si cargás el link de Facebook, aparece un segundo QR.

En redes, el QR no se puede escanear desde el mismo celular: poné también el link en el texto de la publicación.

## Para confirmar

- **Nombre de la calle.** Me escribiste “Solís Pizarro 1430” y el folleto anterior decía “Sarli Pizarro 1430”. Usé “Solís”. Se corrige en Datos del local → Dirección.
- **Fecha de inicio de la promo de Mercado Pago.** Solo cargué “hasta el 18/10”. La Ley 24.240 (art. 7) pide inicio y fin.
- **Link de Facebook** para un segundo QR (el QR del folleto viejo era demasiado chico para leerlo).
- **Fotos reales** de los productos. Los dos productos extra del ejemplo (espumante y cerveza) los inventé para completar 10.
- **Cantidad de stock.** “Hasta agotar stock” sin cantidad no alcanza según el Dto. 1798/94: hay un campo en Legales.

## Qué se aplicó de marketing, y de dónde sale

Lo que hacen los folletos de Maxiconsumo, Makro, Yaguar, Diarco, Vital, Nini y Día (semana del 28/09 al 07/10/2026): rojo + amarillo + blanco, precio con “$” chico y cifra enorme, precio anterior tachado, “FINAL”, insignias de descuento, producto estrella arriba y grilla abajo, vigencia visible.

| Criterio | Fuente |
|---|---|
| Precio anterior como ancla de valor | https://digitalcommons.memphis.edu/facpubs/11759 |
| Precios terminados en 9 / 99 | https://ideas.repec.org/a/kap/qmktec/v1y2003i1p93-110.html |
| Escasez (“cantidad limitada”) rinde más que “tiempo limitado” | https://experts.umn.edu/en/publications/scarcity-messages-a-consumer-competition-perspective/ |
| Producto gancho | https://smallbiztrends.com/loss-leader-pricing-strategy/ |
| Jerarquía visual | https://www.nngroup.com/articles/visual-hierarchy-ux-definition/ |
| Cantidad de opciones por hoja (9–16, 12 es lo más común) | https://abcwest.cogs.indiana.edu/pmwiki/pdf/scheibehenne.options.2010.pdf |
| Tamaños Facebook/Instagram (4:5, 1080×1350) | https://www.facebook.com/business/help/430958953753149 |
| Historias y Estados (9:16, 1080×1920) | https://www.facebook.com/business/help/2222978001316177 |

## Legales: guía, no asesoría

La herramienta marca estos puntos. Leí yo el texto oficial de la Res. 446/2025 y de la leyenda de alcohol; el resto lo tomé de un relevamiento de fuentes oficiales y conviene que lo confirme un contador o abogado.

- **Ley 24.240, art. 7:** la oferta lleva fecha de comienzo y de finalización. https://servicios.infoleg.gob.ar/infolegInternet/anexos/0-4999/638/texact.htm
- **Dto. 1798/94, art. 7:** si limitás por stock, informá la cantidad. https://www.argentina.gob.ar/normativa/recurso/13734/texact/htm
- **Res. 446/2025:** en folletos, banda al pie de todo el ancho, mínimo 5 % del alto, letras de 4 mm en negrita, con “Para más información o limitaciones aplicables consulte en…”. En A4 se cumple; si imprimís más chico, agrandá la banda. https://www.boletinoficial.gob.ar/detalleAviso/primera/333879/20251103
- **Res. 4/2025:** mostrar el precio total y final. https://www.boletinoficial.gob.ar/detalleAviso/primera/319787/20250117
- **Ley 24.788:** la publicidad de bebidas alcohólicas lleva “Beber con moderación” y “Prohibida su venta a menores de 18 años”. Desde la versión 2.0 la leyenda viene **apagada** por pedido del dueño; se activa en Legales → Leyenda de alcohol. https://www.argentina.gob.ar/normativa/nacional/norma-154313/texto
- **Dto. 274/2019, art. 11:** el precio “Antes” tiene que ser real. https://servicios.infoleg.gob.ar/infolegInternet/anexos/70000-74999/74899/texact.htm

## Reconstruir

```bash
cd ~/RiveroMarket/editor && ../_trabajo/venv/bin/python build.py           # la herramienta
cd ~/RiveroMarket/logo   && ../_trabajo/venv/bin/python marca.py --todo    # logos
~/Descargas/blender-setup/blender-4.5.14-linux-x64/blender -b --factory-startup \
  --python ~/RiveroMarket/blender/botellas.py -- --samples 160             # botellas de muestra
```
