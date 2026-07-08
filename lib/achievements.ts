import type { RarityTier } from "@/lib/titles";

export type AchievementCategory = "gameplay" | "social" | "creator" | "special";

export type AchievementRecord = {
  id: string;
  code: string;
  title: string;
  description: string;
  badge_icon: string;
  category: AchievementCategory;
  rarity_tier: RarityTier;
  points: number;
  progress_target: number;
  created_at: string;
};

export type AchievementWithProgress = AchievementRecord & {
  unlocked: boolean;
  unlocked_at: string | null;
  unlock_percent: number;
  unlock_count: number;
  progress_current: number;
  progress_percent: number;
};

export type AchievementCategoryProgress = {
  category: AchievementCategory;
  unlocked: number;
  total: number;
  percent: number;
};

export const ACHIEVEMENT_CATEGORY_LABELS: Record<AchievementCategory, string> = {
  gameplay: "競技",
  social: "社交",
  creator: "創作",
  special: "特殊",
};

export const ACHIEVEMENT_CATEGORY_ORDER: AchievementCategory[] = [
  "gameplay",
  "social",
  "creator",
  "special",
];
