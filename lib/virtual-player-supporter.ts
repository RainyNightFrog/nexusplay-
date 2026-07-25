import type { EquippedTitle } from "@/lib/titles";
import {
  SUPPORTER_BADGE_V1,
  SUPPORTER_BADGE_V2,
  SUPPORTER_TITLE_V1,
  SUPPORTER_TITLE_V2,
  SUPPORTER_TITLE_LIFETIME,
  SUPPORTER_TITLE_LIFETIME_CSS,
  getSupporterDisplayTier,
  type SupporterDisplayTier,
} from "@/lib/supporter-tier";

export type VirtualPlayerSupporterFlags = {
  isSupporter: true;
  badge: string;
  lifetime?: boolean;
};

/** 聊天中顯示金色 VIP 的虛擬玩家 */
export const VIRTUAL_VIP_PLAYER_IDS = [
  "hk-03", // 迷宮探索者
  "hk-05", // 霓虹浪子
  "hk-06", // 街機老手
  "hk-11", // 涼風夜行
  "hk-16", // 九龍街機王
  "hk-25", // 雨夜青蛙友
  "cn-21", // 嘴馋小猫
  "cn-20", // 帝王傲世
  "cn-28", // 咖啡续命人
  "en-13", // Healium
  "en-20", // NeonCommuter
  "en-30", // OneMoreRun
] as const;

/** 聊天中顯示彩虹 SVIP 的虛擬玩家 */
export const VIRTUAL_SVIP_PLAYER_IDS = [
  "cn-18", // 木槿暖夏
  "cn-33", // 深夜食堂客
] as const;

/** 聊天中顯示永久傳說頭像特效的虛擬玩家 */
export const VIRTUAL_LIFETIME_PLAYER_IDS = [
  "hk-15", // 港島夜貓
  "en-05", // ObiWanKenobi
] as const;

const VIP_ID_SET = new Set<string>(VIRTUAL_VIP_PLAYER_IDS);
const SVIP_ID_SET = new Set<string>(VIRTUAL_SVIP_PLAYER_IDS);
const LIFETIME_ID_SET = new Set<string>(VIRTUAL_LIFETIME_PLAYER_IDS);

const VIRTUAL_COSMETIC_TITLES: EquippedTitle[] = [
  {
    id: "virtual-title-night-owl",
    name: "永夜傳說",
    css_class: "title-tier-legendary",
    rarity_tier: "legendary",
  },
  {
    id: "virtual-title-immersed",
    name: "沉浸冒險家",
    css_class: "title-tier-rare",
    rarity_tier: "rare",
  },
  {
    id: "virtual-title-board-regular",
    name: "排行榜常客",
    css_class: "title-tier-rare",
    rarity_tier: "rare",
  },
  {
    id: "virtual-title-chat",
    name: "話癆達人",
    css_class: "title-tier-common",
    rarity_tier: "common",
  },
  {
    id: "virtual-title-collector",
    name: "珍藏家",
    css_class: "title-tier-rare",
    rarity_tier: "rare",
  },
];

function hashString(value: string, salt: number) {
  let hash = salt;
  for (const char of value) {
    hash = Math.imul(31, hash) + char.charCodeAt(0);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function getVirtualPlayerSupporterBadge(
  virtualPlayerId: string
): string | null {
  if (LIFETIME_ID_SET.has(virtualPlayerId)) return SUPPORTER_BADGE_V2;
  if (SVIP_ID_SET.has(virtualPlayerId)) return SUPPORTER_BADGE_V2;
  if (VIP_ID_SET.has(virtualPlayerId)) return SUPPORTER_BADGE_V1;
  return null;
}

export function isVirtualPlayerLifetimeSupporter(virtualPlayerId: string) {
  return LIFETIME_ID_SET.has(virtualPlayerId);
}

export function getVirtualPlayerSupporterFlags(
  virtualPlayerId: string
): VirtualPlayerSupporterFlags | null {
  const badge = getVirtualPlayerSupporterBadge(virtualPlayerId);
  if (!badge) return null;
  return {
    isSupporter: true,
    badge,
    lifetime: LIFETIME_ID_SET.has(virtualPlayerId),
  };
}

/** 排行榜／聊天用：虛擬玩家佩戴稱號（VIP／SVIP／永久傳說優先） */
export function getVirtualPlayerEquippedTitle(
  virtualPlayerId: string
): EquippedTitle | null {
  if (LIFETIME_ID_SET.has(virtualPlayerId)) {
    return {
      id: `virtual-title-lifetime-${virtualPlayerId}`,
      name: SUPPORTER_TITLE_LIFETIME,
      css_class: SUPPORTER_TITLE_LIFETIME_CSS,
      rarity_tier: "legendary",
    };
  }
  const badge = getVirtualPlayerSupporterBadge(virtualPlayerId);
  if (badge === SUPPORTER_BADGE_V2) {
    return {
      id: `virtual-title-svip-${virtualPlayerId}`,
      name: SUPPORTER_TITLE_V2,
      css_class: "title-tier-legendary",
      rarity_tier: "legendary",
    };
  }
  if (badge === SUPPORTER_BADGE_V1) {
    return {
      id: `virtual-title-vip-${virtualPlayerId}`,
      name: SUPPORTER_TITLE_V1,
      css_class: "title-tier-epic",
      rarity_tier: "epic",
    };
  }

  // 其餘玩家約 45% 分配裝飾稱號，讓榜上較常能看到稱號
  const roll = hashString(virtualPlayerId, 71) % 100;
  if (roll >= 45) return null;
  const pick =
    VIRTUAL_COSMETIC_TITLES[
      hashString(virtualPlayerId, 103) % VIRTUAL_COSMETIC_TITLES.length
    ]!;
  return {
    ...pick,
    id: `${pick.id}-${virtualPlayerId}`,
  };
}

type ChatSupporterMessageLike = {
  is_own?: boolean;
  virtual_player_id?: string | null;
  author_is_supporter?: boolean;
  author_supporter_badge?: string | null;
  author_equipped_title?: EquippedTitle | null;
  author_admin_role?: import("@/lib/admin-display-role").AdminDisplayRole;
};

export function resolveChatMessageSupporterTier(
  message: ChatSupporterMessageLike,
  viewerSupporterTier: SupporterDisplayTier = "none",
  viewerSupporterBadge: string | null = null
): { tier: SupporterDisplayTier; badge: string | null } {
  if (message.is_own && viewerSupporterTier !== "none") {
    return {
      tier: viewerSupporterTier,
      badge: viewerSupporterBadge ?? message.author_supporter_badge ?? null,
    };
  }

  if (message.virtual_player_id) {
    const flags = getVirtualPlayerSupporterFlags(message.virtual_player_id);
    if (flags) {
      return {
        tier: getSupporterDisplayTier(
          true,
          flags.badge,
          null,
          flags.lifetime === true
        ),
        badge: flags.badge,
      };
    }
    return { tier: "none", badge: null };
  }

  const isSuperAdmin = message.author_admin_role === "super_admin";
  return {
    tier: getSupporterDisplayTier(
      message.author_is_supporter === true,
      message.author_supporter_badge,
      message.author_equipped_title,
      null,
      isSuperAdmin
    ),
    badge: message.author_supporter_badge ?? null,
  };
}
