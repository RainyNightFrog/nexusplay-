/** 虛擬玩家自我介紹：長短不一，語氣像真人隨手寫的 */
export const VIRTUAL_PLAYER_BIOS: Record<string, string> = {
  // 台港澳 · 繁體
  "hk-01":
    "下海打本之前一定檢查裝備兩遍，第三遍是習慣。輸了先怪自己，唔太甩鍋隊友。周末多半在翻老遊戲，新遊反而慢慢來。",
  "hk-02": "半夜還在線好正常 🌙 鍾意慢慢逛地圖，卡關就去沖杯面，返嚟再諗",
  "hk-03":
    "每張圖角落都要摸一遍先舒服，主線？等等，壁畫仲未睇完。隊友催進度我會扮聽唔到",
  "hk-04": "就差嗰張卡，卡咗快兩年……有多餘的私我 👀",
  "hk-05": "🕹️✨",
  "hk-06":
    "細個喺街機廳大，按鍵手感好緊要。而家反應慢咗，不過套路仲識，新手唔好掉以輕心",
  "hk-07": "放學就打機，功課聽日先講",
  "hk-08": "恐怖遊戲先 pass 🧸",
  "hk-09": "仲練緊",
  "hk-10": "動漫同遊戲各半，兩邊荷包都空",
  "hk-11": "夏天打機一定要開冷氣，唔係手汗會撳錯",
  "hk-12": "打完一鋪去飲凍奶茶，就係咁。檸茶都得",
  "hk-13":
    "塔唔擺到密密麻麻瞓唔著。外賣到了會先食，打完呢波再講——唔好催",

  // 簡體
  "cn-01": "别催，越催越慢",
  "cn-02": "这ID十年前起的，懂的人自然懂",
  "cn-03": "跪习惯了",
  "cn-04": "打完这局就吃辣条，谁说都不改",
  "cn-05":
    "以前这ID很中二的，现在懒得改了。晚上上线比较多，白天要上班装正常人",
  "cn-06": "哈哈哈哈🤣 别问我 问就是开心",
  "cn-07": "输了是键盘问题，赢了是自己厉害，逻辑完美",
  "cn-08": "混",
  "cn-09": "角落玩比较安心",
  "cn-10": "话不多",
  "cn-11": "有些局打完会想很久，有些打完就忘。游戏是这样，人也差不多",
  "cn-12": "一个人玩惯了，组队会紧张",
  "cn-13": "老游戏骨灰，新作观望半年再说",
  "cn-14": "智商税游戏不碰",
  "cn-15":
    "有些号名字取大了，人没变大。上线就看看论坛，打打轻松的，难的留给年轻人",
  "cn-16": "嗯",
  "cn-17": "🌻☀️",
  "cn-18": "喜欢画风好看的，剧情差一点也能忍",
  "cn-19": "消息不怎么回，看见会点赞",
  "cn-20": "👑？",
  "cn-21": "打着打着就饿了，外卖比副本重要",
  "cn-22": "上线时间不规律，有时连打几小时，有时一周不上。别私信问在不在",
  "cn-23": "🥺💕",

  // 英文
  "en-01": "mostly here for chill games. ranked stuff stresses me out ngl",
  "en-02": "I play tanks. poorly.",
  "en-03": "YES I TYPE IN CAPS SORRY",
  "en-04": "maybe tomorrow",
  "en-05": "these aren't the stats you're looking for",
  "en-06": "trying to find people to play with lol",
  "en-07": "gg",
  "en-08":
    "late night player. coffee first, maybe ranked later. or not. depends",
  "en-09": "idk",
  "en-10": "fast loads, slow decisions",
  "en-11": "🎉🔥🎉",
  "en-12": "weather's bad so I'm inside. simple math",
  "en-13":
    "support main forever. if we lose it's probably because I went DPS once. sorry",
};

export function getVirtualPlayerBio(playerId: string): string | null {
  const bio = VIRTUAL_PLAYER_BIOS[playerId]?.trim();
  return bio || null;
}
