export type VirtualPlayerLocale = "zh-HK" | "zh-CN" | "en";

export type VirtualPlayer = {
  id: string;
  displayName: string;
  locale: VirtualPlayerLocale;
};

/** 虛擬玩家名單（論壇種子、聊天室、排行榜訪客共用風格） */
export const VIRTUAL_PLAYERS: VirtualPlayer[] = [
  // 台港澳 · 繁體
  { id: "hk-01", displayName: "鐵鳩船長", locale: "zh-HK" },
  { id: "hk-02", displayName: "瀉乳淫僧", locale: "zh-HK" },
  { id: "hk-03", displayName: "借叔一簫", locale: "zh-HK" },
  { id: "hk-04", displayName: "全職賭撚", locale: "zh-HK" },
  { id: "hk-05", displayName: "陳冠希", locale: "zh-HK" },
  { id: "hk-06", displayName: "旺角揸Fit人", locale: "zh-HK" },
  { id: "hk-07", displayName: "蠟筆小新", locale: "zh-HK" },
  { id: "hk-08", displayName: "伊莎Bear", locale: "zh-HK" },
  { id: "hk-09", displayName: "硬之練膠術師", locale: "zh-HK" },
  { id: "hk-10", displayName: "毒者萌宅", locale: "zh-HK" },
  { id: "hk-11", displayName: "長崎涼美", locale: "zh-HK" },
  { id: "hk-12", displayName: "你今日食左未", locale: "zh-HK" },
  { id: "hk-13", displayName: "哈姆亂太郎", locale: "zh-HK" },
  // 簡體
  { id: "cn-01", displayName: "打小是祖宗", locale: "zh-CN" },
  { id: "cn-02", displayName: "骑龟撵大象", locale: "zh-CN" },
  { id: "cn-03", displayName: "、菜菜的诅咒", locale: "zh-CN" },
  { id: "cn-04", displayName: "辣条萌主", locale: "zh-CN" },
  { id: "cn-05", displayName: "葬魂_辉煌", locale: "zh-CN" },
  { id: "cn-06", displayName: "神经◇兮兮", locale: "zh-CN" },
  { id: "cn-07", displayName: "Excuses° // 借口 ∝", locale: "zh-CN" },
  { id: "cn-08", displayName: "╬═☆斌ルo", locale: "zh-CN" },
  { id: "cn-09", displayName: "蹲在墙角唱领悟", locale: "zh-CN" },
  { id: "cn-10", displayName: "权♀杀手Boy", locale: "zh-CN" },
  { id: "cn-11", displayName: "Luce 〃典当半世宿命", locale: "zh-CN" },
  { id: "cn-12", displayName: "One、Life 独厮守 ぢ.", locale: "zh-CN" },
  { id: "cn-13", displayName: "Spore丿蹲街", locale: "zh-CN" },
  { id: "cn-14", displayName: "Smart丶子溢", locale: "zh-CN" },
  { id: "cn-15", displayName: "旧城失词‖soul ≈", locale: "zh-CN" },
  { id: "cn-16", displayName: "血染丶残花", locale: "zh-CN" },
  { id: "cn-17", displayName: "若凌° Provence -", locale: "zh-CN" },
  { id: "cn-18", displayName: "木槿暖夏", locale: "zh-CN" },
  { id: "cn-19", displayName: "乄莫╮不闻人世", locale: "zh-CN" },
  { id: "cn-20", displayName: "帝王傲世", locale: "zh-CN" },
  { id: "cn-21", displayName: "嘴馋の小猫", locale: "zh-CN" },
  { id: "cn-22", displayName: "夜晚ツ烛凉", locale: "zh-CN" },
  { id: "cn-23", displayName: "总被自己萌哭", locale: "zh-CN" },
  // 英文
  { id: "en-01", displayName: "Mana Lisa", locale: "en" },
  { id: "en-02", displayName: "Tank Sinatra", locale: "en" },
  { id: "en-03", displayName: "Shout~listenme", locale: "en" },
  { id: "en-04", displayName: "Tonightゝ", locale: "en" },
  { id: "en-05", displayName: "ObiWanKenobi", locale: "en" },
  { id: "en-06", displayName: "BABY follow me!!", locale: "en" },
  { id: "en-07", displayName: "Vengeance", locale: "en" },
  { id: "en-08", displayName: "Night's Aspect", locale: "en" },
  { id: "en-09", displayName: "■□゛Pretended", locale: "en" },
  { id: "en-10", displayName: "Shadowfax", locale: "en" },
  { id: "en-11", displayName: "BOOM SHAKA LAKA", locale: "en" },
  { id: "en-12", displayName: "Stormborn", locale: "en" },
  { id: "en-13", displayName: "Healium", locale: "en" },
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
  return `ambient.${playerId}@nexusplay.local`;
}

export function ambientCreatorBotEmail(playerId: string) {
  return `ambient.creator.${playerId}@nexusplay.local`;
}

export function getVirtualPlayerById(playerId: string) {
  return VIRTUAL_PLAYERS.find((player) => player.id === playerId) ?? null;
}

export function parseAmbientPlayerIdFromEmail(
  email: string | null | undefined
): string | null {
  if (!email?.endsWith("@nexusplay.local")) return null;
  const localPart = email.split("@")[0] ?? "";
  if (localPart.startsWith("ambient.creator.")) {
    return localPart.slice("ambient.creator.".length) || null;
  }
  if (localPart.startsWith("ambient.")) {
    return localPart.slice("ambient.".length) || null;
  }
  return null;
}
