// Respaldo en Google Drive sin servidor.
// Google Identity Services entrega un token de acceso (dura 1 hora y vive solo en memoria)
// con el permiso drive.file: la app solo ve y edita los archivos que ella misma crea.
// El respaldo es un JSON en la carpeta "Cotizador" del Drive de la persona; Drive guarda
// las versiones anteriores por su cuenta.
//
// Para activarlo en otro dominio hay que definir PUBLIC_GOOGLE_CLIENT_ID al compilar (ver README).
// Sin ese valor solo funciona el ID del sitio oficial, y solo en su dominio y en localhost
// (Google rechaza cualquier otro origen). El ID de cliente no es secreto.

const ID_OFICIAL = '47104754240-q72ctatmrqc2fbnsmv6gstkgmr3ck57q.apps.googleusercontent.com';
const ORIGENES_OFICIALES = ['cotizador.andersonrueda.com', 'localhost'];

const CLIENT_ID = (import.meta.env.PUBLIC_GOOGLE_CLIENT_ID as string | undefined)?.trim()
  || (typeof location !== 'undefined' && ORIGENES_OFICIALES.includes(location.hostname) ? ID_OFICIAL : undefined);
const SCOPE = 'https://www.googleapis.com/auth/drive.file';
const KEY = 'cotizador:drive';
const FOLDER = 'Cotizador';
const FILE = 'cotizador-respaldo.json';
const API = 'https://www.googleapis.com/drive/v3';
const UPLOAD = 'https://www.googleapis.com/upload/drive/v3';

export type DriveInfo = { conectado: boolean; fileId?: string; folderId?: string; ultimo?: string };

export class DriveAuthError extends Error {}

export const driveDisponible = (): boolean => !!CLIENT_ID;

export function driveInfo(): DriveInfo {
  try { return { conectado: false, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch { return { conectado: false }; }
}

function setInfo(patch: Partial<DriveInfo> | null) {
  try {
    if (patch === null) localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, JSON.stringify({ ...driveInfo(), ...patch }));
  } catch { /* sin storage */ }
}

// ── Token ────────────────────────────────────────────────────────────────────

let token: { value: string; exp: number } | null = null;
let client: any = null;
let scriptLoad: Promise<void> | null = null;
let waiting: { resolve: (t: string) => void; reject: (e: Error) => void } | null = null;

/** Carga Google Identity Services. Conviene llamarla antes del clic que pide permiso. */
export function prepararDrive(): Promise<void> {
  if (!CLIENT_ID) return Promise.reject(new Error('Drive no está configurado'));
  scriptLoad ??= new Promise<void>((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.async = true;
    s.onload = () => {
      const g = (window as any).google;
      client = g.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPE,
        callback: (r: any) => {
          const w = waiting; waiting = null;
          if (r.error || !r.access_token) { w?.reject(new DriveAuthError(r.error_description || r.error || 'Permiso denegado')); return; }
          token = { value: r.access_token, exp: Date.now() + (Number(r.expires_in) || 3600) * 1000 };
          w?.resolve(r.access_token);
        },
        error_callback: (e: any) => {
          const w = waiting; waiting = null;
          w?.reject(new DriveAuthError(e?.type === 'popup_closed' ? 'Se cerró la ventana de Google' : e?.message || 'No se pudo conectar con Google'));
        },
      });
      resolve();
    };
    s.onerror = () => { scriptLoad = null; reject(new Error('No se pudo cargar Google (¿sin conexión?)')); };
    document.head.appendChild(s);
  });
  return scriptLoad;
}

const tokenVigente = () => (token && token.exp - Date.now() > 60_000 ? token.value : null);

/**
 * Devuelve un token. Si hay que pedirlo y `interactivo` es true, abre la ventana de Google:
 * debe llamarse dentro de un clic (o tecla) para que el navegador no la bloquee.
 */
function pedirToken(interactivo: boolean): Promise<string> {
  const t = tokenVigente();
  if (t) return Promise.resolve(t);
  if (!interactivo || !client) return Promise.reject(new DriveAuthError('Hay que volver a conectar Drive'));
  waiting?.reject(new DriveAuthError('Cancelado'));
  return new Promise((resolve, reject) => {
    waiting = { resolve, reject };
    // Si ya dio permiso antes, la ventana se abre y se cierra sola
    client.requestAccessToken({ prompt: driveInfo().conectado ? '' : 'consent' });
  });
}

// ── API ──────────────────────────────────────────────────────────────────────

async function api(t: string, url: string, init: RequestInit = {}): Promise<Response> {
  const res = await fetch(url, { ...init, headers: { Authorization: `Bearer ${t}`, ...(init.headers || {}) } });
  if (res.status === 401) { token = null; throw new DriveAuthError('El permiso de Drive venció'); }
  return res;
}

const q = (s: string) => encodeURIComponent(s);

async function buscar(t: string, query: string): Promise<{ id: string; modifiedTime: string }[]> {
  const res = await api(t, `${API}/files?q=${q(query)}&orderBy=modifiedTime desc&pageSize=5&fields=files(id,modifiedTime)&spaces=drive`);
  if (!res.ok) throw new Error(`Drive respondió ${res.status}`);
  return (await res.json()).files ?? [];
}

async function carpeta(t: string): Promise<string> {
  const info = driveInfo();
  if (info.folderId) return info.folderId;
  const found = await buscar(t, `name='${FOLDER}' and mimeType='application/vnd.google-apps.folder' and trashed=false`);
  let id = found[0]?.id;
  if (!id) {
    const res = await api(t, `${API}/files?fields=id`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: FOLDER, mimeType: 'application/vnd.google-apps.folder' }),
    });
    if (!res.ok) throw new Error(`No se pudo crear la carpeta (${res.status})`);
    id = (await res.json()).id as string;
  }
  setInfo({ folderId: id });
  return id;
}

async function archivo(t: string): Promise<{ id: string; modifiedTime: string } | null> {
  const info = driveInfo();
  if (info.fileId) {
    const res = await api(t, `${API}/files/${info.fileId}?fields=id,modifiedTime,trashed`);
    if (res.ok) { const f = await res.json(); if (!f.trashed) return f; }
  }
  const found = (await buscar(t, `name='${FILE}' and trashed=false`))[0] ?? null;
  setInfo({ fileId: found?.id });
  return found;
}

/** Conecta (pide permiso) y dice si ya hay un respaldo en Drive. */
export async function conectarDrive(): Promise<{ existe: boolean; fecha?: string }> {
  const t = await pedirToken(true);
  setInfo({ conectado: true });
  const f = await archivo(t);
  return f ? { existe: true, fecha: f.modifiedTime } : { existe: false };
}

let subiendo: Promise<void> | null = null;
let otraVez: (() => string) | null = null;

/**
 * Sube el respaldo. Si ya hay una subida en curso, sube una vez más al terminar con lo último.
 * Si el archivo de Drive cambió desde la última vez que este equipo lo vio (otro equipo
 * subió algo), primero lo baja y llama `fusionar` para combinarlo; después sube.
 */
export function subirRespaldo(datos: () => string, interactivo: boolean, fusionar?: (remoto: unknown) => void | Promise<void>): Promise<void> {
  if (subiendo) { otraVez = datos; return subiendo; }
  const run = async (d: () => string) => {
    const t = await pedirToken(interactivo);
    const f = await archivo(t);
    const visto = driveInfo().ultimo;
    if (f && fusionar && (!visto || Date.parse(f.modifiedTime) > Date.parse(visto) + 1000)) {
      const rem = await api(t, `${API}/files/${f.id}?alt=media`);
      if (rem.ok) await fusionar(await rem.json());
    }
    const body = d();
    let res: Response;
    if (f) {
      res = await api(t, `${UPLOAD}/files/${f.id}?uploadType=media&fields=id,modifiedTime`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body,
      });
    } else {
      const meta = { name: FILE, mimeType: 'application/json', parents: [await carpeta(t)] };
      const form = new FormData();
      form.append('metadata', new Blob([JSON.stringify(meta)], { type: 'application/json' }));
      form.append('file', new Blob([body], { type: 'application/json' }));
      res = await api(t, `${UPLOAD}/files?uploadType=multipart&fields=id,modifiedTime`, { method: 'POST', body: form });
    }
    if (!res.ok) throw new Error(`Drive respondió ${res.status}`);
    const out = await res.json();
    setInfo({ conectado: true, fileId: out.id, ultimo: out.modifiedTime || new Date().toISOString() });
  };
  subiendo = (async () => {
    try {
      await run(datos);
      while (otraVez) { const d = otraVez; otraVez = null; await run(d); }
    } finally { subiendo = null; otraVez = null; }
  })();
  return subiendo;
}

/** Descarga el respaldo de Drive (null si no hay). */
export async function bajarRespaldo(interactivo: boolean): Promise<unknown | null> {
  const t = await pedirToken(interactivo);
  const f = await archivo(t);
  if (!f) return null;
  const res = await api(t, `${API}/files/${f.id}?alt=media`);
  if (!res.ok) throw new Error(`Drive respondió ${res.status}`);
  const json = await res.json();
  setInfo({ ultimo: f.modifiedTime }); // este equipo ya vio esa versión
  return json;
}

/** Quita el permiso en Google y olvida el archivo (el respaldo sigue en Drive). */
export function desconectarDrive(): void {
  const g = (window as any).google;
  if (token && g?.accounts?.oauth2) g.accounts.oauth2.revoke(token.value, () => {});
  token = null;
  setInfo(null);
}

export const driveTokenVigente = (): boolean => !!tokenVigente();
