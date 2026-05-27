import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://AndersonDavi.github.io',
  base: '/cotizador',
  server: { port: 4321 },
  vite: {
    build: { target: 'es2022' },
  },
});
