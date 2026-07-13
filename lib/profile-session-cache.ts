import type { UserProfile } from "@/lib/auth";

const PROFILE_CACHE_KEY = "rnf_profile_cache_v2";
const PROFILE_CACHE_TTL_MS = 5 * 60_000;

type ProfileCacheEntry = {
  profile: UserProfile;
  cachedAt: number;
};

export function readProfileSessionCache(): UserProfile | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.sessionStorage.getItem(PROFILE_CACHE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as ProfileCacheEntry;
    if (
      !parsed?.profile?.id ||
      Date.now() - parsed.cachedAt > PROFILE_CACHE_TTL_MS
    ) {
      window.sessionStorage.removeItem(PROFILE_CACHE_KEY);
      return null;
    }

    return parsed.profile;
  } catch {
    return null;
  }
}

export function writeProfileSessionCache(profile: UserProfile) {
  if (typeof window === "undefined") return;

  try {
    const entry: ProfileCacheEntry = {
      profile,
      cachedAt: Date.now(),
    };
    window.sessionStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(entry));
  } catch {
    // ignore quota / private mode
  }
}

export function clearProfileSessionCache() {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(PROFILE_CACHE_KEY);
  } catch {
    // ignore
  }
}
