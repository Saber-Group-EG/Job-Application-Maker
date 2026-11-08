// localStorage side of form drafts, kept free of React/auth imports so
// AuthContext can clear drafts on logout without an import cycle.

export const PREFIX = 'formDraft:v1:';
export const MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000;

export type Stored<T> = { savedAt: number; value: T };

export const storageKey = (userId: string, key: string) => `${PREFIX}${userId}:${key}`;

export const read = <T,>(k: string): Stored<T> | null => {
  try {
    const raw = localStorage.getItem(k);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Stored<T>;
    if (!parsed || typeof parsed.savedAt !== 'number' || Date.now() - parsed.savedAt > MAX_AGE_MS) {
      localStorage.removeItem(k);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
};

export const remove = (k: string) => {
  try {
    localStorage.removeItem(k);
  } catch {
    // storage unavailable: nothing to remove
  }
};

export const same = (a: unknown, b: unknown) => {
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch {
    return false;
  }
};

/** Drop expired drafts (and every draft of other users) — call once on app start. */
export function pruneFormDrafts() {
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k?.startsWith(PREFIX)) read(k);
    }
  } catch {
    // ignore
  }
}

/** Remove every saved draft (e.g. on logout). */
export function clearAllFormDrafts() {
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k?.startsWith(PREFIX)) localStorage.removeItem(k);
    }
  } catch {
    // ignore
  }
}

