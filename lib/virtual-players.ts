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
];

export const VIRTUAL_PLAYERS_BY_LOCALE: Record<
  VirtualPlayerLocale,
  VirtualPlayer[]
> = {
  "zh-HK": VIRTUAL_PLAYERS.filter((player) => player.locale === "zh-HK"),
  "zh-CN": VIRTUAL_PLAYERS.filter((player) => player.locale === "zh-CN"),
  en: VIRTUAL_PLAYERS.filter((player) => player.locale === "en"),
};

import { ambientLocalDomain, isAmbientLocalEmail } from "@/lib/ambient-local-email";

export function ambientBotEmail(playerId: string) {
  return `ambient.${playerId}@${ambientLocalDomain()}`;
}

export function ambientCreatorBotEmail(playerId: string) {
  return `ambient.creator.${playerId}@${ambientLocalDomain()}`;
}

export function getVirtualPlayerById(playerId: string) {
  return VIRTUAL_PLAYERS.find((player) => player.id === playerId) ?? null;
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
