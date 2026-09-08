export interface StoredIdentity {
  username: string;
  avatarUrl: string;
  savedAt: string;
}

const IDENTITY_KEY = 'gl_github_identity';

export function saveIdentity(identity: StoredIdentity) {
  window.localStorage.setItem(IDENTITY_KEY, JSON.stringify(identity));
}

export function loadIdentity(): StoredIdentity | null {
  try {
    const raw = window.localStorage.getItem(IDENTITY_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredIdentity;
    if (!parsed || typeof parsed.username !== 'string' || !parsed.username) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearIdentity() {
  window.localStorage.removeItem(IDENTITY_KEY);
}