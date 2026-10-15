export function escapeHtml(s: string): string {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}

export function normalizeWebUrl(web: string): string {
  const w = (web ?? '').trim();
  if (!w) return '';
  return /^https?:\/\//i.test(w) ? w : `https://${w}`;
}
