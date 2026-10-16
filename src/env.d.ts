/// <reference path="../.astro/types.d.ts" />
interface ImportMetaEnv {
  /** ID de cliente OAuth de Google (respaldo en Drive). Sin él, la opción no aparece. */
  readonly PUBLIC_GOOGLE_CLIENT_ID?: string;
}
