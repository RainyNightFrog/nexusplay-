const STORAGE_KEY = "rainynightfrog-search-history";
const LEGACY_STORAGE_KEY = "nexusplay-search-history";
const MAX_ITEMS = 8;

function readRawHistory(): string | null {
  if (typeof window === "undefined") return null;

  const current = window.localStorage.getItem(STORAGE_KEY);
  if (current) return current;

  const legacy = window.localStorage.getItem(LEGACY_STORAGE_KEY);
  if (!legacy) return null;

  try {
    window.localStorage.setItem(STORAGE_KEY, legacy);
    window.localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch {
    // ignore quota errors
  }

  return legacy;
}

export function readSearchHistory(): string[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = readRawHistory();
    if (!raw) return [];

    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, MAX_ITEMS);
  } catch {
    return [];
  }
}

export function addSearchHistory(query: string) {
  if (typeof window === "undefined") return;

  const trimmed = query.trim().slice(0, 80);
  if (!trimmed) return;

  const current = readSearchHistory().filter(
    (item) => item.toLowerCase() !== trimmed.toLowerCase()
  );

  const next = [trimmed, ...current].slice(0, MAX_ITEMS);

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    window.localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch {
    // ignore quota errors
  }
}

export function clearSearchHistory() {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.removeItem(STORAGE_KEY);
    window.localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function removeSearchHistoryItem(query: string) {
  if (typeof window === "undefined") return;

  const trimmed = query.trim();
  if (!trimmed) return;

  const next = readSearchHistory().filter(
    (item) => item.toLowerCase() !== trimmed.toLowerCase()
  );

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    window.localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch {
    // ignore
  }
}
