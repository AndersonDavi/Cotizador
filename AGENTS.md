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
- `src/lib/icons.ts`: íconos Lucide como SVG.
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

## Modelo de datos

`Cotizacion` (`state.ts`): `numero`, `fecha` (dd-mm-aaaa), `alcance`, `items`, `costoTotal`/`costoTotalAuto`, `tiempoEntrega`, `terminos`, `branding` (logo, representante + firma, `empresa`, `nombreLegal`, `direccion`, `banco`, contacto), `diseno`, `colores` {primary, secondary}, `titulo`, `estado`, `cliente` {nombre, nit}, `cobro` {fecha, desde, hasta, concepto}.

Compatibilidad: sin `colores` se usan `plantilla` + `coloresOverride` (formato anterior); sin `diseno` es la Clásica; sin `estado` es borrador.

## Persistencia local

`cotizador:draft`, `cotizador:saved`, `cotizador:branding`, `cotizador:welcomed`, `cotizador:tab`. Logo y firma se reducen al subirlos para no llenar `localStorage`.

El CLI lee `~/.cotizador.json` (emisor y clientes frecuentes); no va en el repo porque tiene datos personales.
