const STORAGE_KEY = "nexusplay-search-history";
const MAX_ITEMS = 8;

export function readSearchHistory(): string[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
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
  } catch {
    // ignore quota errors
  }
}

export function clearSearchHistory() {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.removeItem(STORAGE_KEY);
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
  } catch {
    // ignore
  }
}
