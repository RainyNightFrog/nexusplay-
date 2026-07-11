export const HOME_COPY = {
  statsPlaying: "\u5728\u73a9",
  statsLikes: "\u8b9a",
  statsShares: "\u5206\u4eab",
  filterLabel: "\u7be9\u9078\u8207\u6392\u5e8f",
  sortLabel: "\u6392\u5e8f",
  sortPlaceholder: "\u9078\u64c7\u6392\u5e8f",
  searchPlaceholder:
    "\u641c\u5c0b\u904a\u6232\u3001\u6a19\u7c64\u6216\u5275\u4f5c\u8005...",
  community: "\u793e\u7fa4\u8a0e\u8ad6",
  heroBadge: "\u5168\u65b0\u904a\u6232\u5e73\u53f0 \u00b7 \u5373\u523b\u958b\u73a9",
  heroTitle1: "\u63a2\u7d22\u4e0b\u4e00\u6b3e",
  heroTitle2: "\u50b3\u5947\u904a\u6232",
  heroDesc1:
    "\u6578\u5343\u6b3e\u7db2\u9801\u904a\u6232\uff0c\u96f6\u4e0b\u8f09\u3001\u96f6\u7b49\u5f85\u3002\u5275\u4f5c\u8005\u53ef\u8f15\u9b06\u4e0a\u50b3\u4f5c\u54c1\uff0c\u73a9\u5bb6\u76e1\u60c5\u66a2\u73a9",
  heroDesc2: "\u9019\u662f\u4f60\u7684\u96fb\u7af6\u5b87\u5b99\u5165\u53e3\uff01",
  browseGames: "\u700f\u89bd\u71b1\u9580\u904a\u6232",
  uploadGame: "\u4e0a\u50b3\u4f60\u7684\u904a\u6232",
  exploreGames: "\u63a2\u7d22\u904a\u6232",
  featuredGames: "\u7cbe\u9078\u904a\u6232",
  gridDescAll: (sort: string) =>
    `\u4f9d\u300c${sort}\u300d\u6392\u5e8f \u00b7 \u4f86\u81ea Supabase \u7684\u793e\u7fa4\u4f5c\u54c1`,
  gridDescCategory: (category: string, sort: string) =>
    `\u300c${category}\u300d\u5206\u985e \u00b7 ${sort}`,
  emptyAll: "\u66ab\u7121\u904a\u6232",
  emptyCategory: (category: string) =>
    `\u300c${category}\u300d\u5206\u985e\u66ab\u7121\u4f5c\u54c1`,
  emptyHintAll:
    "\u6210\u70ba\u7b2c\u4e00\u4f4d\u4e0a\u50b3\u4f5c\u54c1\u7684\u5275\u4f5c\u8005\u5427\uff01",
  emptyHintCategory:
    "\u8a66\u8a66\u5176\u4ed6\u5206\u985e\uff0c\u6216\u4e0a\u50b3\u6b64\u985e\u578b\u7684\u4f5c\u54c1\u3002",
  viewAllCategories: "\u67e5\u770b\u5168\u90e8\u5206\u985e",
  uploadNewGame: "\u4e0a\u50b3\u65b0\u904a\u6232",
  communityRules: "\u793e\u7fa4\u5b88\u5247",
  footer: "\u00a9 2026 RainyNightFrog \u00b7 \u4fdd\u7559\u6240\u6709\u6b0a\u5229",
} as const;

import { FILTER_CATEGORIES } from "./games";

export const ALL_CATEGORY = FILTER_CATEGORIES[0];