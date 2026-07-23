/**
 * 成就多語系：優先用 code；虛擬玩家亮點用繁中標題查表。
 */

export type AchievementCatalogEntry = {
  title: string;
  description: string;
};

const ACHIEVEMENT_CATALOG_EN: Record<string, AchievementCatalogEntry> = {
  big_tipper: {
    title: "Big Tipper",
    description:
      "Tipped HK$100 total—put your support behind creators you love.",
  },
  big_tipper_500: {
    title: "Golden Patron",
    description: "Tipped HK$500 total—a creator's guardian angel.",
  },
  chat_legend: {
    title: "Speech Legend",
    description:
      "Posted 1,000 messages in chat—the community wouldn't be the same without you.",
  },
  chat_regular: {
    title: "Chat Regular",
    description: "Posted 50 messages in chat—you keep the community buzzing.",
  },
  chat_veteran: {
    title: "Chatroom Soul",
    description: "Posted 200 messages in chat.",
  },
  cloud_save_1: {
    title: "Cloud Traveler",
    description:
      "Used cloud save for the first time—never lose your progress again.",
  },
  cloud_save_5: {
    title: "Save Collector",
    description: "Left cloud saves in 5 different games.",
  },
  comments_25: {
    title: "Sharp Critic",
    description: "Posted 25 game reviews in total.",
  },
  creator_3_games: {
    title: "Prolific Creator",
    description: "Published 3 public games—creativity that keeps flowing.",
  },
  creator_5_games: {
    title: "Studio Lead",
    description: "Published 5 public games—you're running a studio now.",
  },
  creator_comments_50: {
    title: "Hype Engine",
    description: "Your works have received 50 player reviews in total.",
  },
  creator_community: {
    title: "Community Voice",
    description: "Your works have received 10 player reviews in total.",
  },
  creator_debut: {
    title: "Creator Debut",
    description:
      "Published your first public game and officially joined the creator ranks.",
  },
  creator_first_tip: {
    title: "First Gold",
    description: "Received your first tip from a player.",
  },
  creator_plays_10k: {
    title: "Spotlight",
    description: "Your public works have reached 10,000 total plays.",
  },
  creator_plays_1k: {
    title: "Thousand Fans",
    description: "Your public works have reached 1,000 total plays.",
  },
  creator_tips_10: {
    title: "Steady Goldflow",
    description: "Received 10 tips from players in total.",
  },
  creator_tips_50: {
    title: "Tip Magnet",
    description: "Received 50 tips from players in total.",
  },
  donation_starter: {
    title: "Small Supporter",
    description: "Made your first tip to show a creator your appreciation.",
  },
  favorites_20: {
    title: "Collection Master",
    description: "Favorited 20 games you love.",
  },
  favorites_5: {
    title: "Collector",
    description:
      "Favorited 5 games you love and started your personal library.",
  },
  first_comment: {
    title: "First Comment",
    description: "Posted your first game review.",
  },
  first_purchase: {
    title: "Paying Player",
    description:
      "Bought your first paid game—supporting creators with real money.",
  },
  first_win: {
    title: "First Victory",
    description:
      "Earned your first win on the leaderboard (clear/win tier)—your adventure begins.",
  },
  followed_10: {
    title: "Popular Creator",
    description: "Gained 10 followers in total.",
  },
  followed_50: {
    title: "Star Creator",
    description: "Gained 50 followers—your fan base is taking shape.",
  },
  follows_20: {
    title: "Star Scout",
    description: "Followed 20 creators.",
  },
  follows_5: {
    title: "Talent Scout",
    description: "Followed 5 creators—backing the talent you believe in.",
  },
  forum_debut: {
    title: "Forum Rising Star",
    description: "Posted your first thread on the community forum.",
  },
  forum_regular: {
    title: "Forum Elder",
    description: "Posted 10 threads on the community forum in total.",
  },
  forum_replies_50: {
    title: "Reply Master",
    description: "Posted 50 replies on the forum in total.",
  },
  games_played_15: {
    title: "Ten-Thousand Traveler",
    description: "Played 15 different games and left leaderboard records.",
  },
  games_played_30: {
    title: "World Explorer",
    description:
      "Played 30 different games and left leaderboard records—your footprint spans the platform.",
  },
  games_played_5: {
    title: "Versatile Player",
    description:
      "Played 5 different games and left leaderboard records—always ready to explore.",
  },
  leaderboard_10: {
    title: "Arena Regular",
    description: "Submitted leaderboard scores 10 times in total.",
  },
  leaderboard_50: {
    title: "Leaderboard Fanatic",
    description: "Submitted leaderboard scores 50 times in total.",
  },
  leaderboard_submit: {
    title: "On the Board",
    description:
      "Submitted a score to a game leaderboard for the first time—your competitive journey starts here.",
  },
  night_owl: {
    title: "Night Owl",
    description:
      "Spent 10 hours online between 2:00–5:00 AM (Hong Kong time)—the night is your battlefield.",
  },
  night_owl_50h: {
    title: "Endless Dark",
    description:
      "Spent 50 hours online between 2:00–5:00 AM—ruler of the dark hours.",
  },
  online_100h: {
    title: "Always Online",
    description: "Spent 100 hours online in total—you never left the screen.",
  },
  online_10h: {
    title: "Online Regular",
    description:
      "Spent 10 hours online in total—RainyNightFrog is your second home.",
  },
  online_50h: {
    title: "Resident Elder",
    description:
      "Spent 50 hours online in total—RainyNightFrog is practically your second home.",
  },
  patron_10: {
    title: "Library Curator",
    description:
      "Own licenses for 10 paid games—your private library is taking shape.",
  },
  patron_3: {
    title: "Veteran Buyer",
    description: "Own licenses for 3 paid games.",
  },
  playtime_100h: {
    title: "Time Devourer",
    description: "Played for 100 hours in total—time means nothing to you.",
  },
  playtime_10h: {
    title: "Immersed Player",
    description: "Played for 10 hours in total—you're completely hooked.",
  },
  playtime_1h: {
    title: "Newcomer",
    description: "Played for 1 hour in total—your adventure officially begins.",
  },
  playtime_50h: {
    title: "Legendary Grinder",
    description: "Played for 50 hours in total—a true hardcore player.",
  },
  profile_complete: {
    title: "Perfect Profile",
    description:
      "Set a display name and add at least one of: avatar, bio, or support email.",
  },
  s_rank_clear: {
    title: "Perfectionist",
    description: "Left an S-rank (or higher) score on any game leaderboard.",
  },
  social_butterfly: {
    title: "Social Butterfly",
    description: "50 total interactions across reviews, forum, and chat.",
  },
  social_legend: {
    title: "Social Royalty",
    description: "300 total interactions across reviews, forum, and chat.",
  },
  tip_creators_15: {
    title: "Patron Angel",
    description: "Tipped 15 different creators.",
  },
  tip_creators_5: {
    title: "Networker",
    description: "Tipped 5 different creators.",
  },
  veteran_30d: {
    title: "Veteran Player",
    description:
      "Joined RainyNightFrog 30 days ago—watching the platform grow.",
  },
  veteran_365d: {
    title: "Year Pact",
    description: "Joined 365 days ago—a full year on the platform.",
  },
  veteran_90d: {
    title: "Seasoned Elder",
    description: "Joined RainyNightFrog 90 days ago.",
  },
  win_collector: {
    title: "Win Collector",
    description: "Achieved 5 win results on leaderboards (clear/win tier).",
  },
  win_legend: {
    title: "Undefeated General",
    description: "Achieved 100 win results on leaderboards—a legendary record.",
  },
  win_master: {
    title: "Battle Veteran",
    description:
      "Achieved 25 win results on leaderboards—skill you can't measure.",
  },
};

const TITLE_EN_BY_ZH: Record<string, string> = {
  打賞大戶: "Big Tipper",
  金主降臨: "Golden Patron",
  話術傳奇: "Speech Legend",
  聊天室常客: "Chat Regular",
  聊天室之魂: "Chatroom Soul",
  雲端旅人: "Cloud Traveler",
  存檔收藏家: "Save Collector",
  銳評家: "Sharp Critic",
  多產創作者: "Prolific Creator",
  工作室主理人: "Studio Lead",
  口碑製造機: "Hype Engine",
  社群之聲: "Community Voice",
  創作者首發: "Creator Debut",
  第一桶金: "First Gold",
  萬人焦點: "Spotlight",
  破千人氣: "Thousand Fans",
  金流不斷: "Steady Goldflow",
  打賞磁鐵: "Tip Magnet",
  小小支持者: "Small Supporter",
  收藏大師: "Collection Master",
  收藏家: "Collector",
  初試啼聲: "First Comment",
  付費玩家: "Paying Player",
  全站首勝: "First Victory",
  人氣創作者: "Popular Creator",
  明星創作者: "Star Creator",
  星探: "Star Scout",
  伯樂識才: "Talent Scout",
  論壇新星: "Forum Rising Star",
  論壇元老: "Forum Elder",
  回覆大師: "Reply Master",
  萬遊旅人: "Ten-Thousand Traveler",
  全境探索者: "World Explorer",
  多棲玩家: "Versatile Player",
  競技常客: "Arena Regular",
  榜單狂熱者: "Leaderboard Fanatic",
  榜上有名: "On the Board",
  夜貓子玩家: "Night Owl",
  永恆暗夜: "Endless Dark",
  永遠在線: "Always Online",
  線上常客: "Online Regular",
  常駐元老: "Resident Elder",
  圖書館館長: "Library Curator",
  資深買家: "Veteran Buyer",
  時間吞噬者: "Time Devourer",
  沉浸玩家: "Immersed Player",
  初入江湖: "Newcomer",
  傳奇肝帝: "Legendary Grinder",
  完美檔案: "Perfect Profile",
  完美主義者: "Perfectionist",
  社交流浪者: "Social Butterfly",
  社交帝王: "Social Royalty",
  贊助天使: "Patron Angel",
  廣結善緣: "Networker",
  資深玩家: "Veteran Player",
  一年之約: "Year Pact",
  季度元老: "Seasoned Elder",
  勝場收集者: "Win Collector",
  常勝將軍: "Undefeated General",
  百戰猛將: "Battle Veteran",
  初次勝利: "First Victory",
  論壇新手: "Forum Newbie",
  夜貓子: "Night Owl",
  收藏愛好者: "Collection Fan",
  連勝入門: "Win Streak Starter",
  社交蝴蝶: "Social Butterfly",
  創作起步: "Creator Start",
  打賞支持者: "Tip Supporter",
  排行榜常客: "Leaderboard Regular",
  平台元老: "Platform Elder",
};

const TITLE_ZH_CN_BY_ZH: Record<string, string> = {
  打賞大戶: "打赏大户",
  金主降臨: "金主降临",
  話術傳奇: "话术传奇",
  聊天室常客: "聊天室常客",
  聊天室之魂: "聊天室之魂",
  雲端旅人: "云端旅人",
  存檔收藏家: "存档收藏家",
  銳評家: "锐评家",
  多產創作者: "多产创作者",
  工作室主理人: "工作室主理人",
  口碑製造機: "口碑制造机",
  社群之聲: "社群之声",
  創作者首發: "创作者首发",
  第一桶金: "第一桶金",
  萬人焦點: "万人焦点",
  破千人氣: "破千人气",
  金流不斷: "金流不断",
  打賞磁鐵: "打赏磁铁",
  小小支持者: "小小支持者",
  收藏大師: "收藏大师",
  收藏家: "收藏家",
  初試啼聲: "初试啼声",
  付費玩家: "付费玩家",
  全站首勝: "全站首胜",
  人氣創作者: "人气创作者",
  明星創作者: "明星创作者",
  星探: "星探",
  伯樂識才: "伯乐识才",
  論壇新星: "论坛新星",
  論壇元老: "论坛元老",
  回覆大師: "回复大师",
  萬遊旅人: "万游旅人",
  全境探索者: "全境探索者",
  多棲玩家: "多栖玩家",
  競技常客: "竞技常客",
  榜單狂熱者: "榜单狂热者",
  榜上有名: "榜上有名",
  夜貓子玩家: "夜猫子玩家",
  永恆暗夜: "永恒暗夜",
  永遠在線: "永远在线",
  線上常客: "线上常客",
  常駐元老: "常驻元老",
  圖書館館長: "图书馆馆长",
  資深買家: "资深买家",
  時間吞噬者: "时间吞噬者",
  沉浸玩家: "沉浸玩家",
  初入江湖: "初入江湖",
  傳奇肝帝: "传奇肝帝",
  完美檔案: "完美档案",
  完美主義者: "完美主义者",
  社交流浪者: "社交流浪者",
  社交帝王: "社交帝王",
  贊助天使: "赞助天使",
  廣結善緣: "广结善缘",
  資深玩家: "资深玩家",
  一年之約: "一年之约",
  季度元老: "季度元老",
  勝場收集者: "胜场收集者",
  常勝將軍: "常胜将军",
  百戰猛將: "百战猛将",
  初次勝利: "初次胜利",
  論壇新手: "论坛新手",
  夜貓子: "夜猫子",
  收藏愛好者: "收藏爱好者",
  連勝入門: "连胜入门",
  社交蝴蝶: "社交蝴蝶",
  創作起步: "创作起步",
  打賞支持者: "打赏支持者",
  排行榜常客: "排行榜常客",
  平台元老: "平台元老",
};

const DESC_ZH_CN_BY_CODE: Record<string, string> = {
  big_tipper: "累计打赏达 HK$100，用行动支持喜爱的创作者。",
  big_tipper_500: "累计打赏达 HK$500，创作者的守护神。",
  chat_legend: "在聊天室累计发言 1000 次，社群离不开你。",
  chat_regular: "在聊天室累计发言 50 次，社群因你而热闹。",
  chat_veteran: "在聊天室累计发言 200 次。",
  cloud_save_1: "首次使用云端存档，进度永不丢失。",
  cloud_save_5: "在 5 款不同游戏留下云端存档。",
  comments_25: "累计发表 25 则游戏评论。",
  creator_3_games: "发布 3 款公开游戏，创意源源不绝。",
  creator_5_games: "发布 5 款公开游戏，已成创作工作室规模。",
  creator_comments_50: "作品累计收到 50 则玩家评论。",
  creator_community: "你的作品累计收到 10 则玩家评论。",
  creator_debut: "发布你的第一款公开游戏，正式加入创作者行列。",
  creator_first_tip: "收到玩家的第一笔打赏支持。",
  creator_plays_10k: "你的公开作品累计游玩次数达 10,000。",
  creator_plays_1k: "你的公开作品累计游玩次数达 1,000。",
  creator_tips_10: "累计收到 10 笔玩家打赏。",
  creator_tips_50: "累计收到 50 笔玩家打赏。",
  donation_starter: "完成第一笔打赏，向创作者表达感谢。",
  favorites_20: "收藏 20 款喜爱的游戏。",
  favorites_5: "收藏 5 款喜爱的游戏，建立专属游戏库。",
  first_comment: "发表你的第一则游戏评论。",
  first_purchase: "购买第一款付费游戏，用真金白银支持创作。",
  first_win: "在排行榜达成第一次胜利判定（通关／获胜等级），踏上冒险之路。",
  followed_10: "累计获得 10 位追踪者。",
  followed_50: "累计获得 50 位追踪者，粉丝团成形。",
  follows_20: "追踪 20 位创作者。",
  follows_5: "追踪 5 位创作者，支持你看好的人才。",
  forum_debut: "在社群论坛发表第一篇贴文。",
  forum_regular: "在社群论坛累计发表 10 篇贴文。",
  forum_replies_50: "在论坛累计回复 50 则留言。",
  games_played_15: "体验 15 款不同游戏并留下排行榜纪录。",
  games_played_30: "体验 30 款不同游戏并留下排行榜纪录，足迹遍布平台。",
  games_played_5: "体验 5 款不同游戏并留下排行榜纪录，展现探索精神。",
  leaderboard_10: "累计提交排行榜成绩达 10 次。",
  leaderboard_50: "累计提交排行榜成绩达 50 次。",
  leaderboard_submit: "首次向游戏排行榜提交分数，竞技之路从此开始。",
  night_owl:
    "在凌晨 2:00–5:00（香港时间）累计上线达 10 小时，黑夜是你的战场。",
  night_owl_50h: "凌晨 2:00–5:00 累计上线达 50 小时，暗夜之主。",
  online_100h: "累计上线达 100 小时，屏幕前的身影从未消失。",
  online_10h: "累计上线达 10 小时，RainyNightFrog 是你第二个家。",
  online_50h: "累计上线达 50 小时，RainyNightFrog 几乎是你的第二个家。",
  patron_10: "拥有 10 款付费游戏授权，私人游戏库成形。",
  patron_3: "拥有 3 款付费游戏授权。",
  playtime_100h: "累计游玩达 100 小时，时间对你毫无意义。",
  playtime_10h: "累计游玩达 10 小时，已无法自拔。",
  playtime_1h: "累计游玩达 1 小时，正式踏上冒险旅程。",
  playtime_50h: "累计游玩达 50 小时，真正的硬核玩家。",
  profile_complete: "填写显示名称，并加上头像、个人简介或支持信箱其中一项。",
  s_rank_clear: "在任一游戏排行榜留下 S 级（或以上）成绩。",
  social_butterfly: "评论、论坛与聊天累计互动达 50 次。",
  social_legend: "评论、论坛与聊天累计互动达 300 次。",
  tip_creators_15: "向 15 位不同创作者完成打赏。",
  tip_creators_5: "向 5 位不同创作者完成打赏。",
  veteran_30d: "加入 RainyNightFrog 满 30 天，见证平台成长。",
  veteran_365d: "加入满 365 天，与平台共度一整年。",
  veteran_90d: "加入 RainyNightFrog 满 90 天。",
  win_collector: "在排行榜累计达成 5 次胜利判定（通关／获胜等级）。",
  win_legend: "在排行榜累计达成 100 次胜利判定，传说级战绩。",
  win_master: "在排行榜累计达成 25 次胜利判定，实力深不可测。",
};

function isZhHk(locale: string) {
  const n = locale.toLowerCase();
  return n === "zh-hk" || n === "zh-tw";
}

function isZhCn(locale: string) {
  const n = locale.toLowerCase();
  return n === "zh-cn" || n === "zh";
}

export function localizeAchievementByCode(
  code: string | null | undefined,
  locale: string,
  fallback?: { title?: string | null; description?: string | null }
): AchievementCatalogEntry {
  const titleFallback = fallback?.title?.trim() || code || "";
  const descFallback = fallback?.description?.trim() || "";

  if (!code) {
    return {
      title: localizeAchievementTitle(titleFallback, locale),
      description: descFallback,
    };
  }

  if (isZhHk(locale)) {
    return { title: titleFallback, description: descFallback };
  }

  if (isZhCn(locale)) {
    return {
      title: TITLE_ZH_CN_BY_ZH[titleFallback] ?? titleFallback,
      description: DESC_ZH_CN_BY_CODE[code] ?? descFallback,
    };
  }

  const en = ACHIEVEMENT_CATALOG_EN[code];
  return {
    title: en?.title ?? localizeAchievementTitle(titleFallback, locale),
    description: en?.description ?? descFallback,
  };
}

export function localizeAchievementTitle(
  title: string | null | undefined,
  locale: string
): string {
  if (!title) return "";
  if (isZhHk(locale)) return title;
  if (isZhCn(locale)) return TITLE_ZH_CN_BY_ZH[title] ?? title;
  return TITLE_EN_BY_ZH[title] ?? title;
}
