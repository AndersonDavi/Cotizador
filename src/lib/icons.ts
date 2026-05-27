// ── Built-in icons ───────────────────────────────────────────────────────────
// Paths de Lucide Icons (https://lucide.dev) — viewBox 0 0 24 24, stroke-based.
// El color real se inyecta en buildIconDataUrl(); así funcionan en canvas sin CORS.

const SVG_PATHS: Record<string, string> = {
  search:   '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
  database: '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>',
  bug:      '<path d="M8 2l1.5 1.5"/><path d="M14.5 3.5L16 2"/><path d="M9 9h6"/><path d="M9 12h6"/><ellipse cx="12" cy="14" rx="4" ry="5"/><path d="M3 9l3 1"/><path d="M18 10l3-1"/><path d="M4.5 15.5L8 14"/><path d="M16 14l3.5 1.5"/><path d="M5 20l3-2"/><path d="M16 18l3 2"/>',
  chart:    '<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>',
  chat:     '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
  check:    '<polyline points="20 6 9 17 4 12"/>',
  clock:    '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
  cloud:    '<path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/>',
  code:     '<polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>',
  gear:     '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
  dollar:   '<line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>',
  bolt:     '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>',
  lock:     '<rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  mobile:   '<rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12" y2="18"/>',
  user:     '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  // Diseño
  palette:  '<circle cx="13.5" cy="6.5" r=".5"/><circle cx="17.5" cy="10.5" r=".5"/><circle cx="8.5" cy="7.5" r=".5"/><circle cx="6.5" cy="12.5" r=".5"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/>',
  pentool:  '<path d="m12 19 7-7 3 3-7 7-3-3z"/><path d="m18 13-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><path d="m2 2 7.586 7.586"/><circle cx="11" cy="11" r="2"/>',
  image:    '<rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>',
  layout:   '<rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/>',
  monitor:  '<rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>',
  share:    '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>',
  film:     '<rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"/><line x1="7" y1="2" x2="7" y2="22"/><line x1="17" y1="2" x2="17" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="2" y1="7" x2="7" y2="7"/><line x1="2" y1="17" x2="7" y2="17"/><line x1="17" y1="7" x2="22" y2="7"/><line x1="17" y1="17" x2="22" y2="17"/>',
  type:     '<polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/>',
};

// Etiquetas ordenadas alfabéticamente (mismo orden que SVG_PATHS arriba)
const BUILTIN_LABELS: Record<string, string> = {
  search:   'Análisis',
  database: 'Base de datos',
  bug:      'Bug / Fix',
  chart:    'Datos',
  check:    'Entrega',
  bolt:     'Optimización',
  cloud:    'Infraestructura',
  mobile:   'Mobile',
  chat:     'Soporte',
  lock:     'Seguridad',
  clock:    'Tiempo',
  user:     'Usuario',
  code:     'Código',
  gear:     'Configuración',
  dollar:   'Costo',
  // Diseño
  palette:  'Diseño gráfico',
  pentool:  'Ilustración',
  image:    'Post / Redes',
  layout:   'Landing page',
  monitor:  'Web / UI',
  share:    'Redes sociales',
  film:     'Video / Motion',
  type:     'Tipografía',
};

// ── Tipos ────────────────────────────────────────────────────────────────────

export type IconKey = keyof typeof SVG_PATHS;

/** Todas las claves built-in ordenadas alfabéticamente por su label. */
export function getAllIconKeys(): IconKey[] {
  return (Object.keys(SVG_PATHS) as IconKey[]).sort((a, b) =>
    (BUILTIN_LABELS[a] ?? a).localeCompare(BUILTIN_LABELS[b] ?? b, 'es', { sensitivity: 'base' })
  );
}

/** Etiqueta legible para una clave. */
export function getIconLabel(key: string): string {
  return BUILTIN_LABELS[key] ?? key;
}

// ── Render helpers ───────────────────────────────────────────────────────────

export function buildIconSvg(key: string, color: string, strokeWidth = 2): string {
  const inner = SVG_PATHS[key as IconKey] ?? SVG_PATHS.code;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;
}

export function buildIconDataUrl(key: string, color: string, strokeWidth = 2): string {
  const svg = buildIconSvg(key, color, strokeWidth);
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

// Cache de Image() para no recargar el mismo SVG en cada render.
const imageCache = new Map<string, HTMLImageElement>();

export function loadIconImage(key: string, color: string, strokeWidth = 2): Promise<HTMLImageElement> {
  const cacheKey = `${key}|${color}|${strokeWidth}`;
  const cached = imageCache.get(cacheKey);
  if (cached && cached.complete) return Promise.resolve(cached);

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => { imageCache.set(cacheKey, img); resolve(img); };
    img.onerror = reject;
    img.src = buildIconDataUrl(key, color, strokeWidth);
  });
}

// Retrocompatibilidad
export const ICON_KEYS = Object.keys(SVG_PATHS) as IconKey[];
export const ICON_LABELS: Record<string, string> = BUILTIN_LABELS;
