# Contexto del proyecto

## Resumen

Este proyecto es una aplicacion local en Astro para crear cotizaciones visuales de Chiguiro / Anderson Rueda.
La app permite editar una cotizacion desde un panel lateral, ver una previsualizacion en canvas y exportar el resultado como PNG o PDF.

El flujo principal esta pensado para generar propuestas economicas en formato grafico, con:

- numero y fecha de cotizacion;
- alcance del trabajo;
- items con icono, titulo, descripcion y valor;
- costo total automatico o manual;
- tiempo de entrega;
- terminos y condiciones;
- logo, firma, representante legal, datos bancarios y contacto;
- plantillas visuales y overrides de color;
- guardado local en `localStorage`.

## Stack

- Astro 4.
- TypeScript.
- Canvas 2D para renderizar la cotizacion.
- `jspdf` para exportar PDF.
- Sin backend.
- Persistencia en navegador via `localStorage`.

## Comandos

Desde la raiz del proyecto:

```powershell
npm run dev
npm run build
npm run preview
```

El puerto configurado para desarrollo es `4321` en `astro.config.mjs`.

## Estructura principal

- `src/pages/index.astro`: shell HTML de la aplicacion, panel de edicion, canvas de preview y carga de `initEditor`.
- `src/styles/global.css`: estilos de la interfaz de edicion y layout responsive.
- `src/lib/editor.ts`: estado vivo de la UI, binding de inputs, guardado, carga, subida de logo/firma, acciones de exportacion y renderizado de items.
- `src/lib/state.ts`: tipos de dominio, defaults, calculos de totales, formato COP y helpers de `localStorage`.
- `src/lib/render.ts`: render final de la cotizacion sobre canvas, incluyendo header, items, tiempo, footer y contacto.
- `src/lib/export.ts`: exportacion a PDF/PNG y render de preview.
- `src/lib/templates.ts`: plantillas visuales disponibles (`oscura`, `clara`, `minimalista`).
- `src/lib/icons.ts`: iconos SVG embebidos como data URL para evitar problemas de CORS durante la exportacion.

## Modelo de datos

La entidad principal es `Cotizacion` en `src/lib/state.ts`.

Campos relevantes:

- `numero`, `fecha`, `alcance`;
- `costoTotal` y `costoTotalAuto`;
- `items`;
- `tiempoEntrega`;
- `terminos`;
- `plantilla`;
- `coloresOverride`;
- `branding`.

El total real se calcula con `totalReal(c)`. Si `costoTotalAuto` esta activo, suma los valores de `items`; si esta desactivado, usa `costoTotal`.

## Persistencia local

Las claves usadas en `localStorage` son:

- `cotizador:draft`: borrador actual.
- `cotizador:saved`: lista de cotizaciones guardadas.
- `cotizador:branding`: datos de marca/contacto persistidos.

No hay sincronizacion remota ni base de datos.

## Render y exportacion

El documento final se construye en `buildExportCanvas(c)` dentro de `src/lib/render.ts`.

La salida tiene ancho fijo de `1080px`; la altura se calcula segun la cantidad de items con `computeHeight(itemCount)`.

El preview reutiliza el mismo render que la exportacion, asi que cualquier ajuste visual importante debe hacerse en `render.ts`, no solo en CSS.

## Consideraciones importantes

- Varias cadenas visibles en el codigo actual muestran mojibake, por ejemplo caracteres como `CotizaciÃ³n` o `ðŸ“„`. Antes de editar textos visibles conviene corregir o preservar cuidadosamente la codificacion.
- El canvas usa fuentes genericas (`Arial`, `Georgia`) y medidas fijas. Cambios de texto largo pueden requerir revisar wrapping y alturas.
- Los iconos estan embebidos para que la exportacion no dependa de archivos externos ni CORS.
- `dist/` y `.astro/` son artefactos generados; normalmente no se editan a mano.
- `node_modules/` esta presente localmente pero no debe tratarse como fuente del proyecto.

## Flujo recomendado para cambios

1. Revisar primero el archivo de dominio o UI afectado.
2. Si el cambio modifica datos, totales o guardado, empezar en `src/lib/state.ts`.
3. Si modifica controles o interaccion, revisar `src/lib/editor.ts`.
4. Si modifica el documento exportado o preview, tocar `src/lib/render.ts`.
5. Ejecutar `npm run build` para validar.
6. Si el cambio es visual, levantar `npm run dev` y revisar la app en `http://localhost:4321`.

## Prioridades actuales sugeridas

- Corregir la codificacion de textos visibles del proyecto.
- Agregar un `README.md` corto para uso humano si el proyecto se va a compartir.
- Verificar visualmente exportacion PNG/PDF con textos largos, varios items, logo y firma.
- Considerar separar defaults de marca en un archivo de configuracion si se reutiliza para mas clientes o marcas.
