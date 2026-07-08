export type AppLanguage = "zh-Hant" | "en";

export type AppSettings = {
  language: AppLanguage;
  reduceMotion: boolean;
  forumEmailDigest: boolean;
  forumReplyNotify: boolean;
  gameAutoplay: boolean;
  showMatureContent: boolean;
};

export const APP_SETTINGS_STORAGE_KEY = "rainynightfrog-app-settings";
const LEGACY_APP_SETTINGS_STORAGE_KEY = "nexusplay-app-settings";

export const DEFAULT_APP_SETTINGS: AppSettings = {
  language: "zh-Hant",
  reduceMotion: false,
  forumEmailDigest: true,
  forumReplyNotify: true,
  gameAutoplay: false,
  showMatureContent: true,
};

export function readAppSettingsRaw(): string | null {
  if (typeof window === "undefined") return null;

  const current = window.localStorage.getItem(APP_SETTINGS_STORAGE_KEY);
  if (current) return current;

  const legacy = window.localStorage.getItem(LEGACY_APP_SETTINGS_STORAGE_KEY);
  if (!legacy) return null;

  try {
    window.localStorage.setItem(APP_SETTINGS_STORAGE_KEY, legacy);
    window.localStorage.removeItem(LEGACY_APP_SETTINGS_STORAGE_KEY);
  } catch {
    // ignore quota errors
  }

  return legacy;
}

export function parseAppSettings(raw: string | null): AppSettings {
  if (!raw) return { ...DEFAULT_APP_SETTINGS };

  try {
    const parsed = JSON.parse(raw) as Partial<AppSettings> & {
      theme?: unknown;
      compactLayout?: unknown;
    };
    const { theme: _ignoredTheme, compactLayout: _ignoredCompactLayout, ...rest } =
      parsed;
    return { ...DEFAULT_APP_SETTINGS, ...rest };
  } catch {
    return { ...DEFAULT_APP_SETTINGS };
  }
}

export function applyAppSettings(settings: AppSettings) {
  if (typeof document === "undefined") return;

  const root = document.documentElement;
  root.dataset.reduceMotion = settings.reduceMotion ? "true" : "false";
  root.lang = settings.language;
  root.classList.add("dark");
  root.classList.remove("light");
  root.dataset.theme = "dark";
}
