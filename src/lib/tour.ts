import { driver, type DriveStep, type Side } from 'driver.js';

export type TourId = 'completa' | 'cotizacion' | 'items' | 'diseno' | 'marca' | 'cobro' | 'guardadas' | 'exportar';

export type TourCtx = {
  showTab: (tab: string) => void;
  setView: (view: 'edit' | 'preview') => void;
};

export const TOURS: { id: TourId; nombre: string; descripcion: string }[] = [
  { id: 'completa',   nombre: 'Recorrido completo',  descripcion: 'De cero a PDF en 2 minutos' },
  { id: 'marca',      nombre: 'Tu marca',            descripcion: 'Logo, firma, contacto y banco' },
  { id: 'diseno',     nombre: 'Diseño y colores',    descripcion: 'Plantillas y paletas' },
  { id: 'cotizacion', nombre: 'Datos de la cotización', descripcion: 'Cliente, estado, total y términos' },
  { id: 'items',      nombre: 'Ítems',               descripcion: 'Servicios, íconos y valores' },
  { id: 'exportar',   nombre: 'Descargar y guardar', descripcion: 'PDF, PNG, JSON y respaldo' },
  { id: 'cobro',      nombre: 'Cuenta de cobro',     descripcion: 'Cobra lo que ya aprobaron' },
  { id: 'guardadas',  nombre: 'Mis cotizaciones',    descripcion: 'Buscar, duplicar y estados' },
];

const isMobile = () => window.matchMedia('(max-width: 860px)').matches;

const tip = (t: string) => `<span class="tour-tip">${t}</span>`;

function stepsFor(id: TourId, ctx: TourCtx): DriveStep[] {
  const s = (tab: string | null, element: string, title: string, description: string, side: Side = 'right'): DriveStep => ({
    element,
    onHighlightStarted: () => {
      ctx.setView('edit');
      if (tab) ctx.showTab(tab);
      document.querySelector(element)?.scrollIntoView({ block: 'center', behavior: 'instant' as ScrollBehavior });
    },
    popover: { title, description, side: isMobile() ? 'bottom' : side, align: 'start' },
  });

  const preview: DriveStep = isMobile()
    ? s(null, '.mobile-switch', 'Vista previa', 'Toca <b>Vista previa</b> para ver el documento tal cual se va a descargar. Vuelve con <b>Editar</b>.', 'top')
    : { element: '.preview', onHighlightStarted: () => ctx.setView('preview'), popover: { title: 'Vista previa en vivo', description: `Cada cambio aparece aquí al instante. Lo que ves es exactamente lo que se descarga.${tip('Usa “Ajustar” o “100%” para acercar el documento.')}`, side: 'left', align: 'start' } };

  const T: Record<TourId, DriveStep[]> = {
    marca: [
      s('marca', '#tab-marca', 'Tu marca', 'Estos datos se guardan en tu navegador y aparecen en <b>todas</b> tus cotizaciones. Los llenas una sola vez.', 'bottom'),
      s('marca', '#logoArea', 'Sube tu logo', `Haz clic o arrastra la imagen aquí. PNG, JPG o SVG.${tip('Las imágenes grandes se reducen solas para no llenar el navegador.')}`),
      s('marca', '#empresa', 'Nombre de tu marca', 'Aparece junto al logo en las plantillas. Si lo dejas vacío se usa tu nombre.'),
      s('marca', '#firmaArea', 'Tu firma', `Una foto de tu firma sobre papel blanco sirve: el fondo se recorta y se vuelve transparente.${tip('En plantillas oscuras la firma se aclara sola.')}`),
      s('marca', '#cCel', 'Contacto', 'Celular, email, web y ciudad salen al pie del documento. Email y web quedan como enlaces en el PDF.'),
      s('marca', '#banco', 'Datos para cobrar', 'Tu cuenta bancaria, nombre completo y dirección se usan en la <b>cuenta de cobro</b>.'),
    ],
    diseno: [
      s('diseno', '#designGallery', 'Elige una plantilla', 'Ocho diseños listos. Cambia cuando quieras: tus datos no se pierden y la vista previa se actualiza al instante.'),
      s('diseno', '.color-field', 'Dos colores, todo el diseño', `Cada plantilla se pinta solo con un color <b>principal</b> y uno <b>secundario</b>. Los textos se vuelven blancos o negros solos para que siempre se lean.${tip('Puedes pegar el código hexadecimal de tu marca, por ejemplo #E8623A.')}`),
      s('diseno', '#paletteRow', 'Paletas rápidas', 'Combinaciones probadas para empezar. Un clic y listo.', 'top'),
      s('diseno', '#suggestColors', 'Colores sugeridos', 'Vuelve a los colores con los que se presenta el diseño elegido. “Intercambiar” invierte principal y secundario.', 'top'),
    ],
    cotizacion: [
      s('cotizacion', '#numero', 'Número y fecha', 'El número sube solo con cada cotización nueva. La fecha se elige con el calendario o se escribe como dd-mm-aaaa.'),
      s('cotizacion', '#estadoGroup', 'Estado', 'Marca en qué va: <b>borrador</b>, <b>enviada</b>, <b>aprobada</b>, <b>cobrada</b>, <b>pagada</b> o <b>descartada</b>. Te sirve para filtrar en “Guardadas”; no sale en el documento.'),
      s('cotizacion', '#clienteNombre', 'Cliente', 'Nombre y NIT de quien recibe la propuesta. También se usan en la cuenta de cobro.'),
      s('cotizacion', '#alcance', 'Alcance', 'Una frase que resume el trabajo, por ejemplo “Sitio web y tienda en línea”.'),
      s('cotizacion', '#totalBig', 'Total', 'Por defecto suma los ítems. Apaga “Sumar ítems” si quieres poner un valor global distinto.'),
      s('cotizacion', '#terminosList', 'Condiciones', 'Tiempo de entrega y términos: cada término en su propia línea (forma de pago, vigencia de la oferta…). Agrega o quita los que necesites.', 'top'),
    ],
    items: [
      s('items', '#items .item-card', 'Cada servicio es un ítem', 'Elige un ícono, escribe título, descripción y valor. El total se recalcula solo.'),
      s('items', '.items-toolbar', 'Ordenar y colapsar', 'Ordena por precio, título o tipo. “Colapsar todo” deja la lista compacta para moverte rápido.', 'bottom'),
      s('items', '#items .item-head', 'Mover y borrar', 'Usa ▲ ▼ para cambiar el orden en el documento y ✕ para eliminar.', 'bottom'),
      s('items', '#addItem', 'Agregar ítem', 'Agrega todos los que necesites: el documento crece hacia abajo en una sola página.', 'top'),
    ],
    exportar: [
      preview,
      s(null, '#saveBtn', 'Guardar', `Guarda la cotización en este navegador para abrirla después desde “Guardadas”.${tip('Atajo: Ctrl + S')}`, 'top'),
      s(null, '#pdfBtn', 'Descargar PDF', `Se abre el diálogo de impresión: elige <b>Guardar como PDF</b>. Sale en una sola página, con texto seleccionable y enlaces activos.${tip('Si ves márgenes o encabezados, desmárcalos en “Más opciones”.')}`, 'top'),
      s(null, '#moreBtn', 'Más opciones', 'PNG para WhatsApp o redes, cuenta de cobro, y exportar o importar JSON para tener respaldo o pasar tus cotizaciones a otro equipo.', 'top'),
    ],
    cobro: [
      s('cobro', '#cobroDesde', 'Período del trabajo', 'Desde y hasta cuándo trabajaste. Se escribe solo en el texto: “realizadas durante el período comprendido entre…”.'),
      s('cobro', '#cobroConcepto', 'Por concepto de', 'Describe el trabajo. Si lo dejas vacío se usa el alcance de la cotización.'),
      s('cobro', '#cobroResumen', 'Revisa antes de generar', 'Aquí ves cómo queda. Si falta algo (NIT, banco…), aparece un aviso con lo que hay que completar.', 'top'),
      s('cobro', '#cuentaBtn', 'Generar la cuenta', 'Se descarga en tamaño carta, con el valor en letras y tu firma. Puede marcar la cotización como <b>cobrada</b>.', 'top'),
    ],
    guardadas: [
      s('guardadas', '#savedSearch', 'Busca', 'Por número, cliente o alcance.', 'bottom'),
      s('guardadas', '#savedFilters', 'Filtra por estado', 'Mira de un vistazo qué falta cobrar o qué está pendiente de aprobar.', 'bottom'),
      s('guardadas', '#savedList', 'Abrir, duplicar y borrar', `“⧉” crea una copia con número nuevo: ideal para cotizaciones parecidas.${tip('Todo vive en este navegador. Exporta JSON de vez en cuando como respaldo.')}`, 'top'),
    ],
    completa: [],
  };

  T.completa = [
    { popover: { title: 'Bienvenido al Cotizador', description: 'Te muestro cómo armar una propuesta con tu marca y descargarla en PDF. Puedes salir en cualquier momento con <b>Esc</b>.' } },
    T.marca[1], T.marca[3],
    T.diseno[0], T.diseno[1],
    T.cotizacion[2], T.cotizacion[1],
    T.items[0],
    ...T.exportar.slice(0, 3),
    T.cobro[3],
    { popover: { title: 'Listo', description: 'Si necesitas repasar algo, abre <b>Ayuda</b> arriba a la derecha: ahí están el video y las guías por sección.' } },
  ];
  return T[id];
}

export function startTour(id: TourId, ctx: TourCtx): void {
  const steps = stepsFor(id, ctx).filter((st) => !st.element || document.querySelector(st.element as string));
  const d = driver({
    showProgress: true,
    animate: true,
    smoothScroll: true,
    allowClose: true,
    overlayOpacity: 0.7,
    stagePadding: 6,
    stageRadius: 12,
    popoverClass: 'cotizador-tour',
    nextBtnText: 'Siguiente',
    prevBtnText: 'Atrás',
    doneBtnText: 'Terminar',
    progressText: '{{current}} de {{total}}',
    onPopoverRender: (popover, { state }) => {
      const total = steps.length;
      const cur = (state.activeIndex ?? 0) + 1;
      const bar = document.createElement('div');
      bar.className = 'tour-bar';
      bar.innerHTML = `<i style="width:${(cur / total) * 100}%"></i>`;
      popover.wrapper.prepend(bar);
    },
    onDestroyed: () => ctx.setView('edit'),
    steps,
  });
  d.drive();
}
