import { ambientLocalDomain, isAmbientLocalEmail } from "@/lib/ambient-local-email";

export type VirtualPlayerLocale = "zh-HK" | "zh-CN" | "en";

export type VirtualPlayer = {
  id: string;
  displayName: string;
  locale: VirtualPlayerLocale;
};

/** 虛擬玩家名單（論壇種子、聊天室、排行榜訪客共用風格） */
export const VIRTUAL_PLAYERS: VirtualPlayer[] = [
  // 台港澳 · 繁體
  { id: "hk-01", displayName: "鐵甲船長", locale: "zh-HK" },
  { id: "hk-02", displayName: "星夜旅人", locale: "zh-HK" },
  { id: "hk-03", displayName: "迷宮探索者", locale: "zh-HK" },
  { id: "hk-04", displayName: "卡牌收集家", locale: "zh-HK" },
  { id: "hk-05", displayName: "霓虹浪子", locale: "zh-HK" },
  { id: "hk-06", displayName: "街機老手", locale: "zh-HK" },
  { id: "hk-07", displayName: "小雲打機", locale: "zh-HK" },
  { id: "hk-08", displayName: "小熊玩家", locale: "zh-HK" },
  { id: "hk-09", displayName: "練習模式中", locale: "zh-HK" },
  { id: "hk-10", displayName: "萌宅玩家", locale: "zh-HK" },
  { id: "hk-11", displayName: "涼風夜行", locale: "zh-HK" },
  { id: "hk-12", displayName: "茶餐廳玩家", locale: "zh-HK" },
  { id: "hk-13", displayName: "塔防愛好者", locale: "zh-HK" },
  { id: "hk-14", displayName: "夜班打手", locale: "zh-HK" },
  { id: "hk-15", displayName: "港島夜貓", locale: "zh-HK" },
  { id: "hk-16", displayName: "九龍街機王", locale: "zh-HK" },
  { id: "hk-17", displayName: "打機唔瞓", locale: "zh-HK" },
  { id: "hk-18", displayName: "懶係美德", locale: "zh-HK" },
  { id: "hk-19", displayName: "連勝邊緣", locale: "zh-HK" },
  { id: "hk-20", displayName: "節奏手指", locale: "zh-HK" },
  { id: "hk-21", displayName: "奶茶續命", locale: "zh-HK" },
  { id: "hk-22", displayName: "地圖收集狂", locale: "zh-HK" },
  { id: "hk-23", displayName: "新手保護期", locale: "zh-HK" },
  { id: "hk-24", displayName: "存檔強迫症", locale: "zh-HK" },
  { id: "hk-25", displayName: "雨夜青蛙友", locale: "zh-HK" },
  { id: "hk-26", displayName: "靜音模式", locale: "zh-HK" },
  { id: "hk-27", displayName: "排位受害者", locale: "zh-HK" },
  { id: "hk-28", displayName: "週末連玩", locale: "zh-HK" },
  { id: "hk-29", displayName: "隱藏路線控", locale: "zh-HK" },
  { id: "hk-30", displayName: "最後一命", locale: "zh-HK" },
  // 簡體
  { id: "cn-01", displayName: "打小是祖宗", locale: "zh-CN" },
  { id: "cn-02", displayName: "骑龟撵大象", locale: "zh-CN" },
  { id: "cn-03", displayName: "菜菜的诅咒", locale: "zh-CN" },
  { id: "cn-04", displayName: "辣条萌主", locale: "zh-CN" },
  { id: "cn-05", displayName: "葬魂_辉煌", locale: "zh-CN" },
  { id: "cn-06", displayName: "神经兮兮", locale: "zh-CN" },
  { id: "cn-07", displayName: "借口先生", locale: "zh-CN" },
  { id: "cn-08", displayName: "斌ルo", locale: "zh-CN" },
  { id: "cn-09", displayName: "墙角唱领悟", locale: "zh-CN" },
  { id: "cn-10", displayName: "杀手Boy", locale: "zh-CN" },
  { id: "cn-11", displayName: "Luce宿命", locale: "zh-CN" },
  { id: "cn-12", displayName: "独厮守", locale: "zh-CN" },
  { id: "cn-13", displayName: "Spore蹲街", locale: "zh-CN" },
  { id: "cn-14", displayName: "Smart子溢", locale: "zh-CN" },
  { id: "cn-15", displayName: "旧城失词", locale: "zh-CN" },
  { id: "cn-16", displayName: "血染残花", locale: "zh-CN" },
  { id: "cn-17", displayName: "Provence", locale: "zh-CN" },
  { id: "cn-18", displayName: "木槿暖夏", locale: "zh-CN" },
  { id: "cn-19", displayName: "莫不闻人世", locale: "zh-CN" },
  { id: "cn-20", displayName: "帝王傲世", locale: "zh-CN" },
  { id: "cn-21", displayName: "嘴馋小猫", locale: "zh-CN" },
  { id: "cn-22", displayName: "夜晚烛凉", locale: "zh-CN" },
  { id: "cn-23", displayName: "总被自己萌哭", locale: "zh-CN" },
  { id: "cn-24", displayName: "今晚不肝", locale: "zh-CN" },
  { id: "cn-25", displayName: "路过刷分", locale: "zh-CN" },
  { id: "cn-26", displayName: "咸鱼翻身中", locale: "zh-CN" },
  { id: "cn-27", displayName: "连跪七把", locale: "zh-CN" },
  { id: "cn-28", displayName: "咖啡续命人", locale: "zh-CN" },
  { id: "cn-29", displayName: "摸鱼战士", locale: "zh-CN" },
  { id: "cn-30", displayName: "地图钉子户", locale: "zh-CN" },
  { id: "cn-31", displayName: "节奏苦手", locale: "zh-CN" },
  { id: "cn-32", displayName: "氪金劝退", locale: "zh-CN" },
  { id: "cn-33", displayName: "深夜食堂客", locale: "zh-CN" },
  { id: "cn-34", displayName: "存档强迫症", locale: "zh-CN" },
  { id: "cn-35", displayName: "路过点赞党", locale: "zh-CN" },
  // 英文
  { id: "en-01", displayName: "Mana Lisa", locale: "en" },
  { id: "en-02", displayName: "Tank Sinatra", locale: "en" },
  { id: "en-03", displayName: "Shoutlistenme", locale: "en" },
  { id: "en-04", displayName: "Tonight", locale: "en" },
  { id: "en-05", displayName: "ObiWanKenobi", locale: "en" },
  { id: "en-06", displayName: "FollowMePls", locale: "en" },
  { id: "en-07", displayName: "Vengeance", locale: "en" },
  { id: "en-08", displayName: "Nights Aspect", locale: "en" },
  { id: "en-09", displayName: "Pretended", locale: "en" },
  { id: "en-10", displayName: "Shadowfax", locale: "en" },
  { id: "en-11", displayName: "BOOM SHAKA LAKA", locale: "en" },
  { id: "en-12", displayName: "Stormborn", locale: "en" },
  { id: "en-13", displayName: "Healium", locale: "en" },
  { id: "en-14", displayName: "LagMonster", locale: "en" },
  { id: "en-15", displayName: "PixelNomad", locale: "en" },
  { id: "en-16", displayName: "CoffeeCrit", locale: "en" },
  { id: "en-17", displayName: "SoftLock", locale: "en" },
  { id: "en-18", displayName: "QuietQueue", locale: "en" },
  { id: "en-19", displayName: "RetryLater", locale: "en" },
  { id: "en-20", displayName: "NeonCommuter", locale: "en" },
  { id: "en-21", displayName: "SaveScummer", locale: "en" },
  { id: "en-22", displayName: "BossPhase2", locale: "en" },
  { id: "en-23", displayName: "AFKButWatching", locale: "en" },
  { id: "en-24", displayName: "ComboBreaker", locale: "en" },
  { id: "en-25", displayName: "LootGoblin", locale: "en" },
  { id: "en-26", displayName: "SideQuestOnly", locale: "en" },
  { id: "en-27", displayName: "InputDelay", locale: "en" },
  { id: "en-28", displayName: "WarmupWarrior", locale: "en" },
  { id: "en-29", displayName: "PatchNotes", locale: "en" },
  { id: "en-30", displayName: "OneMoreRun", locale: "en" },
];

export const VIRTUAL_PLAYERS_BY_LOCALE: Record<
  VirtualPlayerLocale,
  VirtualPlayer[]
> = {
  "zh-HK": VIRTUAL_PLAYERS.filter((player) => player.locale === "zh-HK"),
  "zh-CN": VIRTUAL_PLAYERS.filter((player) => player.locale === "zh-CN"),
  en: VIRTUAL_PLAYERS.filter((player) => player.locale === "en"),
};

export function ambientBotEmail(playerId: string) {
  return `ambient.${playerId}@${ambientLocalDomain()}`;
}

export function ambientCreatorBotEmail(playerId: string) {
  return `ambient.creator.${playerId}@${ambientLocalDomain()}`;
}

export function getVirtualPlayerById(playerId: string) {
  return VIRTUAL_PLAYERS.find((player) => player.id === playerId) ?? null;
}

/** 通訊錄空白時推薦的虛擬玩家（方便直接發起私訊） */
export const VIRTUAL_CHAT_DISCOVER_IDS = [
  "hk-03",
  "hk-06",
  "hk-15",
  "hk-25",
  "cn-18",
  "cn-21",
  "cn-26",
  "cn-33",
  "en-05",
  "en-13",
  "en-20",
  "en-30",
] as const;

export function listVirtualChatDiscoverPlayers(): VirtualPlayer[] {
  return VIRTUAL_CHAT_DISCOVER_IDS.map((id) => getVirtualPlayerById(id)).filter(
    (player): player is VirtualPlayer => player != null
  );
}

export function parseAmbientPlayerIdFromEmail(
  email: string | null | undefined
): string | null {
  if (!email || !isAmbientLocalEmail(email)) return null;
  const localPart = email.split("@")[0] ?? "";
  if (localPart.startsWith("ambient.creator.")) {
    return localPart.slice("ambient.creator.".length) || null;
  }
  if (localPart.startsWith("ambient.")) {
    return localPart.slice("ambient.".length) || null;
  }
  return null;
}
