export type ForumCategory =
  | "general"
  | "bug"
  | "feedback"
  | "guide"
  | "question"
  | "showcase"
  | "review"
  | "multiplayer"
  | "meme"
  | "lore"
  | "speedrun"
  | "update";

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
  accentClass: string;
}[] = [
  {
    value: "general",
    label: "綜合討論",
    emoji: "💬",
    badgeClass:
      "bg-sky-500/15 text-sky-300 ring-sky-500/30 border-sky-500/20",
    accentClass: "border-l-sky-400",
  },
  {
    value: "question",
    label: "求助提問",
    emoji: "❓",
    badgeClass:
      "bg-violet-500/15 text-violet-300 ring-violet-500/30 border-violet-500/20",
    accentClass: "border-l-violet-400",
  },
  {
    value: "guide",
    label: "攻略心得",
    emoji: "🏆",
    badgeClass:
      "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30 border-emerald-500/20",
    accentClass: "border-l-emerald-400",
  },
  {
    value: "showcase",
    label: "精彩分享",
    emoji: "📸",
    badgeClass:
      "bg-fuchsia-500/15 text-fuchsia-300 ring-fuchsia-500/30 border-fuchsia-500/20",
    accentClass: "border-l-fuchsia-400",
  },
  {
    value: "review",
    label: "遊戲評價",
    emoji: "⭐",
    badgeClass:
      "bg-yellow-500/15 text-yellow-300 ring-yellow-500/30 border-yellow-500/20",
    accentClass: "border-l-yellow-400",
  },
  {
    value: "feedback",
    label: "建議反饋",
    emoji: "💡",
    badgeClass:
      "bg-amber-500/15 text-amber-300 ring-amber-500/30 border-amber-500/20",
    accentClass: "border-l-amber-400",
  },
  {
    value: "bug",
    label: "Bug 回報",
    emoji: "🐛",
    badgeClass:
      "bg-rose-500/15 text-rose-300 ring-rose-500/30 border-rose-500/20",
    accentClass: "border-l-rose-400",
  },
  {
    value: "multiplayer",
    label: "組隊交友",
    emoji: "👥",
    badgeClass:
      "bg-cyan-500/15 text-cyan-300 ring-cyan-500/30 border-cyan-500/20",
    accentClass: "border-l-cyan-400",
  },
  {
    value: "lore",
    label: "劇情世界觀",
    emoji: "📖",
    badgeClass:
      "bg-indigo-500/15 text-indigo-300 ring-indigo-500/30 border-indigo-500/20",
    accentClass: "border-l-indigo-400",
  },
  {
    value: "speedrun",
    label: "競速挑戰",
    emoji: "⚡",
    badgeClass:
      "bg-orange-500/15 text-orange-300 ring-orange-500/30 border-orange-500/20",
    accentClass: "border-l-orange-400",
  },
  {
    value: "meme",
    label: "趣味梗圖",
    emoji: "😂",
    badgeClass:
      "bg-lime-500/15 text-lime-300 ring-lime-500/30 border-lime-500/20",
    accentClass: "border-l-lime-400",
  },
  {
    value: "update",
    label: "版本動態",
    emoji: "🔔",
    badgeClass:
      "bg-blue-500/15 text-blue-300 ring-blue-500/30 border-blue-500/20",
    accentClass: "border-l-blue-400",
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
