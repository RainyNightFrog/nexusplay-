export type VirtualDmMessage = {
  id: string;
  virtual_player_id: string;
  sender: "user" | "virtual";
  content: string;
  created_at: string;
};

export type VirtualContactSummary = {
  id: string;
  displayName: string;
  locale: string;
  avatarUrl: string;
  lastMessage: string | null;
  lastMessageAt: string | null;
};
