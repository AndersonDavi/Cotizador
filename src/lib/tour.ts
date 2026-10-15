import { driver, type DriveStep } from 'driver.js';

/** Guía paso a paso. `showTab` abre la pestaña de cada paso antes de resaltarlo. */
export function startTour(showTab: (tab: string) => void): void {
  const step = (tab: string | null, element: string, title: string, description: string, side: 'right' | 'left' | 'top' | 'bottom' = 'right'): DriveStep => ({
    element,
    onHighlightStarted: () => { if (tab) showTab(tab); },
    popover: { title, description, side, align: 'start' },
  });

  const d = driver({
    showProgress: true,
    animate: true,
    overlayOpacity: 0.65,
    stagePadding: 6,
    stageRadius: 10,
    popoverClass: 'cotizador-tour',
    nextBtnText: 'Siguiente →',
    prevBtnText: '← Anterior',
    doneBtnText: '¡Listo!',
    progressText: '{{current}} de {{total}}',
    steps: [
      { popover: { title: 'Bienvenido al Cotizador', description: 'En un minuto te muestro cómo armar una propuesta con tu marca y descargarla en PDF.' } },
      step('marca', '#tab-marca', 'Mi marca', 'Sube tu logo, tu firma y tus datos de contacto una sola vez: se usan en todas tus cotizaciones.', 'bottom'),
      step('marca', '#logoArea', 'Tu logo', 'Haz clic o arrastra una imagen. Se ajusta sola al diseño elegido.'),
      step('marca', '#firmaArea', 'Tu firma', 'Una foto de tu firma sobre papel blanco sirve: el fondo se recorta automáticamente.'),
      step('diseno', '#designGallery', 'Elige un diseño', 'Ocho plantillas listas. Cambia entre ellas cuando quieras: tus datos no se pierden.'),
      step('diseno', '#paletteRow', 'Tus colores', 'Cada plantilla se pinta solo con un color principal y uno secundario. Usa una paleta o pon los de tu marca.', 'top'),
      step('cotizacion', '#clienteNombre', 'Datos de la cotización', 'Número, fecha, cliente y alcance. El estado te ayuda a saber qué está enviado, aprobado o cobrado.'),
      step('items', '#addItem', 'Ítems', 'Agrega cada servicio con su ícono, descripción y valor. El total se suma solo.', 'top'),
      step(null, '.preview', 'Vista previa en vivo', 'Lo que ves aquí es exactamente lo que se descarga.', 'left'),
      step(null, '#pdfBtn', 'Descarga el PDF', 'En el diálogo elige “Guardar como PDF”. El texto queda seleccionable y los enlaces funcionan.', 'top'),
      step('cobro', '#cuentaBtn', 'Cuenta de cobro', 'Cuando el cliente aprueba, genera aquí la cuenta de cobro con el mismo total.', 'top'),
    ],
  });
  d.drive();
}
