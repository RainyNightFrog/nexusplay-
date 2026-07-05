export const PROFILE_LIMITS = {
  displayName: 40,
  website: 200,
  twitter: 50,
  supportEmail: 120,
  avatarBytes: 2 * 1024 * 1024,
} as const;

export function normalizeTwitterHandle(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return trimmed.startsWith("@") ? trimmed : `@${trimmed.replace(/^@+/, "")}`;
}

export function normalizeWebsite(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export function isValidWebsite(value: string): boolean {
  if (!value) return true;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function isValidEmail(value: string): boolean {
  if (!value) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function normalizeSupportEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function resolveRoleFromPreferences(developingGames: boolean): "player" | "creator" {
  return developingGames ? "creator" : "player";
}
