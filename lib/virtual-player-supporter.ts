import type { EquippedTitle } from "@/lib/titles";
import {
  SUPPORTER_BADGE_V1,
  SUPPORTER_BADGE_V2,
  getSupporterDisplayTier,
  type SupporterDisplayTier,
} from "@/lib/supporter-tier";

export type VirtualPlayerSupporterFlags = {
  isSupporter: true;
  badge: string;
};

/** 聊天中顯示金色 VIP 的虛擬玩家（7 位） */
export const VIRTUAL_VIP_PLAYER_IDS = [
  "hk-03", // 迷宮探索者
  "hk-05", // 霓虹浪子
  "hk-06", // 街機老手
  "hk-11", // 涼風夜行
  "cn-21", // 嘴馋小猫
  "cn-20", // 帝王傲世
  "en-13", // Healium
] as const;

/** 聊天中顯示彩虹 SVIP 的虛擬玩家（2 位） */
export const VIRTUAL_SVIP_PLAYER_IDS = [
  "cn-18", // 木槿暖夏
  "en-05", // ObiWanKenobi
] as const;

const VIP_ID_SET = new Set<string>(VIRTUAL_VIP_PLAYER_IDS);
const SVIP_ID_SET = new Set<string>(VIRTUAL_SVIP_PLAYER_IDS);

export function getVirtualPlayerSupporterBadge(
  virtualPlayerId: string
): string | null {
  if (SVIP_ID_SET.has(virtualPlayerId)) return SUPPORTER_BADGE_V2;
  if (VIP_ID_SET.has(virtualPlayerId)) return SUPPORTER_BADGE_V1;
  return null;
}

export function getVirtualPlayerSupporterFlags(
  virtualPlayerId: string
): VirtualPlayerSupporterFlags | null {
  const badge = getVirtualPlayerSupporterBadge(virtualPlayerId);
  if (!badge) return null;
  return { isSupporter: true, badge };
}

type ChatSupporterMessageLike = {
  is_own?: boolean;
  virtual_player_id?: string | null;
  author_is_supporter?: boolean;
  author_supporter_badge?: string | null;
  author_equipped_title?: EquippedTitle | null;
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
        tier: getSupporterDisplayTier(true, flags.badge),
        badge: flags.badge,
      };
    }
    return { tier: "none", badge: null };
  }

  return {
    tier: getSupporterDisplayTier(
      message.author_is_supporter === true,
      message.author_supporter_badge,
      message.author_equipped_title
    ),
    badge: message.author_supporter_badge ?? null,
  };
}
