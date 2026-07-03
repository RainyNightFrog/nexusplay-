export type AppTheme = "dark" | "light" | "system";
export type AppLanguage = "zh-Hant" | "en";

export type AppSettings = {
  theme: AppTheme;
  language: AppLanguage;
  reduceMotion: boolean;
  compactLayout: boolean;
  forumEmailDigest: boolean;
  forumReplyNotify: boolean;
  gameAutoplay: boolean;
  showMatureContent: boolean;
};

export const APP_SETTINGS_STORAGE_KEY = "nexusplay-app-settings";

export const DEFAULT_APP_SETTINGS: AppSettings = {
  theme: "dark",
  language: "zh-Hant",
  reduceMotion: false,
  compactLayout: false,
  forumEmailDigest: true,
  forumReplyNotify: true,
  gameAutoplay: false,
  showMatureContent: true,
};

export function parseAppSettings(raw: string | null): AppSettings {
  if (!raw) return { ...DEFAULT_APP_SETTINGS };

  try {
    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    return { ...DEFAULT_APP_SETTINGS, ...parsed };
  } catch {
    return { ...DEFAULT_APP_SETTINGS };
  }
}

export function applyAppSettings(settings: AppSettings) {
  if (typeof document === "undefined") return;

  const root = document.documentElement;
  root.dataset.reduceMotion = settings.reduceMotion ? "true" : "false";
  root.dataset.compactLayout = settings.compactLayout ? "true" : "false";
  root.lang = settings.language;

  const prefersDark =
    settings.theme === "dark" ||
    (settings.theme === "system" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);

  root.classList.toggle("dark", prefersDark);
  root.classList.toggle("light", !prefersDark);
  root.dataset.theme = settings.theme;
}
