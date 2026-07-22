import { CHAT_LIMITS } from "@/lib/chat";

export type VirtualDmMessage = {
  id: string;
  virtual_player_id: string;
  sender: "user" | "virtual";
  content: string;
  created_at: string;
};

export const VIRTUAL_DM_LIMITS = {
  content: CHAT_LIMITS.content,
  historyDays: 90,
  pageSize: 80,
} as const;

export const VIRTUAL_DM_CONTACT_PREFIX = "vp:";

export function toVirtualDmContactId(virtualPlayerId: string) {
  return `${VIRTUAL_DM_CONTACT_PREFIX}${virtualPlayerId}`;
}

export function parseVirtualDmContactId(contactId: string): string | null {
  if (!contactId.startsWith(VIRTUAL_DM_CONTACT_PREFIX)) return null;
  const id = contactId.slice(VIRTUAL_DM_CONTACT_PREFIX.length).trim();
  return id || null;
}

export type VirtualContactSummary = {
  id: string;
  displayName: string;
  locale: import("@/lib/virtual-players").VirtualPlayerLocale;
  avatarUrl: string;
  lastMessage: string | null;
  lastMessageAt: string | null;
  equippedTitle: import("@/lib/titles").EquippedTitle | null;
};
