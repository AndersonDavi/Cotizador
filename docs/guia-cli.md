# Guía del CLI del Cotizador (para personas y agentes de IA)

Esta guía explica cómo crear y manejar cotizaciones desde la terminal. Está escrita para que cualquier asistente de IA o agente (Claude, ChatGPT, Gemini, Copilot, un script) la siga sin conocer el código: todo lo que necesita está aquí o se consulta con un comando.

## 1. Cómo se ejecuta

Desde la carpeta del proyecto, después de `npm install`:

```bash
npm run cli -- <comando> [argumentos]
```

Alternativas: `.\cotizador.cmd <comando>` en Windows, o `cotizador <comando>` después de `npm link`. En los ejemplos se escribe `cotizador`.

**En PowerShell** usa `.\cotizador.cmd …` o escribe `npm run cli '--' …` (con comillas): PowerShell se come el `--` sin comillas y npm se queda con las opciones del CLI (`--spec`, `-o`, `--pdf`), así que el comando llega incompleto.

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
| `esquema [--completo]` | Imprime un ejemplo de especificación para `nueva --spec` (`--completo`: proyecto por fases con opciones, costos de terceros e hitos) |
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

`--item` se repite una vez por ítem. Su formato es `clave=valor` separado por `;`. Claves: `titulo` (obligatoria), `precio` (obligatoria, precio unitario), `cantidad`, `unidad`, `icono`, `iva`, `descripcion`, `grupo` (ver 3.5), `clave` (ver 3.6).

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
      "iva": 19,                          // opcional: 19, 5, 0 o "exento"; sin valor usa la tarifa general
      "grupo": "Equipos"                  // opcional: ver 3.5
    }
  ],
  "grupos": [ ... ],                      // opcional: otra forma de escribir los grupos (3.5)
  "diseno": "bloque",                     // ver sección 5
  "paleta": "Marino",                     // o "colores": "#0E2240,#F6C443"
  "iva": "agregar",                       // "ninguno" | "agregar" | "incluido"
  "ivaTasa": 19,
  "descuento": "5%",                      // "10%" (porcentaje) o 50000 (pesos)
  "anticipo": 50,                         // porcentaje
  "vigencia": 15,                         // días; el documento muestra "Válida hasta"
  "tiempoEntrega": "5 días hábiles después del anticipo.",
  "terminos": ["50% de anticipo y 50% contra entrega.", "Garantía de 12 meses en equipos."],
  "mostrarBanco": false                   // opcional: sin la cuenta bancaria (para que no parezca un cobro)
}
```

Las opciones de la línea de comandos se suman a la especificación y tienen prioridad sobre ella.

### 3.3 De dónde salen la marca, los términos y el diseño

Lo que la especificación no dice se copia de una **cotización base**: logo, firma, datos de contacto, cuenta bancaria, si cotizas como persona natural o como empresa (razón social, NIT y cargo de quien firma), términos, tiempo de entrega, diseño, colores y modo de IVA. La base se elige con `--base COTIZACION_00007.json` o con `"base"` en `~/.cotizador.json`. Sin base la cotización sale sin marca (el comando lo avisa).

### 3.4 Dónde se guarda y cómo se numera

- `-o carpeta`: guarda `COTIZACION_<n>.json` en esa carpeta. El número es el siguiente al mayor que haya en la carpeta y sus subcarpetas (hasta 3 niveles), con 5 dígitos: `00008`.
- `-o archivo.json`: guarda con ese nombre.
- Sin `-o`: la carpeta actual.
- Nunca sobrescribe: si el archivo existe, falla. Usa `--numero` u otro `-o`.
- `--pdf` y `--png` generan el documento al lado del JSON con el mismo nombre.

Al terminar imprime el resumen (ítems, desglose y total) para que lo puedas verificar o mostrar.

### 3.5 Grupos de ítems (fases, etapas, áreas)

Los ítems seguidos que tienen el mismo `grupo` salen en el documento bajo un encabezado con el nombre del grupo y su subtotal (antes de IVA y descuento), en todas las plantillas. Sirve para separar un desarrollo por fases o una obra por áreas. El total del documento no cambia y la numeración de los ítems sigue corrida (1, 2, 3… a través de los grupos).

- Un grupo empieza donde cambia el `grupo` entre un ítem y el siguiente: pon juntos los ítems de cada grupo.
- Si un ítem sin grupo queda después de uno agrupado, sale bajo "Otros". Los ítems sin grupo al principio salen sin encabezado.
- Sin ningún grupo el documento se ve como siempre.

Dos formas equivalentes de escribirlo:

```jsonc
// 1) "grupo" en cada ítem
"items": [
  { "titulo": "Descubrimiento y prueba técnica", "precio": 4500000, "icono": "search", "grupo": "Fase 0: descubrimiento" },
  { "titulo": "Catálogo de productos", "precio": 3500000, "icono": "cart", "grupo": "Fase 1: MVP" },
  { "titulo": "Pagos en línea con Wompi", "precio": 3000000, "icono": "dollar", "grupo": "Fase 1: MVP" }
]

// 2) "grupos", cada uno con sus ítems (se agregan después de "items", en orden)
"grupos": [
  { "nombre": "Fase 0: descubrimiento", "items": [ { "titulo": "Descubrimiento y prueba técnica", "precio": 4500000, "icono": "search" } ] },
  { "nombre": "Fase 1: MVP", "items": [
    { "titulo": "Catálogo de productos", "precio": 3500000, "icono": "cart" },
    { "titulo": "Pagos en línea con Wompi", "precio": 3000000, "icono": "dollar" }
  ] }
]
```

Con opciones: `--item "titulo=Catálogo de productos; precio=3500000; icono=cart; grupo=Fase 1: MVP"`.

En la app, el interruptor **Separar por fases o secciones** (pestaña Ítems) muestra el campo **Grupo** en cada ítem; los ítems del mismo grupo se juntan solos y los nuevos entran al grupo del último. `resumen --json` devuelve `grupo` en cada ítem y la lista `grupos` con nombre, subtotal y cantidad de ítems.

### 3.6 Opciones para comparar (escenarios)

Una cotización puede proponer 2 o 3 alcances, por ejemplo "A. Básica", "B. Recomendada" y "C. B + soporte". El documento muestra una tabla comparativa (filas = fases o ítems, columnas = opciones, ✓ incluido / — no incluido, "Parcial · 5 de 8" si una opción lleva solo parte de una fase) con el total de cada opción. **El total del documento es el de la opción recomendada** (si ninguna lo es, la primera); también es el que cobra la cuenta de cobro y sobre el que se calculan los hitos. El total de cada opción sale de la misma cuenta de siempre (IVA, descuento) con solo sus ítems.

```jsonc
"items": [
  { "titulo": "Descubrimiento", "precio": 4500000, "grupo": "Fase 0" },
  { "clave": "catalogo", "titulo": "Catálogo de productos", "precio": 3500000, "grupo": "Fase 1" },
  { "titulo": "Soporte y mantenimiento", "precio": 2000000, "cantidad": 12, "unidad": "meses", "grupo": "Soporte" }
],
"opciones": [
  { "nombre": "A. Básica", "descripcion": "Lo mínimo", "incluye": ["catalogo"] },
  { "nombre": "B. Recomendada", "recomendada": true, "incluye": ["Fase 0", "Fase 1"] },
  { "nombre": "C. B + soporte", "incluye": "todo" }
]
```

- `incluye` lleva nombres de fase (todos sus ítems) y/o la `clave` de ítems sueltos; `"todo"` incluye todo. Los nombres se comparan sin importar mayúsculas, tildes ni espacios (`"fase1"` = `"Fase 1"`).
- Un ítem que no está en la recomendada (el soporte del ejemplo) sigue en la lista de ítems con la nota "Solo en C. B + soporte".
- Las opciones necesitan el total sumado de los ítems (el CLI siempre lo usa).
- Errores: `opciones: usa una lista de 2 o 3 opciones`, `opción "B": "Fase 7" no es una fase ni la clave de un ítem. Fases: …`, `solo una puede ser la recomendada`.

### 3.7 Costos de terceros (informativos)

Lo que el cliente paga directamente a otros proveedores (hosting, base de datos, pasarela de pagos…). Salen en la tabla "Costos de terceros (no incluidos en el valor)" y **nunca suman al total**.

```jsonc
"costosTerceros": [
  { "concepto": "Servidor VPS", "proveedor": "Hetzner", "valor": "24-48", "moneda": "USD", "periodo": "mensual" },
  { "concepto": "Pasarela de pagos", "proveedor": "Wompi", "periodo": "transaccion", "nota": "2,65 % + $700 + IVA por transacción" }
],
"trm": 4000,                 // opcional: pesos por dólar, muestra "≈ $96.000–$192.000"
"notaTerceros": "…"          // opcional: nota al pie (por defecto: valores referenciales de las páginas de cada proveedor)
```

- `valor`: número, `"150.000"` o un rango `"24-48"` (también `valorHasta`). Sin valor, la columna muestra la `nota`.
- `moneda`: `COP` (por defecto) o `USD`. `periodo`: `mensual`, `anual`, `transaccion` o `unico`.

### 3.8 Plan de pagos por hitos

Divide el pago en partes ligadas a entregas. Si hay hitos, **reemplazan** las líneas de anticipo y saldo (el `anticipo` se ignora) y el documento muestra la tabla "Plan de pagos" con el valor de cada uno. Sin hitos todo queda como antes.

```jsonc
"hitos": [
  { "clave": "inicio", "nombre": "Inicio", "pct": 30, "condicion": "Al iniciar la Fase 0", "fase": "Fase 0" },
  { "clave": "mvp", "nombre": "Entrega del MVP", "pct": 40, "condicion": "Al entregar en pruebas", "fase": "Fase 1" },
  { "clave": "vivo", "nombre": "Salida en vivo", "pct": 30, "condicion": "Al salir en vivo" }
]
```

- Todos con `pct` (deben sumar 100) o todos con `valor` en pesos (deben sumar el total). El último hito se queda con el redondeo.
- `fase` (opcional) liga el hito a una fase existente. `clave` (opcional) es el id para cobrarlo; sin ella sale del nombre (`"Entrega del MVP"` → `entrega-del-mvp`).
- Errores: `plan de pagos: los hitos suman 105 %, deben sumar 100 %`, `usa porcentaje en todos los hitos o valor en todos, no las dos cosas`, `la fase "Fase 9" no existe`.
- Para cobrar un hito: `cotizador cuenta <json> --parte mvp` (ver sección 8).

`cotizador esquema --completo` imprime un ejemplo con las tres cosas (un portal de pedidos B2B ficticio por fases).

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

Devuelve `numero`, `fecha`, `validaHasta`, `estado`, `cliente`, `items` (con `precioUnitario`, `cantidad`, `valor`, `ivaTasa` y `grupo`), `grupos`, `totales` (`subtotal`, `descuento`, `base`, `ivaModo`, `ivaTasa`, `iva`, `ivaDetalle`, `total`, `anticipoPct`, `anticipo`, `saldo` y, con opciones, `opcion`), `opciones` (cada una con `id`, `nombre`, `recomendada`, `items` y sus `totales`), `hitos` (`id`, `nombre`, `condicion`, `fase`, `pct`, `valor`), `errorHitos` (texto o `null`), `costosTerceros` (con `cop`/`copHasta` si están en USD y hay TRM) y `trm`. Todos los valores son números en pesos.

## 8. Cuenta de cobro

Cuando el cliente aprueba y el trabajo se entrega:

```bash
cotizador cuenta COTIZACION_00008.json --cliente grupo-logis --desde 07-09-2026 --hasta 15-10-2026 --marcar
```

- `--desde` / `--hasta`: período del trabajo (obligatorio en cuentas de una cotización).
- `--parte total|anticipo|saldo`: qué se cobra si la cotización tiene anticipo. Con plan de pagos, `--parte <hito>` cobra un hito por su clave o su nombre (`--parte mvp` o `--parte "Entrega del MVP"`); el concepto dice qué pago es y su porcentaje.
- `--concepto "…"`: inicio del párrafo "Por concepto de".
- `--valor 1500000`: valor escrito a mano (si no, sale del total, el anticipo o el saldo).
- `--marcar`: guarda los datos en el JSON y marca la cotización como `cobrada`.
- Sale `CUENTA-COBRO-COTIZACION-<n>.pdf` al lado del JSON.

**Cuenta de cobro suelta** (sin cotización): un JSON con `"tipo": "cuenta"`, número `COB-0001`, sin ítems, con `cliente` y `cobro` (`valor`, `concepto`, opcionalmente `desde`/`hasta`, `ciudad`, `nota`, `banco`). Para una lista bajo el concepto (domicilios, visitas…) usa `cobro.detalle`: `[{ "id": "1", "fecha": "06-10", "texto": "Calle 45 #12-30", "valor": 15000 }]`; sin `cobro.valor`, el valor es la suma del detalle. Con `"conPeriodo": false` el concepto va tal cual (sin "realizadas durante el período…"). Si no cabe en una hoja, el PDF sigue en otra hoja carta. Ahí el período es opcional y el valor es obligatorio (`--valor` o `cobro.valor`). Sale `CUENTA-DE-COBRO_<n>.pdf` con el título "CUENTA DE COBRO N.º <n>". Son las mismas que crea la app con Nueva → Cuenta de cobro (se pueden exportar e importar como JSON).

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
| "Cotiza el portal en tres opciones y por hitos" | `esquema --completo` como punto de partida, ajusta ítems, `opciones`, `hitos` y `costosTerceros`, `nueva --spec - --pdf` y muestra el resumen (totales por opción y valor de cada hito) |
| "Cóbrale el hito del MVP" | `resumen <json>` para ver las claves de los hitos y `cuenta <json> --parte mvp --desde … --hasta …` |
| "¿Qué cotizaciones tengo pendientes?" | `lista <carpeta>` y filtra `enviada` / `aprobada` |
| "Ponle un ícono de aire acondicionado" | `iconos --buscar aire` → `snowflake` |

Antes de crear algo, confirma con la persona los datos que falten (cliente, precios, si lleva IVA). No inventes precios.
