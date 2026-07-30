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

export type NewPhaserGameEntry = {
  id: string;
  slug: string;
  titleKey: string;
  badgeKey: string;
  descriptionKey: string;
  coverUrl: string;
  category: string;
  tags: string[];
  isFeatured: boolean;
  isRecommended: boolean;
  releaseDate: string;
  engine: string;
};

export const NEW_PHASER_GAMES: NewPhaserGameEntry[] = [
  {
    id: "cyber-blade-dash",
    slug: "cyber-blade-dash",
    titleKey: "games.cyber-blade-dash.title",
    badgeKey: "games.cyber-blade-dash.badge",
    descriptionKey: "games.cyber-blade-dash.description",
    coverUrl: "/games/cyber-blade-dash/cover.svg",
    category: "action",
    tags: ["Cyberpunk", "Action", "Phaser3", "Arcade"],
    isFeatured: true,
    isRecommended: true,
    releaseDate: "2026-05-01",
    engine: "Phaser 3 (WebGL)",
  },
  {
    id: "neon-pinball-frenzy",
    slug: "neon-pinball-frenzy",
    titleKey: "games.neon-pinball-frenzy.title",
    badgeKey: "games.neon-pinball-frenzy.badge",
    descriptionKey: "games.neon-pinball-frenzy.description",
    coverUrl: "/games/neon-pinball-frenzy/cover.svg",
    category: "casual",
    tags: ["Neon", "Pinball", "Physics", "Phaser3"],
    isFeatured: false,
    isRecommended: true,
    releaseDate: "2026-05-01",
    engine: "Phaser 3 (WebGL)",
  },
  {
    id: "void-rhythm-beat",
    slug: "void-rhythm-beat",
    titleKey: "games.void-rhythm-beat.title",
    badgeKey: "games.void-rhythm-beat.badge",
    descriptionKey: "games.void-rhythm-beat.description",
    coverUrl: "/games/void-rhythm-beat/cover.svg",
    category: "rhythm",
    tags: ["Rhythm", "Sci-Fi", "Audio", "Phaser3"],
    isFeatured: true,
    isRecommended: false,
    releaseDate: "2026-05-01",
    engine: "Phaser 3 (WebGL)",
  },
  {
    id: "astro-gravity-runner",
    slug: "astro-gravity-runner",
    titleKey: "games.astro-gravity-runner.title",
    badgeKey: "games.astro-gravity-runner.badge",
    descriptionKey: "games.astro-gravity-runner.description",
    coverUrl: "/games/astro-gravity-runner/cover.svg",
    category: "runner",
    tags: ["Space", "Runner", "Gravity", "Phaser3"],
    isFeatured: false,
    isRecommended: true,
    releaseDate: "2026-05-01",
    engine: "Phaser 3 (WebGL)",
  },
  {
    id: "cyber-rogue-dungeon",
    slug: "cyber-rogue-dungeon",
    titleKey: "games.cyber-rogue-dungeon.title",
    badgeKey: "games.cyber-rogue-dungeon.badge",
    descriptionKey: "games.cyber-rogue-dungeon.description",
    coverUrl: "/games/cyber-rogue-dungeon/cover.svg",
    category: "roguelike",
    tags: ["Roguelike", "Dungeon", "Strategy", "Phaser3"],
    isFeatured: true,
    isRecommended: true,
    releaseDate: "2026-05-01",
    engine: "Phaser 3 (WebGL)",
  },
];

export const NEW_PHASER_GAME_PRIORITY = new Map(
  NEW_PHASER_GAMES.map((game, index) => {
    const base = NEW_PHASER_GAMES.length - index;
    const featuredBoost = game.isFeatured ? 20 : 0;
    const recommendedBoost = game.isRecommended ? 10 : 0;
    return [game.slug, base + featuredBoost + recommendedBoost];
  })
);

export function getNewPhaserExposureScore(slug?: string | null): number {
  if (!slug) return 0;
  return NEW_PHASER_GAME_PRIORITY.get(slug) ?? 0;
}

export const NEW_PHASER_GAME_SLUGS = NEW_PHASER_GAMES.map((game) => game.slug);

const NEW_PHASER_GAME_SLUG_SET = new Set(NEW_PHASER_GAME_SLUGS);

export function isNewPhaserGameSlug(slug?: string | null): boolean {
  if (!slug) return false;
  return NEW_PHASER_GAME_SLUG_SET.has(slug);
}

export const EXISTING_VIRTUAL_GAMES: VirtualGameSeed[] = [
  {
    slug: "neon-snake-extreme",
    title: "Neon Snake Extreme",
    titleZh: "霓虹極速貪食蛇",
    creatorName: "CyberViper_Studio",
    creatorUsername: "cyberviper-studio",
    description:
      "五種食物、移動障礙、氮氣加速與子彈時間慢動作；連擊倍率、觸控 D-pad／滑動轉向。四段難度刷新極限紀錄！",
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
      "彈道預覽、頂部下壓、閃電／黑洞／炸彈特殊球與連鎖 Combo 限時倍率。經典泡泡龍的賽博電競重製版，手機觸控就緒。",
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
      "5×5 連五對決、量子糾纏雙格落子與回合限時；四段 AI 難度、連勝統計與觸控落子，在量子棋盤上超越對手！",
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
      "多球／雷射／磁力／黏球道具、爆炸與鋼鐵特殊磚、Combo 連破倍率與星塵粒子。四段難度虛空打磚塊，支援拖曳與虛擬鍵。",
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
      "雨夜霓虹跑酷：二段跳、滑翔、護盾與火箭道具、金幣 Combo、多段障礙編隊與天氣相位。手機觸控就緒！",
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
      "幽靈預覽、保留、五格 Next、7-Bag 隨機、霓虹狂熱雙倍分、連消 Combo 與難度垃圾行。手機虛擬鍵支援。",
    category: "益智",
    tags: ["賽博朋克", "霓虹", "復古", "16-bit", "快節奏", "單機", "鍵鼠操作", "2D", "競技", "觸控友善"],
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
      "Lv1～4 武器升級、護盾吸收、四段彈幕 Boss 血條戰與追蹤／環形彈幕。復古射擊星際強化版，手機虛擬鍵就緒。",
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
      "限時翻牌配對、Glitch 故障特效與連擊倍率；炸彈懲罰、錯配扣秒、完美通關獎勵。觸控翻牌，解鎖駭客矩陣！",
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
      "曲球 spin、三重重力井與預測 AI；觸控拖曳擋板、粒子拖尾與本地雙人對戰，先達標分數者勝！",
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
      "多型障礙、護盾磁鐵加速道具、金幣 Combo 倍率與里程碑事件；雷射彈藥節奏破障。桌面鍵鼠與手機觸控皆可在 Night City 衝刺到黎明！",
    category: "動作",
    tags: ["賽博朋克", "霓虹", "快節奏", "程序生成", "單機", "鍵鼠操作", "2D", "橫向捲軸", "割草", "高難度"],
    playsCount: 9_960,
    likesCount: 512,
    sharesCount: 423,
    ratingAvg: 4.79,
    daysAgo: 4,
  },
];

export const VIRTUAL_GAMES_SEED: VirtualGameSeed[] = [...EXISTING_VIRTUAL_GAMES];

const FEATURED_EXISTING_SLUGS = new Set([
  "rainy-frog-dash",
  "neon-tetromino-rush",
  "cyber-neon-runner",
]);

const RECOMMENDED_EXISTING_SLUGS = new Set([
  "void-brick-breaker",
  "rainy-frog-dash",
  "neon-tetromino-rush",
  "galactic-invader-2026",
  "cyber-neon-runner",
]);

function toUnifiedEntry(game: VirtualGameSeed): NewPhaserGameEntry {
  return {
    id: game.slug,
    slug: game.slug,
    titleKey: `games.${game.slug}.title`,
    badgeKey: `games.${game.slug}.badge`,
    descriptionKey: `games.${game.slug}.description`,
    coverUrl: `/games/${game.slug}/cover.svg`,
    category: game.category,
    tags: [...game.tags],
    isFeatured: FEATURED_EXISTING_SLUGS.has(game.slug),
    isRecommended: RECOMMENDED_EXISTING_SLUGS.has(game.slug),
    releaseDate: new Date(Date.now() - game.daysAgo * 86_400_000)
      .toISOString()
      .slice(0, 10),
    engine: "Phaser 3 (WebGL)",
  };
}

export const ALL_VIRTUAL_GAME_ENTRIES: NewPhaserGameEntry[] = [
  ...EXISTING_VIRTUAL_GAMES.map(toUnifiedEntry),
  ...NEW_PHASER_GAMES,
];

export const getFeaturedGames = () =>
  ALL_VIRTUAL_GAME_ENTRIES.filter((game) => game.isFeatured);

export const getRecommendedGames = () =>
  ALL_VIRTUAL_GAME_ENTRIES.filter((game) => game.isRecommended);

export const getGamesByCategory = (category: string) =>
  ALL_VIRTUAL_GAME_ENTRIES.filter((game) => game.category === category);

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
