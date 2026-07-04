import type { AppLocale } from "@/i18n/routing";

const WAN_LOCALES = new Set<AppLocale>(["zh-HK", "zh-CN", "ja"]);

export function formatCompactCount(
  count: number,
  locale: string,
  newListingLabel: string
): string {
  if (count <= 0) return newListingLabel;

  if (WAN_LOCALES.has(locale as AppLocale)) {
    if (count >= 10_000) {
      const wan = count / 10_000;
      const value = wan >= 10 ? Math.round(wan).toString() : wan.toFixed(1);
      if (locale === "zh-CN") return `${value}万`;
      if (locale === "ja") return `${value}万`;
      return `${value}萬`;
    }
    if (count >= 1_000) return `${(count / 1_000).toFixed(1)}k`;
    return `${count}`;
  }

  if (locale === "ko" && count >= 10_000) {
    const man = count / 10_000;
    const value = man >= 10 ? Math.round(man).toString() : man.toFixed(1);
    return `${value}만`;
  }

  try {
    return new Intl.NumberFormat(locale, {
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(count);
  } catch {
    if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
    if (count >= 1_000) return `${(count / 1_000).toFixed(1)}k`;
    return `${count}`;
  }
}
