import type { GameTag } from "@/lib/game-metadata";

/** 虛擬電競遊戲種子資料（遊玩／按讚／分享數量為合理區間，非誇張值） */
export type VirtualGameSeed = {
  slug: string;
  title: string;
  titleZh: string;
  creatorName: string;
  creatorUsername: string;
  description: string;
  category: string;
  tags: GameTag[];
  /** 遊玩次數：約三千～兩萬 */
  playsCount: number;
  /** 收藏數：幾十～一千 */
  likesCount: number;
  /** 分享數：幾十～一千 */
  sharesCount: number;
  ratingAvg: number;
  daysAgo: number;
};

export const VIRTUAL_GAMES_SEED: VirtualGameSeed[] = [
  {
    slug: "neon-snake-extreme",
    title: "Neon Snake Extreme",
    titleZh: "霓虹極速貪食蛇",
    creatorName: "CyberViper_Studio",
    creatorUsername: "cyberviper-studio",
    description:
      "氮氣加速、蛇身霓虹粒子拖尾、Combo 食物倍率與險境 Bullet Time 慢動作。在 960×600 賽博棋盤上刷新你的極限紀錄！",
    category: "休閒",
    tags: ["賽博朋克", "霓虹", "復古", "像素風", "快節奏", "單機", "鍵鼠操作", "2D", "高難度", "程序生成"],
    playsCount: 4_280,
    likesCount: 128,
    sharesCount: 94,
    ratingAvg: 4.72,
    daysAgo: 14,
  },
  {
    slug: "cyber-bubble-pop",
    title: "Cyber Bubble Pop",
    titleZh: "賽博泡泡龍",
    creatorName: "BubbleMaster_X",
    creatorUsername: "bubblemaster-x",
    description:
      "連擊消行震屏粒子、雷電與黑洞特殊泡泡、狂暴 Combo 時限。經典泡泡龍的賽博電競重製版。",
    category: "益智",
    tags: ["賽博朋克", "霓虹", "復古", "快節奏", "單機", "鍵鼠操作", "2D", "解謎機制", "競技", "明亮"],
    playsCount: 5_640,
    likesCount: 234,
    sharesCount: 176,
    ratingAvg: 4.68,
    daysAgo: 12,
  },
  {
    slug: "quantum-tic-tac-toe",
    title: "Quantum Tic-Tac-Toe",
    titleZh: "量子過三關",
    creatorName: "LogicKnight_HK",
    creatorUsername: "logicknight-hk",
    description:
      "倒數計時心跳音效、5×5 五子連珠擴充、閃爍晶片棋子與勝率記錄。在量子棋盤上超越 AI 對手！",
    category: "益智",
    tags: ["賽博朋克", "霓虹", "科幻", "回合制", "單機", "鍵鼠操作", "2D", "解謎機制", "快節奏", "教育"],
    playsCount: 3_280,
    likesCount: 47,
    sharesCount: 36,
    ratingAvg: 4.61,
    daysAgo: 11,
  },
  {
    slug: "void-brick-breaker",
    title: "Void Brick Breaker",
    titleZh: "虛空打磚塊",
    creatorName: "PixelArchitect",
    creatorUsername: "pixelarchitect",
    description:
      "多球分裂、雷射發射板、黑洞磁力板與星塵爆裂特效。虛空磚塊矩陣等你粉碎！",
    category: "動作",
    tags: ["賽博朋克", "霓虹", "復古", "快節奏", "單機", "鍵鼠操作", "2D", "硬核", "割草", "明亮"],
    playsCount: 7_350,
    likesCount: 312,
    sharesCount: 245,
    ratingAvg: 4.75,
    daysAgo: 10,
  },
  {
    slug: "rainy-frog-dash",
    title: "Rainy Frog Dash",
    titleZh: "雨夜飛天蛙",
    creatorName: "FroggyLab_Games",
    creatorUsername: "froggylab-games",
    description:
      "Flappy 青蛙衝刺、二段跳躍、空氣護盾與火箭噴射道具。在雨夜霓虹天際線中飛越障礙！",
    category: "平台跳躍",
    tags: ["賽博朋克", "霓虹", "可愛", "快節奏", "單機", "鍵鼠操作", "2D", "橫向捲軸", "觸控友善", "明亮"],
    playsCount: 8_920,
    likesCount: 456,
    sharesCount: 378,
    ratingAvg: 4.81,
    daysAgo: 9,
  },
  {
    slug: "neon-tetromino-rush",
    title: "Neon Tetromino Rush",
    titleZh: "霓虹方塊衝刺",
    creatorName: "RetroGrid_Dev",
    creatorUsername: "retrogrid-dev",
    description:
      "Ghost 預覽落點、Hold 存牌、Hard Drop 震屏與全螢幕消行霓虹光波。經典方塊的電競極速版。",
    category: "益智",
    tags: ["賽博朋克", "霓虹", "復古", "16-bit", "快節奏", "單機", "鍵鼠操作", "2D", "競技", "硬核"],
    playsCount: 9_680,
    likesCount: 589,
    sharesCount: 467,
    ratingAvg: 4.84,
    daysAgo: 8,
  },
  {
    slug: "galactic-invader-2026",
    title: "Galactic Invader 2026",
    titleZh: "星際侵略者 2026",
    creatorName: "NebulaCraft",
    creatorUsername: "nebulacraft",
    description:
      "武器多段升級彈幕、護盾系統、血條震屏巨型 Boss 戰。保衛地球對抗 2026 星際入侵！",
    category: "射擊",
    tags: ["賽博朋克", "科幻", "霓虹", "快節奏", "單機", "鍵鼠操作", "2D", "割草", "高難度", "機甲"],
    playsCount: 6_140,
    likesCount: 345,
    sharesCount: 278,
    ratingAvg: 4.73,
    daysAgo: 7,
  },
  {
    slug: "memory-matrix-glitch",
    title: "Memory Matrix Glitch",
    titleZh: "駭客矩陣記憶翻牌",
    creatorName: "NeuralMind",
    creatorUsername: "neuralmind",
    description:
      "限時解密、黑客代碼 Glitch 翻牌特效、連擊音階加成。在矩陣中配對所有加密晶片！",
    category: "益智",
    tags: ["賽博朋克", "霓虹", "黑暗", "解謎機制", "單機", "鍵鼠操作", "2D", "快節奏", "教育", "科幻"],
    playsCount: 3_560,
    likesCount: 56,
    sharesCount: 43,
    ratingAvg: 4.58,
    daysAgo: 6,
  },
  {
    slug: "overdrive-cyber-pong",
    title: "Overdrive Cyber Pong",
    titleZh: "超光速霓虹乒乓",
    creatorName: "HyperPong_Studio",
    creatorUsername: "hyperpong-studio",
    description:
      "曲球弧線、重力磁場、單人 AI（簡單/極限）與雙人對戰，光束軌跡劃破球場。",
    category: "運動競技",
    tags: ["賽博朋克", "霓虹", "復古", "競技", "本地多人", "單機", "鍵鼠操作", "2D", "快節奏", "明亮"],
    playsCount: 3_420,
    likesCount: 167,
    sharesCount: 124,
    ratingAvg: 4.66,
    daysAgo: 5,
  },
  {
    slug: "cyber-neon-runner",
    title: "Cyber Neon Runner",
    titleZh: "賽博霓虹無盡跑酷",
    creatorName: "NightCity_Runner",
    creatorUsername: "nightcity-runner",
    description:
      "滑行/跳躍/雷射槍擊碎障礙物、金幣收集與極速動態背景。在 Night City 中奔跑到黎明！",
    category: "動作",
    tags: ["賽博朋克", "霓虹", "快節奏", "程序生成", "單機", "鍵鼠操作", "2D", "橫向捲軸", "割草", "高難度"],
    playsCount: 9_960,
    likesCount: 512,
    sharesCount: 423,
    ratingAvg: 4.79,
    daysAgo: 4,
  },
];

export const VIRTUAL_GAMES_SEED_BY_SLUG = new Map(
  VIRTUAL_GAMES_SEED.map((game) => [game.slug, game])
);

export const VIRTUAL_GAMES_SEED_BY_TITLE = new Map(
  VIRTUAL_GAMES_SEED.map((game) => [game.title, game])
);

/** 卡片／列表：API 收藏為 0 時仍顯示 catalog 種子按讚數 */
export function resolveDisplayFavoriteCount(
  apiCount: number | undefined,
  catalogLikes: number
): number {
  return apiCount != null && apiCount > 0 ? apiCount : catalogLikes;
}
