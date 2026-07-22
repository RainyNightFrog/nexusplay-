/** 真實玩家雙人私訊 */

export const PLAYER_DM_LIMITS = {
  content: 200,
  historyDays: 90,
  pageSize: 100,
} as const;

export type PlayerDmContact = {
  threadId: string;
  peerUserId: string;
  displayName: string;
  avatarUrl: string | null;
  lastMessage: string | null;
  lastMessageAt: string | null;
  unread: boolean;
};

export type PlayerDmMessage = {
  id: string;
  thread_id: string;
  sender_user_id: string;
  sender_display_name: string;
  content: string;
  created_at: string;
  is_own: boolean;
  /** 發送者支持者顯示層級：none / basic(VIP) / premium(SVIP) */
  sender_supporter_tier: import("@/lib/supporter-tier").SupporterDisplayTier;
};

export type PlayerDmThreadSummary = {
  id: string;
  peerUserId: string;
  peerDisplayName: string;
  peerAvatarUrl: string | null;
  lastMessageAt: string;
  lastMessagePreview: string | null;
  unread: boolean;
};
