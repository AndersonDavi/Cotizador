// Historial de versiones que se muestra en el centro de ayuda.
// En cada publicación: subir "version" en package.json (arreglo → 1.0.1, función nueva → 1.1.0)
// y agregar la entrada arriba de todo, en lenguaje de quien usa la app.

export type Novedad = { version: string; fecha: string; tipo: 'nueva' | 'arreglo'; cambios: string[] };

export const NOVEDADES: Novedad[] = [
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
