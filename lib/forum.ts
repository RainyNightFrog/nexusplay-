export type ForumCategory = "general" | "bug" | "feedback" | "guide";

export type ForumPostRecord = {
  id: number;
  game_id: number;
  user_id: string;
  title: string;
  category: ForumCategory;
  content: string;
  created_at: string;
};

export type ForumCommentRecord = {
  id: number;
  post_id: number;
  user_id: string;
  content: string;
  created_at: string;
};

export type ForumPost = ForumPostRecord & {
  author_name: string;
  comment_count?: number;
};

export type ForumPostWithGame = ForumPost & {
  game_title?: string;
};

export type ForumComment = ForumCommentRecord & {
  author_name: string;
};

export const FORUM_CATEGORIES: {
  value: ForumCategory;
  label: string;
  emoji: string;
  badgeClass: string;
}[] = [
  {
    value: "general",
    label: "綜合討論",
    emoji: "💬",
    badgeClass:
      "bg-sky-500/15 text-sky-300 ring-sky-500/30 border-sky-500/20",
  },
  {
    value: "bug",
    label: "Bug 回報",
    emoji: "🐛",
    badgeClass:
      "bg-rose-500/15 text-rose-300 ring-rose-500/30 border-rose-500/20",
  },
  {
    value: "feedback",
    label: "建議反饋",
    emoji: "💡",
    badgeClass:
      "bg-amber-500/15 text-amber-300 ring-amber-500/30 border-amber-500/20",
  },
  {
    value: "guide",
    label: "攻略心得",
    emoji: "🏆",
    badgeClass:
      "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30 border-emerald-500/20",
  },
];

export const VALID_FORUM_CATEGORIES = FORUM_CATEGORIES.map((c) => c.value);

export function getForumCategoryMeta(category: string) {
  return (
    FORUM_CATEGORIES.find((item) => item.value === category) ??
    FORUM_CATEGORIES[0]
  );
}

export function formatForumAuthor(userId: string, displayName?: string | null) {
  if (displayName?.trim()) return displayName.trim();
  return `匿名玩家#${userId.replace(/-/g, "").slice(0, 6).toUpperCase()}`;
}

export function formatForumDate(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString("zh-TW", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export const FORUM_LIMITS = {
  title: 120,
  content: 4000,
  comment: 2000,
} as const;
