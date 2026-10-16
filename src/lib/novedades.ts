// Historial de versiones que se muestra en el centro de ayuda.
// En cada publicación: subir "version" en package.json (arreglo → 1.0.1, función nueva → 1.1.0)
// y agregar la entrada arriba de todo, en lenguaje de quien usa la app.

export type Novedad = { version: string; fecha: string; tipo: 'nueva' | 'arreglo'; cambios: string[] };

export const NOVEDADES: Novedad[] = [
  {
    version: '1.9.1',
    fecha: '16-10-2026',
    tipo: 'arreglo',
    cambios: [
      'La cuenta de cobro se descarga directo en PDF, sin pasar por la impresora. Si la quieres imprimir, en la pestaña Cobro está "Abrir para imprimir".',
      'La cuenta de cobro ya no muestra Dirección, Teléfono o Cédula vacíos.',
    ],
  },
  {
    version: '1.9.0',
    fecha: '16-10-2026',
    tipo: 'nueva',
    cambios: [
      'Perfiles de marca: en Mi marca puedes tener varias marcas (por ejemplo, dos empresas) y elegir cuál usa cada cotización. Lo que cambias se guarda en el perfil.',
      'Cada cotización guarda una copia de su marca: abrir una vieja no cambia tu perfil, y si tiene datos distintos te avisa y puedes pasarla a tu perfil actual con un toque.',
      'El espacio para la firma de aceptación del cliente ahora sale en todas las plantillas.',
      'Los estilos del logo muestran en su punto el color que van a aplicar.',
      'Corporativa centra los íconos de los ítems y Mosaico centra la firma cuando va sola.',
      'En Windows el botón Instalar aparece de forma más confiable (Chrome y Edge).',
    ],
  },
  {
    version: '1.8.1',
    fecha: '16-10-2026',
    tipo: 'arreglo',
    cambios: [
      'El ícono de la pestaña ya no tiene fondo y se ve más grande; tiene un contorno para que se distinga en pestañas claras y oscuras.',
    ],
  },
  {
    version: '1.8.0',
    fecha: '16-10-2026',
    tipo: 'nueva',
    cambios: [
      'Tres plantillas nuevas: Panel (encabezado en bloque y filas redondeadas), Corporativa (sobria, con tabla a rayas) y Mosaico (ítems en baldosas).',
      '"Información de pago" ahora solo muestra cómo pagarte: el tiempo de entrega va aparte (Estudio) y la cuenta lleva su etiqueta (Editorial).',
      'En Diagonal la franja de los íconos muestra la división entre ítems y llega hasta el total.',
    ],
  },
  {
    version: '1.7.0',
    fecha: '16-10-2026',
    tipo: 'nueva',
    cambios: [
      'Respaldo automático en Drive: cuando cambias algo (cotización, marca, catálogo, paletas) sube solo, como máximo cada 2 minutos y al salir de la app.',
      'Varios equipos sin pisarse: antes de subir se combina con lo que subió el otro equipo. Gana lo guardado más recientemente y lo que eliminas no vuelve.',
      'Al traer de Drive en otro equipo puedes seguir con la cotización que dejaste abierta, y tu marca queda en su versión más reciente.',
      'El indicador muestra "Reanudar" cuando vence el permiso de Google (dura 1 hora); al tocarlo sigue respaldando.',
      'El precio de cada ítem queda centrado a la altura del ícono en Bloque, Noche, Diagonal y Estudio.',
    ],
  },
  {
    version: '1.6.2',
    fecha: '16-10-2026',
    tipo: 'arreglo',
    cambios: [
      'Editorial recupera sus márgenes y su tipografía (en la 1.5.1 quedó con el texto pegado a los bordes).',
    ],
  },
  {
    version: '1.6.1',
    fecha: '16-10-2026',
    tipo: 'arreglo',
    cambios: [
      'En el computador la vista previa arranca en "Página" para ver el documento completo; en el celular sigue en "Ancho". Se recuerda la que elijas.',
    ],
  },
  {
    version: '1.6.0',
    fecha: '16-10-2026',
    tipo: 'nueva',
    cambios: [
      'Tu logo puede tomar el color principal o el secundario de la cotización (para logos de un solo color con fondo transparente).',
      'El logo y la firma se animan al cargarlos y al quitarlos.',
      'Los íconos de los ítems quedan centrados en la altura de cada ítem.',
      'Con la lista de ítems colapsada, la barra del total y "Agregar ítem" se queda abajo.',
      '"Quitar logo" y "Quitar firma" tienen más espacio.',
    ],
  },
  {
    version: '1.5.2',
    fecha: '16-10-2026',
    tipo: 'arreglo',
    cambios: [
      'Redonda ya no deja espacio en blanco sobre la barra final: el contacto se apoya en ella.',
      'La vista previa ya no muestra una línea blanca en el borde derecho (se notaba en Diagonal, Estudio y Bloque).',
      'Coral ahora es negro de principal y naranja de secundario (también en los colores sugeridos de Redonda).',
    ],
  },
  {
    version: '1.5.1',
    fecha: '16-10-2026',
    tipo: 'arreglo',
    cambios: [
      'Editorial se ve bien con cualquier color: el texto queda en negro y gris, y tu color solo en las barras, las líneas y el total.',
    ],
  },
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
      'La firma de aceptación del cliente (Diagonal y Editorial) ahora es opcional y viene apagada. Se activa en Diseño.',
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
