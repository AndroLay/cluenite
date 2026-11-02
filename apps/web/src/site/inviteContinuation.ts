// A short-lived, same-tab continuation only. No bearer in a query, DOM, log, or localStorage.
const STORAGE_KEY = "cluenite.pending-invite.v1";
const MAX_AGE_MS = 20 * 60 * 1000;
export interface PendingInvite { id: string; token: string; savedAt: number }
export function validInvite(id: string, token: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id) && /^[A-Za-z0-9_-]{43}$/.test(token);
}
export function clearInvite(): void {
  try { sessionStorage.removeItem(STORAGE_KEY); } catch { /* Storage may be disabled. */ }
}
export function pendingInvite(): PendingInvite | null {
  try {
    const raw: unknown = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? "null");
    if (typeof raw !== "object" || raw === null || !("id" in raw) || !("token" in raw) || !("savedAt" in raw)
      || typeof raw.id !== "string" || typeof raw.token !== "string" || typeof raw.savedAt !== "number"
      || !validInvite(raw.id, raw.token) || Date.now() - raw.savedAt > MAX_AGE_MS || raw.savedAt > Date.now()) {
      clearInvite(); return null;
    }
    return { id: raw.id, token: raw.token, savedAt: raw.savedAt };
  } catch { clearInvite(); return null; }
}
export function rememberInvite(id: string, token: string): void {
  if (!validInvite(id, token)) return;
  try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ id, token, savedAt: Date.now() })); } catch { /* The original invitation remains usable. */ }
}
export function pendingInviteHref(): string | null {
  const invite = pendingInvite();
  return invite ? `/coop/invite?invite=${encodeURIComponent(invite.id)}` : null;
}
