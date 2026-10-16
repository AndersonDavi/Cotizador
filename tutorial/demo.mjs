// Cotización ficticia para el material público (promo, capturas). Sin datos reales.

const b64 = (s) => Buffer.from(s).toString('base64');

import { readFileSync } from 'node:fs';
// El logo del Cotizador como logo de la marca de ejemplo
export const DEMO_LOGO = readFileSync(new URL('../public/logo.svg', import.meta.url), 'utf8');
export const DEMO_FIRMA = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 100"><rect width="300" height="100" fill="#fff"/><path d="M20 70c20-40 30-50 40-20s10 30 25-5 20-30 30 0 15 20 30-10 25-20 35 10 20 15 40-15 30-5 45 10" fill="none" stroke="#1a1a2e" stroke-width="3.5" stroke-linecap="round"/></svg>`;

export const DEMO = {
  numero: '00024', fecha: '15-10-2026', alcance: 'Sitio web y tienda en línea para la panadería',
  costoTotal: 0, costoTotalAuto: true,
  items: [
    { id: 'a1', iconKey: 'palette', titulo: 'Identidad visual', descripcion: 'Ajuste del logo, paleta de colores y tipografías para web y redes sociales.', valor: 850000 },
    { id: 'a2', iconKey: 'layout', titulo: 'Sitio web de 5 secciones', descripcion: 'Inicio, nosotros, productos, pedidos y contacto. Diseño adaptable a celulares.', valor: 1800000 },
    { id: 'a3', iconKey: 'database', titulo: 'Tienda en línea', descripcion: 'Catálogo con 40 productos, carrito, pagos con PSE y tarjeta, y panel de pedidos.', valor: 2400000 },
    { id: 'a4', iconKey: 'image', titulo: 'Kit para redes sociales', descripcion: '12 plantillas editables para publicaciones e historias.', valor: 450000 },
  ],
  tiempoEntrega: '20 días hábiles a partir de la aprobación.\nIncluye dos rondas de ajustes.',
  terminos: ['50% para iniciar y 50% contra entrega.', 'Oferta válida por 15 días calendario.'],
  plantilla: 'oscura', coloresOverride: {},
  branding: {
    logoDataUrl: `data:image/svg+xml;base64,${b64(DEMO_LOGO)}`, empresa: 'Estudio Ámbar',
    representante: { nombre: 'LAURA MÉNDEZ', cedula: '1.020.304.050', firmaDataUrl: `data:image/svg+xml;base64,${b64(DEMO_FIRMA)}` },
    banco: 'Cuenta de Ahorros BANCO DEMO No. 000-000000-00', nombreLegal: 'LAURA MÉNDEZ GÓMEZ', direccion: 'Carrera 10 #20-30',
    contacto: { web: 'www.estudioambar.co', email: 'hola@estudioambar.co', cel: '+57 300 000 0000', ciudad: 'Medellín', pais: 'Colombia' },
  },
  diseno: 'bloque', colores: { primary: '#2F2E33', secondary: '#E3A94F' }, titulo: 'Propuesta económica',
  estado: 'enviada', cliente: { nombre: 'Panadería La Esquina S.A.S.', nit: '901.234.567-8' },
  cobro: { desde: '01-10-2026', hasta: '15-11-2026', fecha: '16-11-2026' },
};
