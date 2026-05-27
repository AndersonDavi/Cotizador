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

    // Expande secciones colapsadas automáticamente
    onHighlightStarted: (el) => {
      if (!el) return;
      const section = el.closest?.('.section');
      if (section?.classList.contains('collapsed')) {
        section.classList.remove('collapsed');
      }
    },

    steps: [
      // ── 1. Intro ─────────────────────────────────────────────────────────
      {
        popover: {
          title: '👋 ¡Bienvenido al Cotizador!',
          description:
            'Esta guía te muestra cada sección de la herramienta para que puedas generar tu primera propuesta profesional en minutos.',
          side: 'over',
          align: 'center',
        },
      },

      // ── 2. Datos de la cotización ────────────────────────────────────────
      {
        element: '#section-cotizacion',
        popover: {
          title: '📋 Datos de la cotización',
          description:
            'Aquí defines el <strong>número de cotización</strong> (para llevar un registro), la <strong>fecha</strong>, el <strong>alcance</strong> (descripción del proyecto) y el <strong>costo total en COP</strong>.<br/><br/>Activa <em>"Auto"</em> para que el total se calcule solo sumando todos los ítems.',
          side: 'right',
          align: 'start',
        },
      },

      // ── 3. Plantilla y colores ───────────────────────────────────────────
      {
        element: '#section-colores',
        popover: {
          title: '🎨 Plantilla y colores',
          description:
            '<strong>Fondo 1</strong> y <strong>Fondo 2</strong> crean el degradado del encabezado. <strong>Acento</strong> es el color destacado (números, separadores) y <strong>Texto</strong> cambia el color del contenido.<br/><br/>Puedes subir el <strong>logo</strong> de tu empresa o marca aquí abajo.',
          side: 'right',
          align: 'start',
        },
      },

      // ── 4. Logo ───────────────────────────────────────────────────────────
      {
        element: '#logoArea',
        popover: {
          title: '🏷 Logo',
          description:
            'Haz clic para subir el logo de tu empresa. Aparece en la esquina superior del encabezado de la propuesta.<br/><br/>Funciona mejor con imágenes <strong>PNG con fondo transparente</strong>.',
          side: 'bottom',
          align: 'start',
        },
      },

      // ── 5. Toolbar de ítems ───────────────────────────────────────────────
      {
        element: '#items-toolbar',
        popover: {
          title: '⚙ Herramientas de ítems',
          description:
            'Ordena los ítems por <strong>precio, título o tipo de ícono</strong> (clic en el mismo botón invierte el orden).<br/><br/>El botón <em>"Colapsar todo"</em> compacta la lista para ver un resumen rápido cuando tienes muchos ítems.',
          side: 'bottom',
          align: 'start',
        },
      },

      // ── 6. Agregar ítem ───────────────────────────────────────────────────
      {
        element: '#addItem',
        popover: {
          title: '📦 Agregar servicios',
          description:
            'Haz clic aquí para agregar cada servicio o entregable. Cada ítem tiene:<br/><ul style="margin:6px 0 0 16px;padding:0"><li><strong>Ícono</strong> — categoría visual</li><li><strong>Título</strong> — nombre del servicio</li><li><strong>Descripción</strong> — detalle de lo que incluye</li><li><strong>Valor COP</strong> — precio individual</li></ul>',
          side: 'top',
          align: 'start',
        },
      },

      // ── 7. Entrega y términos ─────────────────────────────────────────────
      {
        element: '#section-terminos',
        popover: {
          title: '📅 Entrega y términos',
          description:
            'Define el <strong>tiempo de entrega</strong> del proyecto (se muestra en la sección inferior de la propuesta).<br/><br/>Los <strong>términos y condiciones</strong> van una línea por ítem — aparecen en el pie de página de la propuesta.',
          side: 'right',
          align: 'start',
        },
      },

      // ── 8. Representante legal ────────────────────────────────────────────
      {
        element: '#section-firma',
        popover: {
          title: '✍ Representante legal',
          description:
            'Agrega tu <strong>nombre completo</strong> y <strong>número de cédula</strong>. También puedes subir una imagen de tu <strong>firma digital</strong> (PNG o JPG).<br/><br/>Toda esta información aparece en el pie de la propuesta para darle validez formal.',
          side: 'right',
          align: 'start',
        },
      },

      // ── 9. Contacto ───────────────────────────────────────────────────────
      {
        element: '#section-contacto',
        popover: {
          title: '📞 Contacto',
          description:
            'Agrega tu <strong>web, email, celular, ciudad y país</strong>. Esta información aparece al final de la propuesta para que el cliente sepa cómo contactarte.',
          side: 'right',
          align: 'start',
        },
      },

      // ── 10. Guardadas ─────────────────────────────────────────────────────
      {
        element: '#section-guardadas',
        popover: {
          title: '🗂 Cotizaciones guardadas',
          description:
            'Aquí se listan todas las cotizaciones que hayas guardado. Puedes <strong>abrirlas, editarlas o eliminarlas</strong>.<br/><br/>Todo se guarda localmente en tu navegador — no necesitas cuenta ni internet para recuperarlas.',
          side: 'right',
          align: 'start',
        },
      },

      // ── 11. Guardar ───────────────────────────────────────────────────────
      {
        element: '#saveBtn',
        popover: {
          title: '💾 Guardar',
          description:
            'Guarda la cotización actual en el historial. La propuesta en edición también se <strong>guarda automáticamente</strong> mientras escribes (se restaura al recargar la página).',
          side: 'top',
          align: 'start',
        },
      },

      // ── 12. Exportar PNG / PDF ────────────────────────────────────────────
      {
        element: '#actions-main',
        popover: {
          title: '📤 Exportar la propuesta',
          description:
            '<strong>PNG</strong> — imagen de alta resolución, ideal para compartir por WhatsApp o redes sociales.<br/><br/><strong>PDF</strong> — documento listo para enviar por correo al cliente.',
          side: 'top',
          align: 'center',
        },
      },

      // ── 13. Opciones Dev ─────────────────────────────────────────────────
      {
        element: '#advToggleBtn',
        popover: {
          title: '⚙ Opciones avanzadas',
          description:
            '<strong>⬇ MD</strong> — exporta la propuesta en Markdown (texto plano compatible con Notion, Obsidian, etc.).<br/><br/><strong>⬇ JSON / ⬆ JSON</strong> — respalda o transfiere cotizaciones entre dispositivos o navegadores.',
          side: 'top',
          align: 'center',
        },
      },
    ],
  });

  d.drive();
}
