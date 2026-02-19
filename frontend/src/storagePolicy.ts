// Reversible storage policy: minimal user storage by default (only user_id).
// Flip USE_MINIMAL_USER_STORAGE to false to restore full user object persistence.

export const USE_MINIMAL_USER_STORAGE = true;

export const STORAGE_KEYS = {
  USER_ID: 'user_id',
  USER: 'user',
} as const;

export function readStoredUserId(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEYS.USER_ID);
  } catch {
    return null;
  }
}

export function setStoredUserId(id: number | string | null): void {
  try {
    if (id == null) {
      localStorage.removeItem(STORAGE_KEYS.USER_ID);
      return;
    }
    localStorage.setItem(STORAGE_KEYS.USER_ID, String(id));
  } catch {
    // ignore localStorage errors in non-fatal paths
  }
}

export function readStoredUser(): any {
  if (USE_MINIMAL_USER_STORAGE) return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.USER);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setStoredUser(user: any): void {
  if (USE_MINIMAL_USER_STORAGE) return;
  try {
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
  } catch {
    // ignore
  }
}

export function clearStoredUser(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.USER_ID);
  } catch {
    // ignore
  }
  if (!USE_MINIMAL_USER_STORAGE) {
    try {
      localStorage.removeItem(STORAGE_KEYS.USER);
    } catch {
      // ignore
    }
  }
}
