export type AppLanguage = "zh-HK" | "zh-CN" | "en";

export type AppSettings = {
  language: AppLanguage;
  reduceMotion: boolean;
  /** 本機關閉頭像框／支持者光環／稱號雷電等外觀特效（省電／效能） */
  disableCosmeticFx: boolean;
  /** 隱藏「自己」的支持者頭像特效（VIP／SVIP／LEGEND 光環與角標） */
  hideMySupporterFx: boolean;
  forumEmailDigest: boolean;
  forumReplyNotify: boolean;
  gameAutoplay: boolean;
  showMatureContent: boolean;
};

export function getDefaultAppSettings(options?: {
  disableCosmeticFx?: boolean;
}): AppSettings {
  return {
    language: "zh-HK",
    reduceMotion: false,
    disableCosmeticFx: options?.disableCosmeticFx ?? false,
    hideMySupporterFx: false,
    forumEmailDigest: true,
    forumReplyNotify: true,
    gameAutoplay: false,
    showMatureContent: true,
  };
}

export const APP_SETTINGS_STORAGE_KEY = "rainynightfrog-app-settings";
const LEGACY_APP_SETTINGS_STORAGE_KEY = "nexusplay-app-settings";

export const DEFAULT_APP_SETTINGS: AppSettings = getDefaultAppSettings();

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

export function parseAppSettings(
  raw: string | null,
  defaults: AppSettings = DEFAULT_APP_SETTINGS
): AppSettings {
  if (!raw) return { ...defaults };

  try {
    const parsed = JSON.parse(raw) as Partial<AppSettings> & {
      theme?: unknown;
      compactLayout?: unknown;
    };
    const rest = { ...parsed };
    delete rest.theme;
    delete rest.compactLayout;
    const rawLanguage = rest.language as string | undefined;
    const language =
      rawLanguage === "zh-Hant" || rawLanguage === "zh-TW"
        ? ("zh-HK" as AppLanguage)
        : rest.language;
    return {
      ...defaults,
      ...rest,
      ...(language ? { language } : {}),
    };
  } catch {
    return { ...defaults };
  }
}

export function applyAppSettings(settings: AppSettings) {
  if (typeof document === "undefined") return;

  const root = document.documentElement;
  root.dataset.reduceMotion = settings.reduceMotion ? "true" : "false";
  root.dataset.disableCosmeticFx = settings.disableCosmeticFx ? "true" : "false";
  root.lang = settings.language;
  root.classList.add("dark");
  root.classList.remove("light");
  root.dataset.theme = "dark";
}
