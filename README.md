# Cotizador

Generador de cotizaciones y cuentas de cobro para freelancers y agencias. Crea cotizaciones con tu logo, firma y colores, expórtalas en PDF o envíalas por WhatsApp, y genera la cuenta de cobro cuando el cliente aprueba. Sin backend ni registro: todo queda en el navegador.

![Preview del cotizador](docs/preview.png)

## ¿Qué hace?

- **8 plantillas** (Clásica, Bloque, Noche, Diagonal, Estudio, Editorial, Redonda, Lateral). Todas se pintan con solo dos colores, principal y secundario, así cualquier marca se ve bien en cualquier diseño.
- **PDF vectorial**: el texto se puede seleccionar y copiar, los enlaces funcionan y el PDF pesa poco.
- **Tu marca una sola vez**: logo, firma (el fondo blanco se recorta solo), contacto y datos bancarios.
- **Estados**: borrador, enviada, aprobada, cobrada, pagada o descartada, con filtro en "Guardadas".
- **Cuenta de cobro** con el mismo total, el período del trabajo y el valor en letras.
- **Exporta** PDF, PNG, JSON y Markdown. También importa JSON.
- **Responsive**: en celular alternas entre editar y la vista previa.
- **IVA** sumado o incluido, con tarifa por ítem, descuento, anticipo y vigencia.
- **Respaldo en Google Drive** (opcional): se actualiza solo al guardar y sirve para pasar tus cotizaciones a otro equipo.
- **App instalable** que funciona sin conexión.
- **CLI** para Windows, macOS y Linux que usa el mismo render y crea cotizaciones desde cero. Cualquier agente de IA puede usarlo con la [guía del CLI](docs/guia-cli.md).

## Demo

[cotizador.andersonrueda.com](https://cotizador.andersonrueda.com)

## Correr localmente

Requiere **Node.js 22+**.

```bash
npm install
npm run dev
```

Abre [http://localhost:4321](http://localhost:4321).

## CLI

Usa el Edge (o Chrome) que ya tienes instalado; no descarga navegadores.

```bash
npm run cli -- pdf COTIZACION_00007.json
```

En Windows también puedes usar `cotizador.cmd` desde la carpeta del proyecto, o `npm link` para tener `cotizador` en cualquier terminal.

```text
cotizador nueva  --cliente "Empresa" --item "titulo=Logo; precio=850000" [--pdf]   (o --spec pedido.json)
cotizador resumen COTIZACION_00007.json [--json]
cotizador iconos [--buscar camaras] [--json]
cotizador disenos [--json]
cotizador esquema
cotizador pdf    COTIZACION_00007.json [-o salida.pdf]
cotizador png    COTIZACION_00007.json [-o salida.png] [--escala 2]
cotizador html   COTIZACION_00007.json [-o salida.html]
cotizador md     COTIZACION_00007.json [-o salida.md]
cotizador cuenta COTIZACION_00007.json --cliente grupo-logis --desde 07-09-2026 --hasta 15-10-2026 [--marcar]
cotizador estado COTIZACION_00007.json [aprobada]
cotizador lista  [carpeta]
cotizador config
```

`cuenta --marcar` guarda en el JSON el cliente y el período, y marca la cotización como cobrada. Los datos que no están en la cotización (nombre completo, dirección, cuenta bancaria y clientes frecuentes) se leen de `~/.cotizador.json`:

```json
{
  "emisor": { "nombreLegal": "NOMBRE COMPLETO", "direccion": "Calle …", "banco": "Cuenta de Ahorros BANCO No. …" },
  "clientes": { "mi-cliente": { "nombre": "EMPRESA S.A.S.", "nit": "900.000.000" } }
}
```

La guía completa, con el esquema JSON, los íconos por categoría, los diseños, las reglas de IVA y ejemplos, está en [docs/guia-cli.md](docs/guia-cli.md). Los agentes de IA pueden empezar por [llms.txt](llms.txt).

## Respaldo en Google Drive

Es opcional y no necesita servidor: el navegador pide un permiso de Google (`drive.file`, que solo da acceso a los archivos que crea la app) y guarda `cotizador-respaldo.json` en la carpeta *Cotizador* del Drive de la persona. Para activarlo en tu despliegue:

1. En [Google Cloud](https://console.cloud.google.com/) crea un proyecto y habilita la **Google Drive API**.
2. En **Google Auth Platform** completa la marca (nombre, correo de soporte, página principal y la URL de `/privacidad`), elige público **Externo** y agrega el permiso `.../auth/drive.file`.
3. En **Clientes** crea uno de tipo **Aplicación web** con tu dominio (y `http://localhost:4321`) en *Orígenes de JavaScript autorizados*. No hace falta URI de redirección ni el secreto.
4. Define `PUBLIC_GOOGLE_CLIENT_ID` al compilar: en local, en `.env.local`; en GitHub Pages, como variable del repositorio `GOOGLE_CLIENT_ID` (el workflow ya la pasa).

Sin ese valor, la opción solo aparece en el dominio oficial (y en localhost), con el ID de cliente del sitio que está en `src/lib/drive.ts`.

## Cómo se genera el documento

El documento es HTML/CSS (`src/lib/doc.ts` y `src/lib/layouts.ts`), no canvas:

- **Web**: la vista previa es ese HTML dentro de un `iframe`. El botón PDF descarga directo un PDF con la imagen del documento y una capa de texto invisible encima (como un PDF escaneado): se selecciona, se copia y los enlaces funcionan. "Más → PDF vectorial" llama a `print()` del iframe con `@page` del tamaño exacto del documento. El PNG se dibuja con el motor del navegador (SVG `foreignObject`), con html2canvas como plan B.
- **CLI**: Playwright abre el mismo HTML en Edge/Chrome y usa `page.pdf()` / `screenshot()`.

## Video tutorial

El video del centro de ayuda (`public/tutorial/tutorial.mp4`) se graba solo, con la app real y datos ficticios:

```bash
npm run tutorial
```

Necesita `npm run dev` corriendo en otra terminal, Edge o Chrome y `ffmpeg`. El guion, los subtítulos y las animaciones están en `tutorial/record.mjs`; vuelve a grabarlo cuando cambie la interfaz.

## Build para producción

```bash
npm run build
```

La carpeta `dist/` contiene el sitio estático listo para cualquier hosting.

## Stack

- [Astro](https://astro.build/) — sitio estático
- HTML/CSS + `print()` — PDF vectorial
- [Playwright](https://playwright.dev/) (`playwright-core`) — CLI
- [Lucide Icons](https://lucide.dev/) — íconos SVG embebidos
- Roboto, Poppins y Playfair Display vía [Fontsource](https://fontsource.org/)

## Licencia

MIT — libre para usar, modificar y distribuir.
