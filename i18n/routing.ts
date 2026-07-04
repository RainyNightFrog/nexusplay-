import { defineRouting } from "next-intl/routing";

/** Supported locales — default zh-HK; others use /{locale} prefix */
export const locales = [
  "zh-HK",
  "zh-CN",
  "en",
  "ja",
  "ko",
  "es",
  "fr",
  "de",
  "pt",
  "th",
  "vi",
] as const;

export type AppLocale = (typeof locales)[number];

export const defaultLocale: AppLocale = "zh-HK";

export const routing = defineRouting({
  locales,
  defaultLocale,
  localePrefix: "as-needed",
  localeCookie: {
    name: "NEXT_LOCALE",
    maxAge: 60 * 60 * 24 * 365,
  },
});

export const localeLabels: Record<
  AppLocale,
  { native: string; short: string }
> = {
  "zh-HK": { native: "繁體中文", short: "繁中" },
  "zh-CN": { native: "简体中文", short: "简中" },
  en: { native: "English", short: "EN" },
  ja: { native: "日本語", short: "JA" },
  ko: { native: "한국어", short: "KO" },
  es: { native: "Español", short: "ES" },
  fr: { native: "Français", short: "FR" },
  de: { native: "Deutsch", short: "DE" },
  pt: { native: "Português", short: "PT" },
  th: { native: "ไทย", short: "TH" },
  vi: { native: "Tiếng Việt", short: "VI" },
};

/** Map app locale → BCP 47 for date/number formatting */
export const localeDateMap: Record<AppLocale, string> = {
  "zh-HK": "zh-TW",
  "zh-CN": "zh-CN",
  en: "en-US",
  ja: "ja-JP",
  ko: "ko-KR",
  es: "es-ES",
  fr: "fr-FR",
  de: "de-DE",
  pt: "pt-BR",
  th: "th-TH",
  vi: "vi-VN",
};
