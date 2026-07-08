import { hasLocale } from "next-intl";
import {
  defaultLocale,
  locales,
  type AppLocale,
} from "@/i18n/routing";

import {
  VIRTUAL_PLAYERS_BY_LOCALE,
  type VirtualPlayerLocale,
} from "@/lib/virtual-players";

export type ForumSeedLocale = VirtualPlayerLocale;

export type LocalizedText = Record<ForumSeedLocale, string>;

export type SeedAuthorRef =
  | { kind: "player"; index: number }
  | {
      kind: "official";
      key: "nexusplay-support" | "neontowers" | "eliteroyal-art";
    };

const OFFICIAL_AUTHOR_NAMES: Record<
  Extract<SeedAuthorRef, { kind: "official" }>["key"],
  LocalizedText
> = {
  "nexusplay-support": {
    "zh-HK": "NexusPlay 客服",
    "zh-CN": "NexusPlay 客服",
    en: "NexusPlay Support",
  },
  neontowers: {
    "zh-HK": "NeonTowers 官方",
    "zh-CN": "NeonTowers 官方",
    en: "NeonTowers Official",
  },
  "eliteroyal-art": {
    "zh-HK": "EliteRoyal 美術組",
    "zh-CN": "EliteRoyal 美术组",
    en: "EliteRoyal Art Team",
  },
};

export function resolveForumSeedLocale(locale?: string | null): ForumSeedLocale {
  const resolved = locale ?? defaultLocale;
  if (resolved === "zh-HK" || resolved === "zh-CN") return resolved;
  return "en";
}

export function resolveAppLocale(locale?: string | null): AppLocale {
  if (locale && hasLocale(locales, locale)) return locale;
  return defaultLocale;
}

export function resolveSeedAuthorName(
  author: SeedAuthorRef,
  locale: ForumSeedLocale
): string {
  if (author.kind === "official") {
    return OFFICIAL_AUTHOR_NAMES[author.key][locale];
  }

  const pool = VIRTUAL_PLAYERS_BY_LOCALE[locale];
  return pool[author.index % pool.length]!.displayName;
}

export function pickLocalizedText(
  text: LocalizedText,
  locale: ForumSeedLocale
): string {
  return text[locale];
}
