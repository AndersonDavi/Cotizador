# Cotizador

Generador de propuestas económicas para freelancers y agencias. Crea, personaliza y exporta cotizaciones profesionales en segundos — sin backend, sin registro, todo en el navegador.

![Preview del cotizador](docs/preview.png)

## ¿Qué hace?

- **Editor en vivo** — panel izquierdo con formulario, preview del PDF en tiempo real a la derecha
- **Exporta a PDF, PNG, JSON y Markdown**
- **Ítems con íconos** — cada ítem del presupuesto lleva ícono SVG, título, descripción y valor en COP
- **Logo y firma** — sube tu logo y firma manuscrita, se renderizan en el documento
- **Persistencia local** — autosave en `localStorage`, historial de cotizaciones guardadas
- **100% estático** — no requiere servidor ni base de datos

## Demo

[andersondavi.github.io/cotizador](https://andersondavi.github.io/cotizador)

## Correr localmente

Requiere **Node.js 18+**

```bash
git clone https://github.com/AndersonDavi/cotizador.git
cd cotizador
npm install
npm run dev
```

Abre [http://localhost:4321](http://localhost:4321)

## Build para producción

```bash
npm run build
```

La carpeta `dist/` contiene el sitio estático listo para subir a cualquier hosting.

## Stack

- [Astro](https://astro.build/) — framework estático
- [Canvas 2D API](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API) — render del documento
- [jsPDF](https://github.com/parallax/jsPDF) — exportación a PDF
- [Lucide Icons](https://lucide.dev/) — íconos SVG embebidos

## Licencia

MIT — libre para usar, modificar y distribuir.
