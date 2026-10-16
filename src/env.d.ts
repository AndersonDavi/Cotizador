/// <reference path="../.astro/types.d.ts" />
/** Datos de la compilación (build-info.mjs, vía vite define). */
declare const __BUILD__: { version: string; commit: string; fecha: string; id: string };

interface ImportMetaEnv {
  /** ID de cliente OAuth de Google (respaldo en Drive). Sin él, la opción no aparece. */
  readonly PUBLIC_GOOGLE_CLIENT_ID?: string;
}
