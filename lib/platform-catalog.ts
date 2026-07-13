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
  coverPath: `/covers/${game.slug}-cover.png`,
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
    likesCount: 892,
    sharesCount: 5_240,
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
    coverPath: "/covers/core-defense-cover.png",
    playsCount: 16_580,
    likesCount: 1_156,
    sharesCount: 6_780,
    ratingAvg: 4.91,
    featured: true,
    platformStar: true,
    featuredBadge: "硬核工業科幻",
    featuredAccent: "amber",
    demoUrl: "/demos/core-defense-preview.html",
    viewportWidth: 960,
    viewportHeight: 700,
    galleryImages: [
      "/covers/core-defense-cover.png",
      "/covers/core-defense-screenshot-1.png",
      "/covers/core-defense-screenshot-2.png",
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
    coverPath: "/covers/cyber-fortune-cover.png",
    playsCount: 12_430,
    likesCount: 634,
    sharesCount: 4_120,
    ratingAvg: 4.76,
    featured: true,
    platformStar: true,
    featuredBadge: "賽博博弈旗艦",
    featuredAccent: "cyan",
    demoUrl: "/demos/cyber-fortune-preview.html",
    viewportWidth: 960,
    viewportHeight: 760,
    galleryImages: [
      "/covers/cyber-fortune-cover.png",
      "/covers/cyber-fortune-screenshot-1.png",
      "/covers/cyber-fortune-screenshot-2.png",
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
    coverPath: "/covers/neon-abyss-runner-cover.png",
    playsCount: 9_870,
    likesCount: 478,
    sharesCount: 3_560,
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
    coverPath: "/covers/signal-breach-cover.png",
    playsCount: 7_650,
    likesCount: 312,
    sharesCount: 2_890,
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
    coverPath: "/covers/void-relay-cover.png",
    playsCount: 14_920,
    likesCount: 1_024,
    sharesCount: 6_140,
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
    coverPath: "/covers/pulse-protocol-cover.png",
    playsCount: 6_340,
    likesCount: 567,
    sharesCount: 3_280,
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
    coverPath: "/covers/orbital-salvage-cover.png",
    playsCount: 5_180,
    likesCount: 428,
    sharesCount: 2_650,
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
