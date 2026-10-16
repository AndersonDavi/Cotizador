# Contexto del proyecto

## Resumen

Aplicación en Astro (100% estática) para crear cotizaciones de Chigüiro / Anderson Rueda y de cualquier freelancer. El documento se genera como HTML/CSS y se exporta a PDF vectorial (texto seleccionable), PNG, JSON y Markdown. Incluye cuenta de cobro y un CLI que usa el mismo render.

## Comandos

```powershell
npm run dev        # http://localhost:4321
npm run build
npm run cli -- pdf COTIZACION_00007.json   # o .\cotizador.cmd pdf …
npx tsc --noEmit   # typecheck
```

## Estructura

- `src/pages/index.astro`: interfaz (pestañas Cotización / Ítems / Diseño / Mi marca / Cobro / Guardadas, barra de acciones, vista previa con dos iframes).
- `src/styles/global.css`: estilos de la interfaz (responsive: en < 860 px se alterna Editar / Vista previa).
- `src/lib/editor.ts`: estado de la UI, bindings (`FIELDS`), ítems, galería de diseños, colores, logo/firma, cobro, guardadas, vista previa sin parpadeo (render en el iframe oculto y swap).
- `src/lib/state.ts`: tipos (`Cotizacion`, `Estado`, `Cliente`, `DatosCobro`), defaults, totales, formato COP, `localStorage`.
- `src/lib/theme.ts`: `DisenoId`, `DISENOS`, `PALETAS`, utilidades de color y `buildTheme(primario, secundario)`.
- `src/lib/doc.ts`: render HTML de la plantilla **Clásica**, cuenta de cobro, Markdown, fuentes (`FONT_SPECS`) y el script `ENHANCE_JS` que corre dentro del documento.
- `src/lib/layouts.ts`: las otras 7 plantillas (Bloque, Noche, Diagonal, Estudio, Editorial, Redonda, Lateral).
- `src/lib/export.ts`: solo navegador. Fuentes vía `?url`, `print()` del iframe para PDF, PNG con SVG `foreignObject` (y html2canvas como plan B).
- `cli/main.ts` + `bin/cotizador.mjs` + `cotizador.cmd`: CLI (tsx + playwright-core con el Edge/Chrome instalado).
- `cli/nueva.ts`: comando `nueva` (especificación JSON parcial → `Cotizacion`, usando una cotización base para la marca), numeración, validación de íconos con sugerencias y listados para agentes. Guía de uso: `docs/guia-cli.md` (mantenerla al día si cambian comandos, íconos, diseños o paletas); `llms.txt` apunta a ella.
- `src/lib/drive.ts`: respaldo en Google Drive sin backend (Google Identity Services, permiso `drive.file`, token solo en memoria). Se activa con `PUBLIC_GOOGLE_CLIENT_ID` al compilar; sin él la opción no aparece. `src/pages/privacidad.astro` es la política que pide Google.
- `src/lib/icons.ts`: íconos Lucide como SVG, categorías (`ICON_CATEGORIES`) y sinónimos de búsqueda.
- `src/lib/templates.ts`: paletas legadas de la Clásica (oscura/clara/minimalista).

## Render (importante)

- `doc.ts` y `layouts.ts` no tocan el DOM: generan strings, para que el CLI los use en Node.
- La **Clásica** replica al píxel el render en canvas anterior (las cotizaciones viejas se ven igual): mismas coordenadas, mismo `fitFontSize` (pasos de 2 px), recorte de firma y corrección de línea base (`cvShift`, porque el canvas usaba `textBaseline: 'top'`). Si se cambia, comparar contra un PNG de referencia.
- Las plantillas nuevas usan CSS normal; `data-fit` achica textos de una línea que no caben.
- `ENHANCE_JS` expone `window.__docReady` → `{width, height}` y fija `@page` al tamaño del documento (una sola página al imprimir). La cuenta de cobro usa `data-fixed-page` y tamaño carta.
- El iframe que mide el documento nunca debe estar dentro de `display:none` (todo mediría 0); en celular la vista previa se oculta con `visibility`.
- Al agregar una fuente: sumarla a `FONT_SPECS` (doc.ts) **y** importarla en `export.ts` (en dev hay un aviso en consola si falta).

## Ayuda y video

- `src/lib/tour.ts`: guías de driver.js por sección (`TOURS`); se lanzan desde el centro de ayuda y desde "Guía de esta sección" en cada pestaña. Si cambia un id del HTML, actualizar los pasos.
- `tutorial/record.mjs` graba `public/tutorial/tutorial.mp4` y `poster.jpg` (`npm run tutorial` con el dev server corriendo). Usa selectores reales de la UI: si cambian, ajustar el guion y regrabar.
- El material público (video, og-image) usa solo datos ficticios.
- `src/lib/inputs.ts`: máscaras de dinero y fecha. `src/lib/colorpicker.ts`: selector de color propio.

## App instalable y actualizaciones

- `src/pages/sw.js.ts` genera `/sw.js` en cada build con una versión distinta (`GITHUB_SHA` en Actions). Navegación: red primero; `/_astro/*` (con hash): caché primero; lo demás: caché y se renueva por detrás.
- La versión nueva queda en espera: `initActualizaciones` (editor.ts) muestra la barra "Hay una versión nueva" y, al tocar Actualizar, guarda el borrador, activa el SW nuevo y recarga. Se revisa al volver a la pestaña y cada 30 min. Solo en producción.
- Botón "Instalar" arriba cuando el navegador lo permite (`beforeinstallprompt`); en iPhone abre instrucciones (`#iosModal`). Si la persona dice que no, descansa 30 días (sigue en Más).
- El indicador de Drive (`#driveChip`) muestra el estado: Respaldar / En Drive / Subiendo / Sin respaldar. En Guardadas hay un aviso para conectar (se pospone 14 días con "Ahora no").
- El panel de navegador integrado no registra service workers: para probar, build + servidor estático + Edge con playwright-core.

## Versiones

- Cada publicación a main sube `version` en `package.json`: arreglo → parche (1.0.1), función nueva → menor (1.1.0), cambio que rompe datos guardados → mayor.
- Agregar la entrada arriba de todo en `src/lib/novedades.ts` (fecha dd-mm-aaaa, `tipo` 'arreglo' o 'nueva', cambios en lenguaje de usuario). El centro de ayuda muestra la versión cargada, el commit y ese historial; tras actualizar sale el aviso "Actualizado a la versión X".
- `build-info.mjs` calcula versión, commit y fecha; `astro.config.mjs` los expone como `__BUILD__` (también el nombre de la caché del service worker). El CLI: `cotizador --version`.

## Páginas de contenido (SEO)

- `src/layouts/Contenido.astro` + `src/pages/cuenta-de-cobro.astro` y `cotizacion.astro`: guías con texto para Google (HowTo, FAQPage y BreadcrumbList en JSON-LD). Sus botones abren la app con `/?tab=cobro` o `/?tab=cotizacion`.
- `build.format: 'file'` genera `cotizacion.html`: GitHub Pages la sirve en `/cotizacion` sin redirigir a `/cotizacion/` (la canónica y el sitemap van sin barra final).
- Las imágenes de `public/ejemplos/` salen de `npm run ejemplos` (tutorial/ejemplos.ts) con los datos ficticios de `tutorial/demo.mjs`.
- Al agregar una página: sumarla a `public/sitemap.xml` y enlazarla desde la app o desde otra guía.

## Modelo de datos

`Cotizacion` (`state.ts`): `numero`, `fecha` (dd-mm-aaaa), `alcance`, `items`, `costoTotal`/`costoTotalAuto`, `tiempoEntrega`, `terminos`, `branding` (logo, representante + firma, `empresa`, `nombreLegal`, `direccion`, `banco`, contacto), `diseno`, `colores` {primary, secondary}, `titulo`, `estado`, `cliente` {nombre, nit, cel}, `cobro` {fecha, desde, hasta, concepto, parte}, `impuestos` {ivaModo, ivaTasa, descuentoTipo, descuento, anticipo}, `vigenciaDias`. Cada `Item` puede tener `cantidad`, `unidad` e `ivaTasa` propia; `valor` es el precio unitario. Los totales salen siempre de `totales(c)`.

Compatibilidad: sin `colores` se usan `plantilla` + `coloresOverride` (formato anterior); sin `diseno` es la Clásica; sin `estado` es borrador.

## Persistencia local

`cotizador:draft`, `cotizador:saved`, `cotizador:branding`, `cotizador:welcomed`, `cotizador:tab`, `cotizador:catalogo`, `cotizador:clientes`, `cotizador:paletas`, `cotizador:drive` (estado de la conexión, sin tokens). Logo y firma se reducen al subirlos para no llenar `localStorage`.

El CLI lee `~/.cotizador.json` (emisor, clientes frecuentes y `base`, la cotización de la que `nueva` copia la marca); no va en el repo porque tiene datos personales.
