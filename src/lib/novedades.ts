// Historial de versiones que se muestra en el centro de ayuda.
// En cada publicación: subir "version" en package.json (arreglo → 1.0.1, función nueva → 1.1.0)
// y agregar la entrada arriba de todo, en lenguaje de quien usa la app.

export type Novedad = { version: string; fecha: string; tipo: 'nueva' | 'arreglo'; cambios: string[] };

export const NOVEDADES: Novedad[] = [
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
