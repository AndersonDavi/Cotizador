import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://cotizador.andersonrueda.com',
  base: '/',
  server: { port: 4321 },
  vite: {
    build: { target: 'es2022' },
  },
});
