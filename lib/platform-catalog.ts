import type { GameRecord } from "@/lib/supabase";
import { VIRTUAL_GAMES_SEED } from "@/lib/virtual-games-seed-data";

export type PlatformGameMeta = {
  slug: string;
  title: string;
  creator: string;
  categories: string[];
  description: string;
  coverPath: string;
  galleryImages?: string[];
  devlogs?: {
    title: string;
    content: string;
    imageUrls?: string[];
    createdAtOffsetDays: number;
  }[];
  playsCount: number;
  likesCount: number;
  sharesCount: number;
  ratingAvg: number;
  featured: boolean;
  /** 顯示於首頁「平台明星遊戲」區塊（三大台柱） */
  platformStar?: boolean;
  featuredBadge?: string;
  featuredAccent: "cyan" | "amber" | "violet";
  demoUrl: string;
  viewportWidth?: number;
  viewportHeight?: number;
};

export const VOID_GACHA_TITLE = "VOID GACHA";

const VIRTUAL_PLATFORM_GAMES: PlatformGameMeta[] = VIRTUAL_GAMES_SEED.map((game) => ({
  slug: game.slug,
  title: game.title,
  creator: game.creatorName,
  categories: [game.category],
  description: game.description,
  coverPath: `/covers/${game.slug}-cover.webp`,
  playsCount: game.playsCount,
  likesCount: game.likesCount,
  sharesCount: game.sharesCount,
  ratingAvg: game.ratingAvg,
  featured: false,
  featuredAccent: "cyan" as const,
  demoUrl: `/games/${game.slug}/index.html`,
  viewportWidth: 960,
  viewportHeight: 600,
}));

export const PLATFORM_GAMES: PlatformGameMeta[] = [
  {
    slug: "void-gacha",
    title: VOID_GACHA_TITLE,
    creator: "RainyNightFrog Studio",
    categories: ["益智", "動作"],
    description:
      "踏入虛空深淵，以神秘虛擬卡牌編織命運。在霓虹與虛無交織的抽卡宇宙中，收集稀有卡牌、構築核心卡組，挑戰無盡深淵。",
    coverPath:
      "https://icydkixwynxizrgfzelq.supabase.co/storage/v1/object/public/game-covers/d37f574e-1360-4c41-800c-6aa6fadf98cb-774ed615-911f-46c1-ac3d-1015fac6ef7754745745.jfif",
    playsCount: 18_240,
    likesCount: 847,
    sharesCount: 623,
    ratingAvg: 4.8,
    featured: true,
    platformStar: true,
    featuredBadge: "平台旗艦",
    featuredAccent: "violet",
    demoUrl: "/demos/void-gacha-preview.html",
  },
  {
    slug: "core-defense",
    title: "CoreDefense: Mindustry X",
    creator: "NeonTowers",
    categories: ["策略", "3D"],
    description:
      "建立你的重工業採礦帝國，拉起鋼鐵防禦陣線！利用精密的輸送帶與全自動化工廠供應鏈，抵禦無窮無盡的異星機械狂潮。當核心裂變點燃，唯有鋼鐵與全自動砲塔能為你贏得最後尊嚴。",
    coverPath: "/covers/core-defense-cover.webp",
    playsCount: 16_580,
    likesCount: 956,
    sharesCount: 872,
    ratingAvg: 4.91,
    featured: true,
    platformStar: true,
    featuredBadge: "硬核工業科幻",
    featuredAccent: "amber",
    demoUrl: "/demos/core-defense-preview.html",
    viewportWidth: 960,
    viewportHeight: 700,
    galleryImages: [
      "/covers/core-defense-cover.webp",
      "/covers/core-defense-screenshot-1.webp",
      "/covers/core-defense-screenshot-2.webp",
    ],
    devlogs: [
      {
        title: "登錄 0.9 — 七種砲塔上線",
        content:
          "新增雷射、迫擊、狙擊、特斯拉、冰霜與火箭砲塔，並加入八種敵人類型與自動下一波功能。",
        createdAtOffsetDays: 6,
      },
      {
        title: "Genesis 更新",
        content: "核心防禦系統重構，優化 canvas 渲染與波次橫幅 UI。",
        createdAtOffsetDays: 29,
      },
    ],
  },
  {
    slug: "cyber-fortune",
    title: "CyberFortune 012",
    creator: "EliteRoyal Gaming",
    categories: ["益智", "動作"],
    description:
      "這是一場融合了未來大數據統計與博弈策略的頭腦風暴。在霓虹交織的賽博夜城中，利用獨創的 012 矩陣與全餐對戰策略，精準推算對手的下一步。在概率的世界裡，你就是唯一的王。",
    coverPath: "/covers/cyber-fortune-cover.webp",
    playsCount: 12_430,
    likesCount: 712,
    sharesCount: 534,
    ratingAvg: 4.76,
    featured: true,
    platformStar: true,
    featuredBadge: "賽博博弈旗艦",
    featuredAccent: "cyan",
    demoUrl: "/demos/cyber-fortune-preview.html",
    viewportWidth: 960,
    viewportHeight: 760,
    galleryImages: [
      "/covers/cyber-fortune-cover.webp",
      "/covers/cyber-fortune-screenshot-1.webp",
      "/covers/cyber-fortune-screenshot-2.webp",
    ],
    devlogs: [
      {
        title: "登錄 0.75.5",
        content: "新增 S/A/B 評級、連擊系統與雲端存檔／排行榜整合。",
        createdAtOffsetDays: 6,
      },
    ],
  },
  {
    slug: "neon-abyss-runner",
    title: "Neon Abyss: Void Runner",
    creator: "RainyNightFrog Studio",
    categories: ["動作", "平台跳躍"],
    description:
      "在霓虹深淵中疾馳穿越三線虛空航道！閃避脈衝雷射與浮游地雷，蓄力虛空衝刺突破死局，收集能量核心疊加連擊倍率。每五波深淵領主降臨——唯有最頂尖的駕駛員能衝破虛無，刷新排行榜傳說。",
    coverPath: "/covers/neon-abyss-runner-cover.webp",
    playsCount: 9_870,
    likesCount: 498,
    sharesCount: 367,
    ratingAvg: 4.88,
    featured: false,
    featuredAccent: "cyan",
    demoUrl: "/demos/neon-abyss-runner-preview.html",
    viewportWidth: 960,
    viewportHeight: 600,
    devlogs: [
      {
        title: "深淵領主系統上線",
        content: "每 5 波出現獨特 BOSS 攻擊模式：三重雷射、屏障牆、深淵風暴。",
        createdAtOffsetDays: 3,
      },
    ],
  },
  {
    slug: "signal-breach",
    title: "Signal Breach: ICE Protocol",
    creator: "GhostNet Labs",
    categories: ["益智", "解謎"],
    description:
      "潛入企業主機的 8×8 訊號節點網路，在 ICE 安全程式巡邏的夾縊中，規劃滲透路徑直達資料核心。十二層防火牆關卡、倒數計時與連鎖破解加成——一場考驗邏輯與膽識的賽博駭客攻防戰。",
    coverPath: "/covers/signal-breach-cover.webp",
    playsCount: 7_650,
    likesCount: 287,
    sharesCount: 198,
    ratingAvg: 4.84,
    featured: false,
    featuredAccent: "cyan",
    demoUrl: "/demos/signal-breach-preview.html",
    viewportWidth: 960,
    viewportHeight: 680,
    devlogs: [
      {
        title: "ICE 巡邏 AI 2.0",
        content: "ICE 節點新增預測路徑與封鎖節點互動，難度曲線全面重製。",
        createdAtOffsetDays: 5,
      },
    ],
  },
  {
    slug: "void-relay",
    title: "Void Relay: Card Descent",
    creator: "RainyNightFrog Studio",
    categories: ["卡牌對戰", "益智"],
    description:
      "墜入虛空深淵的 Roguelike 卡牌征途！20 種虛空卡牌、敵人意圖預判、每層三選一強化卡組。第五層深淵領主守關，一路廝殺至第十五層深淵之底——每次下墜都是全新命運。",
    coverPath: "/covers/void-relay-cover.webp",
    playsCount: 14_920,
    likesCount: 876,
    sharesCount: 689,
    ratingAvg: 4.91,
    featured: false,
    featuredAccent: "violet",
    demoUrl: "/demos/void-relay-preview.html",
    viewportWidth: 960,
    viewportHeight: 720,
    devlogs: [
      {
        title: "深淵領主三部曲",
        content: "先驅者、泰坦、虛空女王三大 BOSS 各有獨特技能與階段轉換。",
        createdAtOffsetDays: 4,
      },
    ],
  },
  {
    slug: "pulse-protocol",
    title: "Pulse Protocol: Neon Beat",
    creator: "SynthWave Arcade",
    categories: ["音樂節奏", "休閒"],
    description:
      "四軌霓虹節拍戰場！在脈衝協議的賽博律動中精準敲擊 Perfect / Great 判定，疊加連擊倍率衝入 Fever 狂熱模式。三首原創電子曲目 × 三種難度——指尖與心跳同步的極限挑戰。",
    coverPath: "/covers/pulse-protocol-cover.webp",
    playsCount: 6_340,
    likesCount: 423,
    sharesCount: 312,
    ratingAvg: 4.79,
    featured: false,
    featuredAccent: "violet",
    demoUrl: "/demos/pulse-protocol-preview.html",
    viewportWidth: 960,
    viewportHeight: 640,
    devlogs: [
      {
        title: "Fever 狂熱模式",
        content: "50 連擊觸發金色 Fever，分數雙倍並解鎖特殊視覺效果。",
        createdAtOffsetDays: 2,
      },
    ],
  },
  {
    slug: "orbital-salvage",
    title: "軌道回收：環形防線",
    creator: "Orbital Dynamics",
    categories: ["塔防", "策略"],
    description:
      "在環形軌道上部署脈衝、電磁、新星、冰霜與回收五系砲塔，攔截沿螺旋軌道殺向核心反應爐的敵潮。20 波攻防、環形升級槽位、BOSS 每五波來襲——工業科幻塔防的全新維度。",
    coverPath: "/covers/orbital-salvage-cover.webp",
    playsCount: 5_180,
    likesCount: 356,
    sharesCount: 267,
    ratingAvg: 4.86,
    featured: false,
    featuredAccent: "amber",
    demoUrl: "/demos/orbital-salvage-preview.html",
    viewportWidth: 960,
    viewportHeight: 700,
    devlogs: [
      {
        title: "環形軌道系統",
        content: "三層環形槽位、五種砲塔與 Lv.3 升級系統正式上線。",
        createdAtOffsetDays: 7,
      },
    ],
  },
  {
    slug: "cyber-blade-dash",
    title: "賽博光刃切擊",
    creator: "RNF Creator Pool",
    categories: ["動作", "2D"],
    description:
      "定向光刃斬擊與蓄力月牙、突進穿敵，對抗偵察／突擊／槍襲／護盾／精銳等多型機體；吸收刃鋒、光盾、渦旋等能力核心，在 DANGER 升溫中維持連段。",
    coverPath: "/games/cyber-blade-dash/cover.png",
    playsCount: 8_460,
    likesCount: 412,
    sharesCount: 268,
    ratingAvg: 4.87,
    featured: true,
    featuredBadge: "Phaser 3 新銳",
    featuredAccent: "cyan",
    demoUrl: "/games/cyber-blade-dash/index.html",
    viewportWidth: 960,
    viewportHeight: 540,
    devlogs: [
      {
        title: "光刃重製：血防與能力",
        content: "加入多型敵人血條、蓄力斬、突進傷害與限時能力掉落，強化近戰節奏與平衡。",
        createdAtOffsetDays: 0,
      },
    ],
  },
  {
    slug: "neon-pinball-frenzy",
    title: "霓虹狂暴彈珠台",
    creator: "RNF Creator Pool",
    categories: ["休閒", "物理"],
    description:
      "揮擊雙擋板、衝技能射門、擊破目標牆與點亮 R·N·F，完成輪替任務疊倍率，並在大獎後引爆雙球狂潮。",
    coverPath: "/games/neon-pinball-frenzy/cover.png",
    playsCount: 6_920,
    likesCount: 305,
    sharesCount: 214,
    ratingAvg: 4.74,
    featured: false,
    featuredAccent: "violet",
    demoUrl: "/games/neon-pinball-frenzy/index.html",
    viewportWidth: 960,
    viewportHeight: 540,
    devlogs: [
      {
        title: "Fever 反彈系統",
        content: "新增多色目標板與震台操作，讓連續碰撞更有賽博競技場節奏。",
        createdAtOffsetDays: 4,
      },
    ],
  },
  {
    slug: "void-rhythm-beat",
    title: "虛空節奏拍點",
    creator: "RNF Creator Pool",
    categories: ["音樂節奏", "休閒"],
    description:
      "跟隨虛空四軌脈衝按下 D / F / J / K（可點擊底部鍵），應對單音、雙音、之字連段、金色加分音與長按音；Perfect／Great／Good 堆連擊，連擊 20 進 Fever，並守住同步值迎戰加速節奏。",
    coverPath: "/games/void-rhythm-beat/cover.png",
    playsCount: 7_880,
    likesCount: 438,
    sharesCount: 322,
    ratingAvg: 4.9,
    featured: true,
    featuredBadge: "節奏焦點",
    featuredAccent: "violet",
    demoUrl: "/games/void-rhythm-beat/index.html",
    viewportWidth: 960,
    viewportHeight: 540,
    devlogs: [
      {
        title: "四軌同步測試完成",
        content: "Perfect / Great / Miss 判定與同步值壓力正式接入危險倍率系統。",
        createdAtOffsetDays: 3,
      },
    ],
  },
  {
    slug: "astro-gravity-runner",
    title: "星際重力翻轉者",
    creator: "RNF Creator Pool",
    categories: ["平台跳躍", "科幻"],
    description:
      "在雙層星軌間翻轉重力閃避脈衝障礙，收集星核維持里程分數，越跑越快的節奏將玩家逼入極限。",
    coverPath: "/games/astro-gravity-runner/cover.png",
    playsCount: 7_120,
    likesCount: 341,
    sharesCount: 229,
    ratingAvg: 4.78,
    featured: false,
    featuredAccent: "amber",
    demoUrl: "/games/astro-gravity-runner/index.html",
    viewportWidth: 960,
    viewportHeight: 540,
    devlogs: [
      {
        title: "雙軌重力上線",
        content: "加入上下跑道翻轉、障礙列車與星核收集循環，強化無盡競速壓迫感。",
        createdAtOffsetDays: 5,
      },
    ],
  },
  {
    slug: "cyber-rogue-dungeon",
    title: "賽博地牢倖存者",
    creator: "RNF Creator Pool",
    categories: ["RPG", "Roguelike"],
    description:
      "深入賽博地牢對抗 12 種機械敵潮，撿限時膠囊啟動雷電／火焰／冰凍／追蹤導彈／護甲，並以 XP 模組永久強化；敵人血量隨等級溫和成長，火力節奏熱血不悶。",
    coverPath: "/games/cyber-rogue-dungeon/cover.png",
    playsCount: 8_140,
    likesCount: 476,
    sharesCount: 337,
    ratingAvg: 4.92,
    featured: true,
    featuredBadge: "倖存熱作",
    featuredAccent: "amber",
    demoUrl: "/games/cyber-rogue-dungeon/index.html",
    viewportWidth: 960,
    viewportHeight: 540,
    devlogs: [
      {
        title: "倖存模組系統",
        content: "新增自動索敵、XP 升級與怪潮密度遞增，讓每次闖關都更像一場電子地牢生存賽。",
        createdAtOffsetDays: 2,
      },
    ],
  },
  ...VIRTUAL_PLATFORM_GAMES,
];

export const PLATFORM_GAME_BY_TITLE = new Map(
  PLATFORM_GAMES.map((game) => [game.title, game])
);

export const PLATFORM_STAR_GAMES = PLATFORM_GAMES.filter((game) => game.platformStar);

/** @deprecated 使用 PLATFORM_STAR_GAMES */
export const FEATURED_GAMES = PLATFORM_STAR_GAMES;


export function getPlatformGameMeta(title: string) {
  return PLATFORM_GAME_BY_TITLE.get(title);
}

export function enrichGameRecord(record: GameRecord) {
  const meta = getPlatformGameMeta(record.title);
  if (!meta) return record;

  return {
    ...record,
    category: meta.categories[0] ?? record.category,
    description: meta.description,
    cover_url: record.cover_url || meta.coverPath,
    plays_count: meta.playsCount,
    rating_avg:
      Number(record.rating_avg) > 0 ? record.rating_avg : meta.ratingAvg,
  };
}

export function formatEngagementCount(count: number): string {
  if (count >= 10_000) return `${(count / 10_000).toFixed(1)} 萬`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}k`;
  return `${count}`;
}
