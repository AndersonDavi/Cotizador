import { defineConfig } from 'astro/config';
import { BUILD } from './build-info.mjs';

export default defineConfig({
  site: 'https://cotizador.andersonrueda.com',
  base: '/',
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
