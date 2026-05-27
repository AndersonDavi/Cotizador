import { driver } from 'driver.js';

export function startTour(): void {
  const d = driver({
    showProgress: true,
    animate: true,
    overlayOpacity: 0.65,
    stagePadding: 8,
    stageRadius: 8,
    popoverClass: 'cotizador-tour',
    nextBtnText: 'Siguiente →',
    prevBtnText: '← Anterior',
    doneBtnText: '¡Listo! ✓',
    progressText: '{{current}} de {{total}}',

    // Expande secciones colapsadas antes de resaltarlas
    onHighlightStarted: (el) => {
      if (!el) return;
      const section = el.closest?.('.section');
      if (section?.classList.contains('collapsed')) {
        section.classList.remove('collapsed');
      }
    },

    steps: [
      {
        popover: {
          title: '👋 ¡Bienvenido al Cotizador!',
          description:
            'En unos pasos te mostramos las partes clave para generar tu primera propuesta profesional.',
          side: 'over',
          align: 'center',
        },
      },
      {
        element: '#addItem',
        popover: {
          title: '📦 Servicios y entregables',
          description:
            'Haz clic aquí para agregar cada servicio de tu propuesta. Cada ítem tiene <strong>ícono, título, descripción y valor en COP</strong>.',
          side: 'top',
          align: 'start',
        },
      },
      {
        element: '#section-colores',
        popover: {
          title: '🎨 Colores del encabezado',
          description:
            '<strong>Fondo 1</strong> y <strong>Fondo 2</strong> crean el degradado del encabezado. <strong>Acento</strong> define el color destacado y <strong>Texto</strong> el color del contenido.',
          side: 'right',
          align: 'start',
        },
      },
      {
        element: '#logoArea',
        popover: {
          title: '🏷 Logo de tu empresa',
          description:
            'Haz clic aquí para subir el logo. Aparecerá en la esquina superior del encabezado y en el PDF generado.',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '#section-firma',
        popover: {
          title: '✍ Representante legal',
          description:
            'Agrega tu <strong>nombre, número de cédula y firma digital</strong> (imagen PNG o JPG). Aparecen al pie de la propuesta para darle validez formal.',
          side: 'right',
          align: 'start',
        },
      },
      {
        element: '#pdfBtn',
        popover: {
          title: '📄 Exportar la propuesta',
          description:
            'Cuando esté lista, expórtala como <strong>PDF de alta calidad</strong> (para enviar por correo) o como imagen <strong>PNG</strong> (para compartir en WhatsApp o redes).',
          side: 'top',
          align: 'center',
        },
      },
      {
        element: '#advToggleBtn',
        popover: {
          title: '⚙ Opciones avanzadas',
          description:
            'Acá puedes <strong>guardar y recuperar</strong> cotizaciones entre dispositivos usando JSON, o exportar en <strong>Markdown</strong> para integraciones con otras herramientas.',
          side: 'top',
          align: 'center',
        },
      },
    ],
  });

  d.drive();
}
