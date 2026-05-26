// Thin, typed localStorage wrapper. Kept out of React and out of stores so it
// can be unit-tested and swapped if needed. Fails soft when storage is
// unavailable (private mode, SSR, tests without jsdom storage).

export function loadJSON<T>(key: string): T | null {
  try {
    const raw = globalThis.localStorage?.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function saveJSON(key: string, value: unknown): void {
  try {
    globalThis.localStorage?.setItem(key, JSON.stringify(value));
  } catch {
    // ignore quota / unavailable storage
  }
}

export function removeKey(key: string): void {
  try {
    globalThis.localStorage?.removeItem(key);
  } catch {
    // ignore
  }
}
