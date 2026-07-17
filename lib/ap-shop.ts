import type { RarityTier } from "@/lib/titles";

export type ApShopItemKind =
  | "avatar_frame"
  | "name_color"
  | "chat_bubble"
  | "title";

export type ApWallet = {
  balance: number;
  lifetime_earned: number;
};

export type ApShopItem = {
  id: string;
  code: string;
  kind: ApShopItemKind;
  name: string;
  description: string;
  price_ap: number;
  css_class: string;
  rarity_tier: RarityTier;
  unlock_title_id: string | null;
  sort_order: number;
  owned: boolean;
  equipped: boolean;
};

export type EquippedCosmetics = {
  avatar_frame: string | null;
  name_color: string | null;
  chat_bubble: string | null;
};

export const AP_SHOP_KIND_LABELS: Record<ApShopItemKind, string> = {
  avatar_frame: "頭像框",
  name_color: "名字顏色",
  chat_bubble: "聊天氣泡",
  title: "專屬稱號",
};

export const EMPTY_COSMETICS: EquippedCosmetics = {
  avatar_frame: null,
  name_color: null,
  chat_bubble: null,
};
