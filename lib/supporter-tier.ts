import { DEFAULT_SUPPORTER_BADGE } from "@/lib/checkout-order";

export const SUPPORTER_BADGE_V1 = DEFAULT_SUPPORTER_BADGE;
export const SUPPORTER_BADGE_V2 = "supporter_v2" as const;

export const SUPPORTER_TITLE_V1 = "平台支持者";
export const SUPPORTER_TITLE_V2 = "熱心支持者";

export type SupporterDisplayTier = "none" | "basic" | "premium";

export function isPremiumSupporterBadge(
  badge: string | null | undefined
): boolean {
  return badge === SUPPORTER_BADGE_V2;
}

export function getSupporterDisplayTier(
  isSupporter: boolean,
  badge: string | null | undefined
): SupporterDisplayTier {
  if (!isSupporter) return "none";
  return isPremiumSupporterBadge(badge) ? "premium" : "basic";
}

export function getSupporterTitleNameForBadge(badge: string): string {
  return isPremiumSupporterBadge(badge)
    ? SUPPORTER_TITLE_V2
    : SUPPORTER_TITLE_V1;
}

export const supporterUsernameClassByTier = {
  basic:
    "bg-gradient-to-r from-amber-100 via-rose-100 to-violet-200 bg-clip-text text-transparent",
  premium:
    "supporter-username-premium bg-gradient-to-r from-amber-200 via-rose-200 to-violet-300 bg-clip-text text-transparent",
} as const;

export const supporterAvatarRingClassByTier = {
  basic: "ring-2 ring-amber-400/35",
  premium:
    "ring-2 ring-amber-300/50 shadow-[0_0_20px_rgba(251,191,36,0.22)]",
} as const;
