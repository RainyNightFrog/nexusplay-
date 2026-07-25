/**
 * 每日／每周任務多語系：資料庫存繁中 canonical，依 locale 轉成顯示文字。
 * 未列出的 code 維持原文。
 */

export type QuestCatalogEntry = {
  title: string;
  description: string;
};

const QUEST_CATALOG_EN: Record<string, QuestCatalogEntry> = {
  daily_play_3: {
    title: "Play 3 games",
    description:
      "Play at least 3 different games today (same game does not count twice)",
  },
  daily_quality_comment: {
    title: "Post a quality review",
    description: "Post at least 1 game review with 40+ characters",
  },
  daily_checkin: {
    title: "Daily check-in",
    description: "Sign in and open the quests panel today to complete",
  },
  daily_leaderboard: {
    title: "Submit a score",
    description: "Submit a score to any game leaderboard",
  },
  weekly_login_4: {
    title: "Log in 4 days",
    description: "Log in and trigger quests on at least 4 days this week",
  },
  weekly_tip_once: {
    title: "Tip a creator",
    description: "Complete at least 1 real tip this week",
  },
  weekly_achievements_2: {
    title: "Unlock 2 achievements",
    description: "Unlock any 2 achievements this week",
  },
};

const QUEST_CATALOG_ZH_CN: Record<string, QuestCatalogEntry> = {
  daily_play_3: {
    title: "游玩 3 款游戏",
    description: "今天游玩至少 3 款不同游戏（同款不重复计）",
  },
  daily_quality_comment: {
    title: "发布高质量评论",
    description: "发表至少 1 则长度 ≥ 40 字的游戏评论",
  },
  daily_checkin: {
    title: "每日签到",
    description: "今日登录并开启任务面板即可完成",
  },
  daily_leaderboard: {
    title: "冲榜一次",
    description: "向任一游戏排行榜提交分数",
  },
  weekly_login_4: {
    title: "跨 4 天登录游玩",
    description: "本周至少 4 天有登录并触发任务系统",
  },
  weekly_tip_once: {
    title: "打赏任一创作者",
    description: "本周完成至少 1 次真实打赏",
  },
  weekly_achievements_2: {
    title: "解锁 2 个成就",
    description: "本周新解锁任意 2 个成就",
  },
};

function isZhHk(locale: string) {
  const n = locale.toLowerCase();
  return n === "zh-hk" || n === "zh-tw";
}

function isZhCn(locale: string) {
  const n = locale.toLowerCase();
  return n === "zh-cn" || n === "zh";
}

export function localizeQuestByCode(
  code: string | null | undefined,
  locale: string,
  fallback?: { title?: string | null; description?: string | null }
): QuestCatalogEntry {
  const titleFallback = fallback?.title?.trim() || code || "";
  const descFallback = fallback?.description?.trim() || "";

  if (!code) {
    return { title: titleFallback, description: descFallback };
  }

  if (isZhHk(locale)) {
    return { title: titleFallback, description: descFallback };
  }

  if (isZhCn(locale)) {
    const zh = QUEST_CATALOG_ZH_CN[code];
    return {
      title: zh?.title ?? titleFallback,
      description: zh?.description ?? descFallback,
    };
  }

  const en = QUEST_CATALOG_EN[code];
  return {
    title: en?.title ?? titleFallback,
    description: en?.description ?? descFallback,
  };
}
