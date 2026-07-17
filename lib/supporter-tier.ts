import { DEFAULT_SUPPORTER_BADGE } from "@/lib/checkout-order";
import type { UserProfile } from "@/lib/auth";
import type { EquippedTitle } from "@/lib/titles";

export const SUPPORTER_BADGE_V1 = DEFAULT_SUPPORTER_BADGE;
export const SUPPORTER_BADGE_V2 = "supporter_v2" as const;

export const SUPPORTER_TITLE_V1 = "平台支持者";
export const SUPPORTER_TITLE_V2 = "熱心支持者";
/** 永久傳說稱號（$250+ 一次性支持） */
export const SUPPORTER_TITLE_LIFETIME = "RainyNightFrog";
export const SUPPORTER_TITLE_LIFETIME_CSS = "title-rainynightfrog";

export type SupporterDisplayTier = "none" | "basic" | "premium";

export function isPremiumSupporterBadge(
  badge: string | null | undefined
): boolean {
  return badge === SUPPORTER_BADGE_V2;
}

function hasSupporterBadge(badge: string | null | undefined) {
  return typeof badge === "string" && badge.trim().length > 0;
}

function isSupporterEquippedTitle(title: EquippedTitle | null | undefined) {
  if (!title?.name) return false;
  return (
    title.name === SUPPORTER_TITLE_V1 ||
    title.name === SUPPORTER_TITLE_V2 ||
    title.name === SUPPORTER_TITLE_LIFETIME
  );
}

/** 支援 is_supporter、徽章或支持者稱號任一條件 */
export function isSupporterMember(
  isSupporter: boolean | null | undefined,
  badge: string | null | undefined,
  equippedTitle?: EquippedTitle | null
) {
  if (isSupporter === true) return true;
  if (hasSupporterBadge(badge)) return true;
  return isSupporterEquippedTitle(equippedTitle);
}

export function getSupporterDisplayTier(
  isSupporter: boolean,
  badge: string | null | undefined,
  equippedTitle?: EquippedTitle | null,
  /** 永久傳說支持者：特效與 SVIP（premium）相同 */
  supporterLifetime?: boolean | null
): SupporterDisplayTier {
  if (
    !isSupporterMember(isSupporter, badge, equippedTitle) &&
    supporterLifetime !== true
  ) {
    return "none";
  }
  return isPremiumSupporterBadge(badge) ||
    supporterLifetime === true ||
    equippedTitle?.name === SUPPORTER_TITLE_V2 ||
    equippedTitle?.name === SUPPORTER_TITLE_LIFETIME
    ? "premium"
    : "basic";
}

export function getSupporterDisplayTierFromProfile(
  profile: Pick<
    UserProfile,
    "is_supporter" | "supporter_badge" | "equipped_title" | "supporter_lifetime"
  > | null | undefined
): SupporterDisplayTier {
  if (!profile) return "none";
  return getSupporterDisplayTier(
    profile.is_supporter === true,
    profile.supporter_badge,
    profile.equipped_title,
    profile.supporter_lifetime === true
  );
}

export function getSupporterTitleNameForBadge(badge: string): string {
  return isPremiumSupporterBadge(badge)
    ? SUPPORTER_TITLE_V2
    : SUPPORTER_TITLE_V1;
}

export const supporterUsernameClassByTier = {
  basic: "font-semibold text-amber-300 drop-shadow-[0_0_8px_rgba(251,191,36,0.35)]",
  premium: "supporter-username supporter-username-premium font-semibold",
} as const;

export const supporterMessageContentClassByTier = {
  basic:
    "font-semibold text-amber-300 drop-shadow-[0_0_8px_rgba(251,191,36,0.35)]",
  premium: "supporter-username supporter-username-premium font-semibold",
} as const;

/** 僅 SVIP／傳說支持者打字需鏡像層（彩虹漸層）；VIP 直接在 textarea 顯示金色 */
export const supporterComposerMirrorClassByTier = {
  basic: "font-medium text-amber-300",
  premium: "supporter-username supporter-username-premium font-semibold",
} as const;

export const supporterComposerTextClassByTier = {
  basic: "text-amber-300 caret-amber-300",
  premium: "text-transparent caret-violet-300",
} as const;

export const supporterAvatarRingClassByTier = {
  basic: "ring-2 ring-amber-400/55 shadow-[0_0_18px_rgba(251,191,36,0.28)]",
  premium:
    "ring-2 ring-violet-300/55 shadow-[0_0_22px_rgba(167,139,250,0.35)]",
} as const;
