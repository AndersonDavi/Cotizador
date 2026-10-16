// ── Built-in icons ───────────────────────────────────────────────────────────
// Paths de Lucide Icons (https://lucide.dev) — viewBox 0 0 24 24, stroke-based.
// El color real se inyecta en buildIconSvg()/buildIconDataUrl().

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
  // Tecnología
  server:   '<rect width="20" height="8" x="2" y="2" rx="2" ry="2"/><rect width="20" height="8" x="2" y="14" rx="2" ry="2"/><line x1="6" x2="6.01" y1="6" y2="6"/><line x1="6" x2="6.01" y1="18" y2="18"/>',
  wifi:     '<path d="M12 20h.01"/><path d="M2 8.82a15 15 0 0 1 20 0"/><path d="M5 12.859a10 10 0 0 1 14 0"/><path d="M8.5 16.429a5 5 0 0 1 7 0"/>',
  cpu:      '<rect width="16" height="16" x="4" y="4" rx="2"/><rect width="6" height="6" x="9" y="9" rx="1"/><path d="M15 2v2"/><path d="M15 20v2"/><path d="M2 15h2"/><path d="M2 9h2"/><path d="M20 15h2"/><path d="M20 9h2"/><path d="M9 2v2"/><path d="M9 20v2"/>',
  cart:     '<circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/>',
  // Diseño y contenido
  camera:   '<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/>',
  mic:      '<path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/>',
  printer:  '<polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect width="12" height="8" x="6" y="14"/>',
  megaphone:'<path d="m3 11 18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/>',
  mail:     '<rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>',
  // Instalación y mantenimiento
  wrench:   '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>',
  hammer:   '<path d="m15 12-8.373 8.373a1 1 0 1 1-3-3L12 9"/><path d="m18 15 4-4"/><path d="m21.5 11.5-1.914-1.914A2 2 0 0 1 19 8.172V7l-2.26-2.26a6 6 0 0 0-4.202-1.756L9 2.96l.92.82A6.18 6.18 0 0 1 12 8.4V10l2 2h1.172a2 2 0 0 1 1.414.586L18.5 14.5"/>',
  plug:     '<path d="M12 22v-5"/><path d="M9 8V2"/><path d="M15 8V2"/><path d="M18 8v5a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4V8Z"/>',
  lightbulb:'<path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/>',
  cctv:     '<path d="M16.75 12h3.632a1 1 0 0 1 .894 1.447l-2.034 4.069a1 1 0 0 1-1.708.134l-2.124-2.97"/><path d="M17.106 9.053a1 1 0 0 1 .447 1.341l-3.106 6.211a1 1 0 0 1-1.342.447L3.61 12.3a2.92 2.92 0 0 1-1.3-3.91L3.69 5.6a2.92 2.92 0 0 1 3.92-1.3z"/><path d="M2 19h3.76a2 2 0 0 0 1.8-1.1L9 15"/><path d="M2 21v-4"/><path d="M7 9h.01"/>',
  droplet:  '<path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z"/>',
  snowflake:'<line x1="2" x2="22" y1="12" y2="12"/><line x1="12" x2="12" y1="2" y2="22"/><path d="m20 16-4-4 4-4"/><path d="m4 8 4 4-4 4"/><path d="m16 4-4 4-4-4"/><path d="m8 20 4-4 4 4"/>',
  paint:    '<rect width="16" height="6" x="2" y="2" rx="2"/><path d="M10 16v-2a2 2 0 0 1 2-2h8a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect width="4" height="6" x="8" y="16" rx="1"/>',
  ruler:    '<path d="M21.3 15.3a2.4 2.4 0 0 1 0 3.4l-2.6 2.6a2.4 2.4 0 0 1-3.4 0L2.7 8.7a2.41 2.41 0 0 1 0-3.4l2.6-2.6a2.41 2.41 0 0 1 3.4 0Z"/><path d="m14.5 12.5 2-2"/><path d="m11.5 9.5 2-2"/><path d="m8.5 6.5 2-2"/><path d="m17.5 15.5 2-2"/>',
  key:      '<circle cx="7.5" cy="15.5" r="5.5"/><path d="m21 2-9.6 9.6"/><path d="m15.5 7.5 3 3L22 7l-3-3"/>',
  sun:      '<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>',
  battery:  '<rect width="16" height="10" x="2" y="7" rx="2" ry="2"/><line x1="22" x2="22" y1="11" y2="13"/><line x1="6" x2="6" y1="11" y2="13"/><line x1="10" x2="10" y1="11" y2="13"/>',
  home:     '<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
  building: '<rect width="16" height="20" x="4" y="2" rx="2" ry="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/><path d="M12 10h.01"/><path d="M12 14h.01"/><path d="M16 10h.01"/><path d="M16 14h.01"/><path d="M8 10h.01"/><path d="M8 14h.01"/>',
  leaf:     '<path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/>',
  sparkles: '<path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z"/>',
  // Servicios y negocio
  users:    '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  truck:    '<path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/>',
  package:  '<path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>',
  clipboard:'<rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="m9 14 2 2 4-4"/>',
  calendar: '<rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/>',
  pin:      '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
  shield:   '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>',
  graduation:'<path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z"/><path d="M22 10v6"/><path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5"/>',
  file:     '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/>',
  car:      '<path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/>',
  scissors: '<circle cx="6" cy="6" r="3"/><path d="M8.12 8.12 12 12"/><path d="M20 4 8.12 15.88"/><circle cx="6" cy="18" r="3"/><path d="M14.8 14.8 20 20"/>',
  utensils: '<path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 3 2h2Zm0 0v7"/>',
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
  server:   'Servidores / Hosting',
  wifi:     'Redes / Wi-Fi',
  cpu:      'Hardware',
  cart:     'Tienda en línea',
  camera:   'Fotografía',
  mic:      'Audio / Locución',
  printer:  'Impresión',
  megaphone:'Publicidad',
  mail:     'Email marketing',
  wrench:   'Mantenimiento',
  hammer:   'Obra / Instalación',
  plug:     'Electricidad',
  lightbulb:'Iluminación',
  cctv:     'Cámaras de seguridad',
  droplet:  'Plomería',
  snowflake:'Aire acondicionado',
  paint:    'Pintura',
  ruler:    'Medición / Planos',
  key:      'Cerrajería / Accesos',
  sun:      'Energía solar',
  battery:  'Baterías / UPS',
  home:     'Hogar',
  building: 'Edificio / Local',
  leaf:     'Jardinería',
  sparkles: 'Limpieza',
  users:    'Equipo / Mano de obra',
  truck:    'Transporte / Envío',
  package:  'Materiales',
  clipboard:'Visita técnica',
  calendar: 'Plan mensual',
  pin:      'Desplazamiento',
  shield:   'Garantía',
  graduation:'Capacitación',
  file:     'Documentación',
  car:      'Vehículos',
  scissors: 'Belleza / Estética',
  utensils: 'Alimentos / Eventos',
};

/** Categorías del selector, en orden. */
export const ICON_CATEGORIES: { nombre: string; keys: string[] }[] = [
  { nombre: 'Tecnología', keys: ['code', 'monitor', 'mobile', 'database', 'server', 'cloud', 'wifi', 'cpu', 'cart', 'bug', 'bolt', 'gear', 'lock', 'search', 'chart'] },
  { nombre: 'Diseño y contenido', keys: ['palette', 'pentool', 'layout', 'image', 'share', 'film', 'camera', 'mic', 'type', 'printer', 'megaphone', 'mail'] },
  { nombre: 'Instalación y mantenimiento', keys: ['wrench', 'hammer', 'plug', 'lightbulb', 'cctv', 'droplet', 'snowflake', 'paint', 'ruler', 'key', 'sun', 'battery', 'home', 'building', 'leaf', 'sparkles'] },
  { nombre: 'Servicios y negocio', keys: ['check', 'clipboard', 'clock', 'calendar', 'pin', 'truck', 'package', 'users', 'user', 'chat', 'shield', 'graduation', 'file', 'dollar', 'car', 'scissors', 'utensils'] },
];

/** Sinónimos para el buscador del selector. */
const KEYWORDS: Record<string, string> = {
  cctv: 'camaras seguridad vigilancia cctv dvr nvr monitoreo',
  plug: 'electrico electricista tomas cableado instalacion electrica red electrica',
  lightbulb: 'luces led bombillos iluminacion lamparas',
  wrench: 'mantenimiento reparacion soporte tecnico preventivo correctivo',
  hammer: 'obra construccion instalacion montaje remodelacion',
  droplet: 'agua plomeria tuberias fontaneria',
  snowflake: 'aire acondicionado refrigeracion frio clima hvac',
  paint: 'pintura acabados paredes',
  ruler: 'medicion planos levantamiento diseño arquitectura',
  key: 'cerrajeria llaves control de acceso chapas',
  sun: 'energia solar paneles fotovoltaico',
  battery: 'bateria ups respaldo energia planta',
  wifi: 'redes wifi internet cableado estructurado router',
  server: 'servidor hosting dominio vps',
  cpu: 'hardware computadores equipos ia',
  cart: 'ecommerce tienda carrito ventas',
  camera: 'foto fotografia sesion producto',
  mic: 'audio locucion podcast sonido',
  megaphone: 'publicidad marketing anuncios pauta ads campaña',
  mail: 'correo email newsletter',
  clipboard: 'visita diagnostico inspeccion revision',
  calendar: 'mensual mensualidad suscripcion iguala cita',
  pin: 'desplazamiento transporte domicilio viaticos',
  truck: 'envio transporte logistica domicilio',
  package: 'materiales insumos productos repuestos',
  users: 'equipo personal mano de obra tecnicos',
  shield: 'garantia poliza seguro',
  graduation: 'capacitacion curso formacion clase',
  file: 'documento contrato informe manual',
  sparkles: 'limpieza aseo',
  leaf: 'jardineria paisajismo plantas',
  building: 'local oficina edificio empresa',
  home: 'casa hogar vivienda apartamento',
  monitor: 'pagina web sitio ui frontend',
  code: 'desarrollo programacion software backend',
  mobile: 'app movil celular android ios',
  bolt: 'optimizacion rendimiento velocidad',
  scissors: 'peluqueria belleza estetica',
  utensils: 'comida catering eventos restaurante',
  car: 'carro vehiculo automotriz taller',
};

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

/** Texto en el que busca el selector (etiqueta + sinónimos), sin tildes. */
export function getIconSearchText(key: string): string {
  return norm(`${BUILTIN_LABELS[key] ?? key} ${key} ${KEYWORDS[key] ?? ''}`);
}

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

// Retrocompatibilidad
export const ICON_KEYS = Object.keys(SVG_PATHS) as IconKey[];
export const ICON_LABELS: Record<string, string> = BUILTIN_LABELS;
