export type RarityTier = "common" | "rare" | "epic" | "legendary";

export type EquippedTitle = {
  id: string;
  name: string;
  css_class: string;
  rarity_tier: RarityTier;
};

export type TitleRecord = EquippedTitle & {
  unlock_achievement_id: string | null;
  created_at: string;
};

export type TitleWardrobeEntry = TitleRecord & {
  unlocked: boolean;
  unlocked_at: string | null;
  is_equipped: boolean;
  unlock_achievement: {
    id: string;
    title: string;
    badge_icon: string;
    unlocked: boolean;
  } | null;
};

export const RARITY_LABELS: Record<RarityTier, string> = {
  common: "普通",
  rare: "稀有",
  epic: "史詩",
  legendary: "傳奇",
};

export const RARITY_BORDER_CLASS: Record<RarityTier, string> = {
  common: "border-zinc-600/40",
  rare: "border-cyan-400/30 shadow-[0_0_12px_rgba(34,211,238,0.15)]",
  epic: "border-violet-400/35 shadow-[0_0_16px_rgba(139,92,246,0.2)]",
  legendary:
    "border-amber-400/40 shadow-[0_0_20px_rgba(251,191,36,0.25)] animate-pulse",
};

export type TitleDisplayOptions = {
  animate?: boolean;
};

export function getTitleDisplayClass(
  cssClass: string,
  rarityTier: RarityTier,
  options?: TitleDisplayOptions
) {
  const base = cssClass || `title-tier-${rarityTier}`;
  if (options?.animate === false) {
    return `${base} title-tier-no-animate`;
  }
  return base;
}
