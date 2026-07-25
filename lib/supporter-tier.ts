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

/** basic=VIP · premium=SVIP · lifetime=永久傳說 */
export type SupporterDisplayTier = "none" | "basic" | "premium" | "lifetime";

export function isPremiumSupporterBadge(
  badge: string | null | undefined
): boolean {
  return badge === SUPPORTER_BADGE_V2;
}

/** SVIP 或永久傳說（共享多數炫彩文字特效，頭像框再分級） */
export function isSvipLikeTier(tier: SupporterDisplayTier): boolean {
  return tier === "premium" || tier === "lifetime";
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
  supporterLifetime?: boolean | null,
  isSuperAdmin?: boolean | null
): SupporterDisplayTier {
  // 超級管理員（profiles.is_admin）固定顯示永久傳說 LEGEND
  if (isSuperAdmin === true) {
    return "lifetime";
  }
  if (
    !isSupporterMember(isSupporter, badge, equippedTitle) &&
    supporterLifetime !== true
  ) {
    return "none";
  }
  if (
    supporterLifetime === true ||
    equippedTitle?.name === SUPPORTER_TITLE_LIFETIME
  ) {
    return "lifetime";
  }
  return isPremiumSupporterBadge(badge) ||
    equippedTitle?.name === SUPPORTER_TITLE_V2
    ? "premium"
    : "basic";
}

export function getSupporterDisplayTierFromProfile(
  profile: Pick<
    UserProfile,
    | "is_supporter"
    | "supporter_badge"
    | "equipped_title"
    | "supporter_lifetime"
    | "is_admin"
  > | null | undefined
): SupporterDisplayTier {
  if (!profile) return "none";
  return getSupporterDisplayTier(
    profile.is_supporter === true,
    profile.supporter_badge,
    profile.equipped_title,
    profile.supporter_lifetime === true,
    profile.is_admin === true
  );
}

export function getSupporterTitleNameForBadge(badge: string): string {
  return isPremiumSupporterBadge(badge)
    ? SUPPORTER_TITLE_V2
    : SUPPORTER_TITLE_V1;
}

export const supporterUsernameClassByTier = {
  basic:
    "font-semibold text-amber-300 drop-shadow-[0_0_8px_rgba(251,191,36,0.35)]",
  premium: "supporter-username supporter-username-premium font-semibold",
  lifetime: "supporter-username supporter-username-lifetime font-semibold",
} as const;

export const supporterMessageContentClassByTier = {
  basic:
    "font-semibold text-amber-300 drop-shadow-[0_0_8px_rgba(251,191,36,0.35)]",
  premium: "supporter-username supporter-username-premium font-semibold",
  lifetime: "supporter-username supporter-username-lifetime font-semibold",
} as const;

/** 僅 SVIP／傳說支持者打字需鏡像層（彩虹漸層）；VIP 直接在 textarea 顯示金色 */
export const supporterComposerMirrorClassByTier = {
  basic: "font-medium text-amber-300",
  premium: "supporter-username supporter-username-premium font-semibold",
  lifetime: "supporter-username supporter-username-lifetime font-semibold",
} as const;

export const supporterComposerTextClassByTier = {
  basic: "text-amber-300 caret-amber-300",
  premium: "text-transparent caret-violet-300",
  lifetime: "text-transparent caret-amber-200",
} as const;

/**
 * 頭像外圈特效（掛在外層 wrapper，避免與 AP 商店 ap-frame-* 的 ::before/::after 衝突）
 */
export const supporterAvatarRingClassByTier = {
  basic: "supporter-avatar-fx supporter-avatar-fx--vip",
  premium: "supporter-avatar-fx supporter-avatar-fx--svip",
  lifetime: "supporter-avatar-fx supporter-avatar-fx--legend",
} as const;

/** 列表／聊天等多個頭像並排時用：靜態光環，不跑旋轉／閃電（省 GPU） */
export const supporterAvatarRingClassByTierLite = {
  basic: "supporter-avatar-fx supporter-avatar-fx--vip supporter-avatar-fx--lite",
  premium:
    "supporter-avatar-fx supporter-avatar-fx--svip supporter-avatar-fx--lite",
  lifetime:
    "supporter-avatar-fx supporter-avatar-fx--legend supporter-avatar-fx--lite",
} as const;
