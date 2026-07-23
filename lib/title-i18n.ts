/**
 * 稱號顯示名多語系：資料庫存繁中 canonical name，依 locale 轉成對應顯示文字。
 * 未列出的名稱維持原文。
 */

const TITLE_NAME_EN: Record<string, string> = {
  "AP 先驅": "AP Pioneer",
  RainyNightFrog: "RainyNightFrog",
  一年之約: "Year Pact",
  人氣創作者: "Popular Creator",
  人氣新星: "Rising Star",
  付費玩家: "Paying Player",
  伯樂識才: "Talent Scout",
  傳奇肝帝: "Legendary Grinder",
  全境探索者: "World Explorer",
  初評者: "First Reviewer",
  創作大師: "Master Creator",
  勝場獵人: "Win Hunter",
  口碑製造機: "Hype Engine",
  回覆大師: "Reply Master",
  圖書館館長: "Library Curator",
  存檔收藏家: "Save Collector",
  季度元老: "Seasoned Elder",
  完美主義者: "Perfectionist",
  完美形象: "Perfect Image",
  工作室主理人: "Studio Lead",
  常勝將軍: "Undefeated General",
  常駐元老: "Resident Elder",
  常駐玩家: "Regular Player",
  平台支持者: "Platform Supporter",
  廣結善緣: "Networker",
  慷慨贊助人: "Generous Patron",
  打賞磁鐵: "Tip Magnet",
  收藏大師: "Collection Master",
  新手冒險者: "Novice Adventurer",
  明星創作者: "Star Creator",
  星探: "Star Scout",
  時間吞噬者: "Time Devourer",
  暖心支持: "Warm Supporter",
  榜單狂熱者: "Leaderboard Fanatic",
  永夜傳說: "Eternal Night Legend",
  永恆暗夜: "Endless Dark",
  永遠在線: "Always Online",
  江湖新秀: "Rookie of the Realm",
  沉浸冒險家: "Immersed Adventurer",
  熱心支持者: "Passionate Supporter",
  珍藏家: "Treasure Keeper",
  百戰猛將: "Battle Veteran",
  百遊行者: "Hundred-Game Walker",
  破千人氣: "Thousand Fans",
  社交帝王: "Social Royalty",
  社交達人: "Social Ace",
  社群之聲: "Community Voice",
  萬人焦點: "Spotlight",
  萬遊旅人: "Ten-Thousand Traveler",
  競技常客: "Arena Regular",
  競技新秀: "Arena Rookie",
  聊天室之魂: "Chatroom Soul",
  話癆達人: "Chatty Ace",
  話術傳奇: "Speech Legend",
  論壇元老: "Forum Elder",
  論壇新秀: "Forum Rookie",
  資深老兵: "Seasoned Veteran",
  資深買家: "Veteran Buyer",
  贊助天使: "Patron Angel",
  金主降臨: "Golden Patron",
  金流不斷: "Steady Goldflow",
  銳評家: "Sharp Critic",
  閃耀創作者: "Shining Creator",
  雲端旅人: "Cloud Traveler",
  霓虹旅人: "Neon Traveler",
  點數帝王: "AP Emperor",
  // 虛擬玩家專用
  排行榜常客: "Leaderboard Regular",
};

/** 簡體顯示（與繁中不同者） */
const TITLE_NAME_ZH_CN: Record<string, string> = {
  "AP 先驅": "AP 先驱",
  一年之約: "一年之约",
  人氣創作者: "人气创作者",
  人氣新星: "人气新星",
  付費玩家: "付费玩家",
  伯樂識才: "伯乐识才",
  傳奇肝帝: "传奇肝帝",
  全境探索者: "全境探索者",
  初評者: "初评者",
  創作大師: "创作大师",
  勝場獵人: "胜场猎人",
  口碑製造機: "口碑制造机",
  回覆大師: "回复大师",
  圖書館館長: "图书馆馆长",
  存檔收藏家: "存档收藏家",
  季度元老: "季度元老",
  完美主義者: "完美主义者",
  完美形象: "完美形象",
  工作室主理人: "工作室主理人",
  常勝將軍: "常胜将军",
  常駐元老: "常驻元老",
  常駐玩家: "常驻玩家",
  平台支持者: "平台支持者",
  廣結善緣: "广结善缘",
  慷慨贊助人: "慷慨赞助人",
  打賞磁鐵: "打赏磁铁",
  收藏大師: "收藏大师",
  新手冒險者: "新手冒险者",
  明星創作者: "明星创作者",
  星探: "星探",
  時間吞噬者: "时间吞噬者",
  暖心支持: "暖心支持",
  榜單狂熱者: "榜单狂热者",
  永夜傳說: "永夜传说",
  永恆暗夜: "永恒暗夜",
  永遠在線: "永远在线",
  江湖新秀: "江湖新秀",
  沉浸冒險家: "沉浸冒险家",
  熱心支持者: "热心支持者",
  珍藏家: "珍藏家",
  百戰猛將: "百战猛将",
  百遊行者: "百游行者",
  破千人氣: "破千人气",
  社交帝王: "社交帝王",
  社交達人: "社交达人",
  社群之聲: "社群之声",
  萬人焦點: "万人焦点",
  萬遊旅人: "万游旅人",
  競技常客: "竞技常客",
  競技新秀: "竞技新秀",
  聊天室之魂: "聊天室之魂",
  話癆達人: "话痨达人",
  話術傳奇: "话术传奇",
  論壇元老: "论坛元老",
  論壇新秀: "论坛新秀",
  資深老兵: "资深老兵",
  資深買家: "资深买家",
  贊助天使: "赞助天使",
  金主降臨: "金主降临",
  金流不斷: "金流不断",
  銳評家: "锐评家",
  閃耀創作者: "闪耀创作者",
  雲端旅人: "云端旅人",
  霓虹旅人: "霓虹旅人",
  點數帝王: "点数帝王",
  排行榜常客: "排行榜常客",
};

export function localizeTitleName(
  name: string | null | undefined,
  locale: string
): string | null {
  if (!name) return null;
  const normalized = locale.toLowerCase();

  if (normalized === "zh-hk" || normalized === "zh-tw") {
    return name;
  }
  if (normalized === "zh-cn" || normalized === "zh") {
    return TITLE_NAME_ZH_CN[name] ?? name;
  }
  return TITLE_NAME_EN[name] ?? name;
}

export function localizeEquippedTitle<T extends { name: string }>(
  title: T | null | undefined,
  locale: string
): T | null {
  if (!title) return null;
  const localizedName = localizeTitleName(title.name, locale);
  if (!localizedName || localizedName === title.name) return title;
  return { ...title, name: localizedName };
}
