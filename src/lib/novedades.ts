// Historial de versiones que se muestra en el centro de ayuda.
// En cada publicación: subir "version" en package.json (arreglo → 1.0.1, función nueva → 1.1.0)
// y agregar la entrada arriba de todo, en lenguaje de quien usa la app.

export type Novedad = { version: string; fecha: string; tipo: 'nueva' | 'arreglo'; cambios: string[] };

export const NOVEDADES: Novedad[] = [
  {
    version: '1.5.0',
    fecha: '16-10-2026',
    tipo: 'nueva',
    cambios: [
      'En Bloque, Noche, Diagonal y Estudio cada ítem muestra su ícono en la primera columna, y el número pasa al título ("1. Diseño de logo").',
      'Si prefieres la tabla con números, apaga "Íconos en la lista de ítems" en Diseño.',
    ],
  },
  {
    version: '1.4.0',
    fecha: '16-10-2026',
    tipo: 'nueva',
    cambios: [
      'El botón PDF descarga el archivo al instante también en el computador, sin la ventana de imprimir.',
      'Ese PDF trae el texto seleccionable: se copia, se busca, y el correo y la web se pueden tocar. También el que se envía por WhatsApp.',
      'El PDF vectorial (para imprimir con letras nítidas) sigue en Más.',
    ],
  },
  {
    version: '1.3.1',
    fecha: '15-10-2026',
    tipo: 'arreglo',
    cambios: [
      'La paleta Chigüiro ahora es gris carbón con amarillo (#2F2E33 y #F2D22B), igual que la marca. También son los colores sugeridos de la Clásica y los de una cotización nueva.',
    ],
  },
  {
    version: '1.3.0',
    fecha: '15-10-2026',
    tipo: 'nueva',
    cambios: [
      'La firma de aceptación del cliente (Diagonal y Estudio) ahora es opcional y viene apagada. Se activa en Diseño.',
      'En Mi marca eliges cómo se ve tu logo: original, con fondo blanco, todo blanco o todo negro.',
      'Las paletas que guardas o quitas se animan como burbujas, y al quitar una puedes deshacer.',
      'Los botones de texto (quitar logo, quitar firma, intercambiar colores…) se leen mejor.',
    ],
  },
  {
    version: '1.2.2',
    fecha: '15-10-2026',
    tipo: 'arreglo',
    cambios: [
      'Todas las paletas rápidas y los colores sugeridos tienen buen contraste: Chigüiro, Bosque y Grafito se ajustaron.',
      'El botón para guardar tus colores se ve mejor y te dice si esa paleta ya está guardada.',
    ],
  },
  {
    version: '1.2.1',
    fecha: '15-10-2026',
    tipo: 'arreglo',
    cambios: [
      'La vista previa ya no deja espacio vacío debajo del documento al pasar a un diseño más corto o quitar ítems.',
    ],
  },
  {
    version: '1.2.0',
    fecha: '15-10-2026',
    tipo: 'nueva',
    cambios: [
      'Guías nuevas: "Qué debe llevar una cuenta de cobro" y "Cómo hacer una cotización con IVA", con ejemplos y preguntas frecuentes.',
      'Desde las guías, un botón abre la app directo en la pestaña que necesitas.',
    ],
  },
  {
    version: '1.1.1',
    fecha: '15-10-2026',
    tipo: 'arreglo',
    cambios: [
      'El gesto atrás ya no cierra la app: primero cierra lo que esté abierto, luego vuelve de la vista previa o a la pestaña anterior, y en la pantalla inicial pide deslizar otra vez para salir.',
      'La descripción para Google ahora dice gratis, ilimitado, sin anuncios ni registro.',
    ],
  },
  {
    version: '1.1.0',
    fecha: '15-10-2026',
    tipo: 'nueva',
    cambios: [
      'Al compartir el enlace del Cotizador sale una vista previa nueva (sin la franja blanca) y el texto habla de cotizaciones y cuentas de cobro.',
      'Mejor contraste en los colores sugeridos: Diagonal, Cielo y Coral se leen mejor.',
      'Las ventanas de inicio, iPhone y Drive tienen el mismo orden: acciones a lo ancho y enlaces al pie.',
    ],
  },
  {
    version: '1.0.3',
    fecha: '15-10-2026',
    tipo: 'arreglo',
    cambios: [
      'En el celular, el botón PDF descarga el archivo directo (antes abría la impresora). El PDF con texto seleccionable sigue en Más.',
      'La ventana de Google Drive quedó más ordenada: cerrar arriba, acciones a lo ancho, privacidad y desconectar al pie.',
    ],
  },
  {
    version: '1.0.2',
    fecha: '15-10-2026',
    tipo: 'arreglo',
    cambios: [
      'Unidad ya no acepta números (un "-1" ahí salía en el catálogo); si escribes uno, se marca en rojo y te dice que la cantidad va en Cantidad.',
      'Descuento, anticipo, tasa de IVA y vigencia no aceptan negativos; los porcentajes llegan hasta 100.',
      'En la app instalada, el teclado ya no deja la pantalla corrida (se escondía la barra de arriba o la de abajo).',
      'Con el teclado abierto se esconden las barras de abajo para dejar espacio a lo que escribes.',
    ],
  },
  {
    version: '1.0.1',
    fecha: '15-10-2026',
    tipo: 'arreglo',
    cambios: [
      'El botón de arriba ahora dice "Ayuda" también en el celular (antes era solo un ícono).',
      'El nombre de la cotización arriba se corta con "…" para que todo quepa en pantallas pequeñas.',
    ],
  },
  {
    version: '1.0.0',
    fecha: '15-10-2026',
    tipo: 'nueva',
    cambios: [
      'Primera versión numerada: aquí ves qué versión tienes cargada y qué cambió en cada actualización.',
      'Confirmaciones propias con animación (eliminar, empezar una nueva, restaurar y Google Drive).',
      '"Enviar PDF por WhatsApp": en el celular comparte el PDF; en el PC abre el chat y lo descarga.',
      'Respaldo en Google Drive con indicador de estado en la barra superior.',
      'App instalable que avisa cuando hay una versión nueva.',
      'Guardadas se actualiza si guardas desde otra ventana o desde la app instalada.',
      'Arreglos: un ítem compacto con título largo ensanchaba la app en el celular; la cuenta de cobro ya no inventa la ciudad.',
    ],
  },
];
