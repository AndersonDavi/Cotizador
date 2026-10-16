# Guía del CLI del Cotizador (para personas y agentes de IA)

Esta guía explica cómo crear y manejar cotizaciones desde la terminal. Está escrita para que cualquier asistente de IA o agente (Claude, ChatGPT, Gemini, Copilot, un script) la siga sin conocer el código: todo lo que necesita está aquí o se consulta con un comando.

## 1. Cómo se ejecuta

Desde la carpeta del proyecto, después de `npm install`:

```bash
npm run cli -- <comando> [argumentos]
```

Alternativas: `.\cotizador.cmd <comando>` en Windows, o `cotizador <comando>` después de `npm link`. En los ejemplos se escribe `cotizador`.

Requisitos: Node.js 22+ y Edge o Chrome instalado (solo para PDF y PNG; el resto funciona sin navegador).

Reglas para agentes:

- Si un comando falla, sale con código 1 y escribe `Error: …` en stderr. El mensaje dice qué corregir (por ejemplo `ícono "camara" no existe. ¿Quisiste decir: cctv?`). Corrige y repite.
- Para leer datos, usa las variantes `--json` (`resumen`, `iconos`, `disenos`) en lugar de interpretar texto.
- No inventes claves de íconos, diseños ni paletas: consulta las listas de este documento o los comandos `iconos` y `disenos`.
- No modifiques a mano el JSON de una cotización si hay un comando que lo hace (`estado`, `cuenta --marcar`).

## 2. Comandos

| Comando | Qué hace |
|---|---|
| `nueva` | Crea una cotización desde cero (`COTIZACION_<n>.json`) y, si se pide, su PDF o PNG |
| `resumen <json> [--json]` | Muestra ítems, subtotal, IVA, descuento, total y anticipo |
| `iconos [--buscar <texto>] [--json]` | Lista los íconos por categoría o busca por palabra |
| `disenos [--json]` | Lista las plantillas y las paletas de color |
| `esquema` | Imprime un ejemplo completo de especificación para `nueva --spec` |
| `pdf <json> [-o salida.pdf]` | PDF vectorial (texto seleccionable) |
| `png <json> [-o salida.png] [--escala 2]` | Imagen PNG |
| `html <json>` / `md <json>` | HTML del documento / Markdown |
| `cuenta <json> --desde … --hasta … [--parte …] [--marcar]` | Cuenta de cobro en PDF |
| `estado <json> [nuevo]` | Muestra o cambia el estado |
| `lista [carpeta]` | Lista las cotizaciones de una carpeta con estado y total |
| `config` | Muestra la configuración (`~/.cotizador.json`) |

## 3. Crear una cotización: `nueva`

Hay dos formas. Las dos dan el mismo resultado.

### 3.1 Con opciones (casos sencillos)

```bash
cotizador nueva --cliente "Ferretería El Tornillo" --nit "900.111.222-3" \
  --alcance "Instalación de cámaras" \
  --item "titulo=Cámara IP 4 MP; precio=350000; cantidad=8; unidad=und; icono=cctv" \
  --item "titulo=Visita técnica; precio=80000; icono=clipboard; iva=exento" \
  --iva agregar --anticipo 50 --vigencia 15 --pdf
```

`--item` se repite una vez por ítem. Su formato es `clave=valor` separado por `;`. Claves: `titulo` (obligatoria), `precio` (obligatoria, precio unitario), `cantidad`, `unidad`, `icono`, `iva`, `descripcion`.

### 3.2 Con una especificación JSON (recomendado para agentes)

Escribe un archivo y pásalo con `--spec`, o mándalo por la entrada estándar con `--spec -`:

```bash
cotizador nueva --spec pedido.json -o "G:/Mi unidad/Proyectos/Cliente" --pdf
cotizador esquema > pedido.json      # ejemplo para empezar
```

Esquema (solo `items` es obligatorio; cada ítem necesita `titulo` y `precio`):

```jsonc
{
  "cliente": { "nombre": "Panadería La Esquina S.A.S.", "nit": "901.234.567-8", "cel": "300 000 0000" },
  // o "cliente": "grupo-logis" con la clave de un cliente guardado en la config
  "alcance": "Instalación de cámaras de seguridad en el local",
  "titulo": "Propuesta económica",        // opcional
  "fecha": "15-10-2026",                  // dd-mm-aaaa; por defecto hoy
  "numero": "00012",                      // opcional; por defecto el siguiente de la carpeta
  "estado": "borrador",                   // ver sección 6
  "items": [
    {
      "titulo": "Cámara IP 4 MP exterior",
      "descripcion": "Incluye soporte, conector y configuración.",
      "cantidad": 8,
      "unidad": "und",
      "precio": 350000,                   // precio UNITARIO en pesos; acepta "350.000" o "$350.000"
      "icono": "cctv",                    // ver sección 4; si falta se adivina por el título
      "iva": 19                           // opcional: 19, 5, 0 o "exento"; sin valor usa la tarifa general
    }
  ],
  "diseno": "bloque",                     // ver sección 5
  "paleta": "Marino",                     // o "colores": "#0E2240,#F6C443"
  "iva": "agregar",                       // "ninguno" | "agregar" | "incluido"
  "ivaTasa": 19,
  "descuento": "5%",                      // "10%" (porcentaje) o 50000 (pesos)
  "anticipo": 50,                         // porcentaje
  "vigencia": 15,                         // días; el documento muestra "Válida hasta"
  "tiempoEntrega": "5 días hábiles después del anticipo.",
  "terminos": ["50% de anticipo y 50% contra entrega.", "Garantía de 12 meses en equipos."]
}
```

Las opciones de la línea de comandos se suman a la especificación y tienen prioridad sobre ella.

### 3.3 De dónde salen la marca, los términos y el diseño

Lo que la especificación no dice se copia de una **cotización base**: logo, firma, datos de contacto, cuenta bancaria, términos, tiempo de entrega, diseño, colores y modo de IVA. La base se elige con `--base COTIZACION_00007.json` o con `"base"` en `~/.cotizador.json`. Sin base la cotización sale sin marca (el comando lo avisa).

### 3.4 Dónde se guarda y cómo se numera

- `-o carpeta`: guarda `COTIZACION_<n>.json` en esa carpeta. El número es el siguiente al mayor que haya en la carpeta y sus subcarpetas (hasta 3 niveles), con 5 dígitos: `00008`.
- `-o archivo.json`: guarda con ese nombre.
- Sin `-o`: la carpeta actual.
- Nunca sobrescribe: si el archivo existe, falla. Usa `--numero` u otro `-o`.
- `--pdf` y `--png` generan el documento al lado del JSON con el mismo nombre.

Al terminar imprime el resumen (ítems, desglose y total) para que lo puedas verificar o mostrar.

## 4. Íconos

Cada ítem lleva un ícono. Usa la **clave** (columna izquierda). `cotizador iconos --buscar <palabra>` busca también por sinónimos (`camaras`, `electricista`, `aire`, `envio`…).

**Tecnología**: `code` Código · `monitor` Web / UI · `mobile` Mobile · `database` Base de datos · `server` Servidores / Hosting · `cloud` Infraestructura · `wifi` Redes / Wi-Fi · `cpu` Hardware · `cart` Tienda en línea · `bug` Bug / Fix · `bolt` Optimización · `gear` Configuración · `lock` Seguridad · `search` Análisis · `chart` Datos

**Diseño y contenido**: `palette` Diseño gráfico · `pentool` Ilustración · `layout` Landing page · `image` Post / Redes · `share` Redes sociales · `film` Video / Motion · `camera` Fotografía · `mic` Audio / Locución · `type` Tipografía · `printer` Impresión · `megaphone` Publicidad · `mail` Email marketing

**Instalación y mantenimiento**: `wrench` Mantenimiento · `hammer` Obra / Instalación · `plug` Electricidad · `lightbulb` Iluminación · `cctv` Cámaras de seguridad · `droplet` Plomería · `snowflake` Aire acondicionado · `paint` Pintura · `ruler` Medición / Planos · `key` Cerrajería / Accesos · `sun` Energía solar · `battery` Baterías / UPS · `home` Hogar · `building` Edificio / Local · `leaf` Jardinería · `sparkles` Limpieza

**Servicios y negocio**: `check` Entrega · `clipboard` Visita técnica · `clock` Tiempo · `calendar` Plan mensual · `pin` Desplazamiento · `truck` Transporte / Envío · `package` Materiales · `users` Equipo / Mano de obra · `user` Usuario · `chat` Soporte · `shield` Garantía · `graduation` Capacitación · `file` Documentación · `dollar` Costo · `car` Vehículos · `scissors` Belleza / Estética · `utensils` Alimentos / Eventos

Si la lista cambia, la fuente de verdad es `cotizador iconos --json`.

## 5. Diseños y paletas

| `diseno` | Nombre | Estilo |
|---|---|---|
| `clasica` | Clásica | Encabezado en degradado y tarjetas por ítem |
| `bloque` | Bloque | Bloques de color y tabla con totales |
| `noche` | Noche | Fondo oscuro con curvas de acento |
| `diagonal` | Diagonal | Franjas en diagonal y pie a dos colores |
| `estudio` | Estudio | Bandas, esquinas y tabla a rayas |
| `panel` | Panel | Encabezado en bloque, tarjetas y filas redondeadas |
| `corporativa` | Corporativa | Sobria para empresas, con tabla a rayas |
| `mosaico` | Mosaico | Ítems en baldosas y el total en color |
| `editorial` | Editorial | Tipografía serif, blanco y negro |
| `redonda` | Redonda | Banda de color con esquinas redondeadas |
| `lateral` | Lateral | Columna lateral con la marca y el total |

Todas las plantillas se pintan con dos colores: principal y secundario. Usa una paleta por nombre o dos hexadecimales en `colores`.

| `paleta` | Principal | Secundario |
|---|---|---|
| Chigüiro | `#2F2E33` | `#F2D22B` |
| Carbón | `#2F2E33` | `#E3A94F` |
| Marino | `#0E2240` | `#F6C443` |
| Océano | `#1F3B57` | `#4FD1C5` |
| Bosque | `#245A2F` | `#C5E063` |
| Coral | `#232428` | `#E8623A` |
| Uva | `#4B2A7B` | `#F08BB4` |
| Vino | `#7A1F2B` | `#E9C46A` |
| Grafito | `#16181C` | `#A8ADB5` |
| Cielo | `#1D4ED8` | `#BFDBFE` |

Si no se indica, se usan el diseño y los colores de la base.

## 6. Estados

`borrador` → `enviada` → `aprobada` → `cobrada` → `pagada`, o `descartada` en cualquier momento.

```bash
cotizador estado COTIZACION_00008.json            # muestra el estado
cotizador estado COTIZACION_00008.json enviada    # lo cambia
cotizador lista "G:/Mi unidad/Proyectos"          # todas, con estado y total
```

Una cotización nueva queda en `borrador`. `cuenta --marcar` la pasa a `cobrada`.

## 7. Valores, IVA, descuento y anticipo

- **Moneda**: pesos colombianos (COP), sin decimales. En los documentos se escriben `$1.160.000`.
- **Valor de un ítem** = `precio` × `cantidad` (cantidad 1 si no se indica). Con cantidad distinta de 1 el documento muestra `8 und × $350.000`.
- **Descuento**: se aplica al subtotal antes del IVA. Porcentaje (`"10%"`) o valor en pesos (`50000`).
- **IVA** (`iva`):
  - `ninguno`: no se muestra IVA.
  - `agregar`: el IVA se suma encima de los precios.
  - `incluido`: los precios ya traen IVA; el documento separa base e IVA y el total no cambia.
- **Tarifa**: `ivaTasa` es la general (19 por defecto). Un ítem puede tener la suya con `iva` (`5`, `0` o `"exento"`). El desglose muestra una línea por tarifa ("IVA 19 %", "IVA 5 %", "Exento de IVA").
- **Anticipo**: porcentaje del total. El documento muestra "Anticipo 50 %" y "Saldo contra entrega".
- **Vigencia**: días desde la fecha; el documento muestra "Válida hasta dd-mm-aaaa".

Para verificar las cuentas sin abrir el PDF:

```bash
cotizador resumen COTIZACION_00008.json --json
```

Devuelve `numero`, `fecha`, `validaHasta`, `estado`, `cliente`, `items` (con `precioUnitario`, `cantidad`, `valor` y `ivaTasa`) y `totales` (`subtotal`, `descuento`, `base`, `ivaModo`, `ivaTasa`, `iva`, `ivaDetalle`, `total`, `anticipoPct`, `anticipo`, `saldo`). Todos los valores son números en pesos.

## 8. Cuenta de cobro

Cuando el cliente aprueba y el trabajo se entrega:

```bash
cotizador cuenta COTIZACION_00008.json --cliente grupo-logis --desde 07-09-2026 --hasta 15-10-2026 --marcar
```

- `--desde` / `--hasta`: período del trabajo (obligatorio).
- `--parte total|anticipo|saldo`: qué se cobra si la cotización tiene anticipo.
- `--concepto "…"`: inicio del párrafo "Por concepto de".
- `--marcar`: guarda los datos en el JSON y marca la cotización como `cobrada`.
- Sale `CUENTA-COBRO-COTIZACION-<n>.pdf` al lado del JSON.

El nombre legal, la dirección y la cuenta bancaria del emisor vienen de `~/.cotizador.json`.

## 9. Configuración (`~/.cotizador.json`)

Archivo personal, fuera del repositorio. Nunca lo subas ni copies su contenido a lugares públicos.

```json
{
  "base": "G:/Mi unidad/Proyectos/Cliente/Cotizaciones/COTIZACION_00007.json",
  "emisor": { "nombreLegal": "NOMBRE COMPLETO", "direccion": "Calle …", "banco": "Cuenta de Ahorros BANCO No. …" },
  "clientes": { "mi-cliente": { "nombre": "EMPRESA S.A.S.", "nit": "900.000.000-0", "cel": "300 000 0000" } }
}
```

Con clientes guardados, `--cliente mi-cliente` (o `"cliente": "mi-cliente"` en la especificación) completa nombre, NIT y celular.

## 10. Convenciones

- Fechas: `dd-mm-aaaa` (también se acepta `aaaa-mm-dd`).
- Números de cotización: 5 dígitos (`00008`).
- Archivos: `COTIZACION_<n>.json` / `.pdf` / `.png` y `CUENTA-COBRO-COTIZACION-<n>.pdf`.
- Organización sugerida: una carpeta por cliente con subcarpetas `Cotizaciones` y `Cuentas de cobro`.
- Textos en español, con mayúscula inicial solo en la primera palabra.

## 11. Flujos típicos (pedidos en lenguaje natural)

| La persona dice | El agente hace |
|---|---|
| "Cotízale a la Panadería La Esquina 8 cámaras a 350 mil y la instalación a 600 mil, con IVA" | Escribe la especificación, `nueva --spec - -o <carpeta del cliente> --pdf`, muestra el resumen y la ruta del PDF |
| "¿Cuánto da la 0008 con 10 % de descuento?" | Crea una copia con `nueva` y `--descuento 10%` en una carpeta temporal o usa `resumen --json` sobre una copia; no modifica la original sin permiso |
| "Ya me aprobaron la 0008" | `estado COTIZACION_00008.json aprobada` |
| "Hazme la cuenta de cobro del anticipo" | `cuenta COTIZACION_00008.json --parte anticipo --desde … --hasta … --marcar` |
| "¿Qué cotizaciones tengo pendientes?" | `lista <carpeta>` y filtra `enviada` / `aprobada` |
| "Ponle un ícono de aire acondicionado" | `iconos --buscar aire` → `snowflake` |

Antes de crear algo, confirma con la persona los datos que falten (cliente, precios, si lleva IVA). No inventes precios.
