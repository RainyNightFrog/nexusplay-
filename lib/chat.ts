import type { EquippedTitle } from "@/lib/titles";

export type ChatChannel = "world" | "creator";

export type ChatMessageRecord = {
  id: string;
  channel: ChatChannel;
  user_id: string;
  content: string;
  recalled_at: string | null;
  created_at: string;
};

export type ChatMessage = ChatMessageRecord & {
  author_name: string;
  author_avatar_url: string | null;
  author_equipped_title: EquippedTitle | null;
  is_creator: boolean;
  is_own: boolean;
  is_virtual: boolean;
  virtual_player_id: string | null;
};

export const VALID_CHAT_CHANNELS: ChatChannel[] = ["world", "creator"];

export const CHAT_LIMITS = {
  content: 200,
  historyDays: 7,
  recallWindowMs: 2 * 60_000,
  minIntervalMs: 2_000,
  maxPerMinute: 20,
  duplicateWindowMs: 30_000,
  pageSize: 50,
} as const;

export function isValidChatChannel(value: string): value is ChatChannel {
  return VALID_CHAT_CHANNELS.includes(value as ChatChannel);
}
