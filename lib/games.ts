import type { GameDevlogEntry } from "@/lib/game-page-content";

export type Game = {
  id: number;
  title: string;
  tags: string[];
  players: number;
  likes: number;
  shares: number;
  image: string;
  creator: string;
  description: string;
  embedUrl: string;
  galleryUrls?: string[];
  devlogs?: GameDevlogEntry[];
  featured?: boolean;
  featuredBadge?: string;
  featuredAccent?: "cyan" | "amber" | "violet";
  ratingAvg?: number;
};

export const FILTER_CATEGORIES = [
  "全部",
  "動作",
  "冒險",
  "益智",
  "3D",
  "策略",
] as const;

/** 上傳表單可選分類（不含「全部」） */
export const UPLOAD_CATEGORIES = FILTER_CATEGORIES.filter(
  (c): c is Exclude<FilterCategory, "全部"> => c !== "全部"
);

export type UploadCategory = (typeof UPLOAD_CATEGORIES)[number];

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
  動作: "bg-rose-500/20 text-rose-300 ring-rose-500/30",
  益智: "bg-emerald-500/20 text-emerald-300 ring-emerald-500/30",
  多人: "bg-amber-500/20 text-amber-300 ring-amber-500/30",
  RPG: "bg-fuchsia-500/20 text-fuchsia-300 ring-fuchsia-500/30",
  競速: "bg-orange-500/20 text-orange-300 ring-orange-500/30",
  休閒: "bg-teal-500/20 text-teal-300 ring-teal-500/30",
  射擊: "bg-red-500/20 text-red-300 ring-red-500/30",
  冒險: "bg-indigo-500/20 text-indigo-300 ring-indigo-500/30",
  策略: "bg-blue-500/20 text-blue-300 ring-blue-500/30",
};

export function isSupabaseImage(url: string) {
  return url.includes(".supabase.co/storage/");
}
