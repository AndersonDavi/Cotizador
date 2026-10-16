import { defineConfig } from 'astro/config';
import { BUILD } from './build-info.mjs';

export default defineConfig({
  site: 'https://cotizador.andersonrueda.com',
  base: '/',
  // cotizacion.html en vez de cotizacion/index.html: GitHub Pages la sirve en /cotizacion sin redirigir
  build: { format: 'file' },
  server: { port: 4321 },
  vite: {
    build: { target: 'es2022' },
    // Versión, commit y fecha de compilación (centro de ayuda y service worker)
    define: { __BUILD__: JSON.stringify(BUILD) },
    // html2canvas se importa bajo demanda (exportar PNG); sin esto Vite lo
    // descubre tarde en dev y responde "Outdated Optimize Dep".
    optimizeDeps: { include: ['html2canvas'] },
  },
});
