export type VirtualDmMessage = {
  id: string;
  virtual_player_id: string;
  sender: "user" | "virtual";
  content: string;
  created_at: string;
};

export const VIRTUAL_DM_LIMITS = {
  content: 500,
  historyDays: 90,
  pageSize: 80,
} as const;

export type VirtualContactSummary = {
  id: string;
  displayName: string;
  locale: import("@/lib/virtual-players").VirtualPlayerLocale;
  avatarUrl: string;
  lastMessage: string | null;
  lastMessageAt: string | null;
  equippedTitle: import("@/lib/titles").EquippedTitle | null;
};
