import type { GameDevlogEntry } from "@/lib/game-page-content";
import { GAME_GENRES, GAME_TAGS } from "@/lib/game-metadata";

export type Game = {
  id: number;
  title: string;
  slug?: string | null;
  tags: string[];
  genre: string;
  players: number;
  likes: number;
  shares: number;
  image: string;
  creator: string;
  creatorId?: string | null;
  description: string;
  embedUrl: string;
  galleryUrls?: string[];
  devlogs?: GameDevlogEntry[];
  detailsHtml?: string;
  viewportWidth?: number;
  viewportHeight?: number;
  fullscreenButton?: boolean;
  aiDisclosed?: boolean | null;
  aiContentTypes?: string[];
  featured?: boolean;
  featuredBadge?: string;
  featuredAccent?: "cyan" | "amber" | "violet";
  ratingAvg?: number;
  tipsEnabled?: boolean;
  suggestedTipAmount?: number | null;
  price?: number;
  pricingType?: "free" | "fixed" | "pwyw";
  currency?: string;
  minPrice?: number;
  onSale?: boolean;
};

export const FILTER_CATEGORIES = ["全部", ...GAME_GENRES] as const;

/** 上傳表單可選分類（不含「全部」） */
export const UPLOAD_CATEGORIES = GAME_GENRES;

export type UploadCategory = (typeof UPLOAD_CATEGORIES)[number];

/** @deprecated 請改用 GAME_TAGS from @/lib/game-metadata */
export { GAME_TAGS as UPLOAD_TAGS };

export type FilterCategory = (typeof FILTER_CATEGORIES)[number];

export type SortOption = "latest" | "views" | "rating";

export const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "latest", label: "最新上傳" },
  { value: "views", label: "最多人玩" },
  { value: "rating", label: "好評最高" },
];

export const TAG_COLORS: Record<string, string> = {
  "3D": "bg-violet-500/20 text-violet-300 ring-violet-500/30",
  "2D": "bg-sky-500/20 text-sky-300 ring-sky-500/30",
  WebGL: "bg-indigo-500/20 text-indigo-300 ring-indigo-500/30",
  動作: "bg-rose-500/20 text-rose-300 ring-rose-500/30",
  益智: "bg-emerald-500/20 text-emerald-300 ring-emerald-500/30",
  多人對戰: "bg-amber-500/20 text-amber-300 ring-amber-500/30",
  單機: "bg-zinc-500/20 text-zinc-300 ring-zinc-500/30",
  RPG: "bg-fuchsia-500/20 text-fuchsia-300 ring-fuchsia-500/30",
  休閒: "bg-teal-500/20 text-teal-300 ring-teal-500/30",
  恐怖: "bg-red-500/20 text-red-300 ring-red-500/30",
  冒險: "bg-indigo-500/20 text-indigo-300 ring-indigo-500/30",
  策略: "bg-blue-500/20 text-blue-300 ring-blue-500/30",
  模擬: "bg-cyan-500/20 text-cyan-300 ring-cyan-500/30",
  卡牌對戰: "bg-orange-500/20 text-orange-300 ring-orange-500/30",
  塔防: "bg-lime-500/20 text-lime-300 ring-lime-500/30",
  賽博朋克: "bg-cyan-500/20 text-cyan-300 ring-cyan-500/30",
  硬核: "bg-rose-500/20 text-rose-300 ring-rose-500/30",
  Roguelike: "bg-violet-500/20 text-violet-300 ring-violet-500/30",
  自動化: "bg-sky-500/20 text-sky-300 ring-sky-500/30",
  復古: "bg-amber-500/20 text-amber-300 ring-amber-500/30",
  像素風: "bg-pink-500/20 text-pink-300 ring-pink-500/30",
  科幻: "bg-blue-500/20 text-blue-300 ring-blue-500/30",
};

export function isSupabaseImage(url: string) {
  return url.includes(".supabase.co/storage/");
}
