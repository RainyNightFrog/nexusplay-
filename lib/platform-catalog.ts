import type { ForumCategory } from "@/lib/forum";
import type { GameRecord } from "@/lib/supabase";

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
  featuredBadge?: string;
  featuredAccent: "cyan" | "amber" | "violet";
  demoUrl: string;
  viewportWidth?: number;
  viewportHeight?: number;
};

export type SeedForumPost = {
  title: string;
  category: ForumCategory;
  content: string;
  authorName: string;
  createdAtOffsetDays: number;
  comments?: { authorName: string; content: string; offsetHours: number }[];
};

export type SeedGameComment = {
  authorName: string;
  content: string;
  offsetHours: number;
};

export const VOID_GACHA_TITLE = "VOID GACHA";

export const PLATFORM_GAMES: PlatformGameMeta[] = [
  {
    slug: "void-gacha",
    title: VOID_GACHA_TITLE,
    creator: "NexusPlay Studio",
    categories: ["益智", "動作"],
    description:
      "踏入虛空深淵，以神秘虛擬卡牌編織命運。在霓虹與虛無交織的抽卡宇宙中，收集稀有卡牌、構築核心卡組，挑戰無盡深淵。",
    coverPath:
      "https://icydkixwynxizrgfzelq.supabase.co/storage/v1/object/public/game-covers/d37f574e-1360-4c41-800c-6aa6fadf98cb-774ed615-911f-46c1-ac3d-1015fac6ef7754745745.jfif",
    playsCount: 106_420,
    likesCount: 7_200,
    sharesCount: 1_680,
    ratingAvg: 4.82,
    featured: true,
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
    playsCount: 98_500,
    likesCount: 8_900,
    sharesCount: 2_100,
    ratingAvg: 4.91,
    featured: true,
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
    playsCount: 64_200,
    likesCount: 5_600,
    sharesCount: 1_400,
    ratingAvg: 4.76,
    featured: true,
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
];

export const PLATFORM_GAME_BY_TITLE = new Map(
  PLATFORM_GAMES.map((game) => [game.title, game])
);

export const FEATURED_GAMES = PLATFORM_GAMES.filter((game) => game.featured);

export const FORUM_SEED_POSTS: Record<string, SeedForumPost[]> = {
  [VOID_GACHA_TITLE]: [
    {
      title: "求神秘虛擬卡牌的核心卡組搭配！",
      category: "guide",
      authorName: "深淵抽卡師",
      createdAtOffsetDays: 2,
      content:
        "剛入坑 VOID GACHA，目前手上有 3 張 SSR 虛空卡，但深淵關卡第 7 層一直卡關。\n\n想請各位大佬分享「核心卡組」的組法：\n- 虛無共鳴流 vs 暴擊連鎖流哪個更穩？\n- 微交易抽卡池要不要等活動再砸？\n\n任何心得都歡迎，感謝！",
      comments: [
        {
          authorName: "卡牌編年史",
          content:
            "建議先湊齊 2 張共鳴觸發卡，深淵 7 層的敵人血量高，暴擊流沒有續航會斷檔。",
          offsetHours: 3,
        },
        {
          authorName: "零號玩家",
          content: "活動池有保底機制，建議存到 80 抽再進場，長期 CP 值最高。",
          offsetHours: 8,
        },
      ],
    },
    {
      title: "回報：充值微交易介面的 UI 顯示 Bug",
      category: "bug",
      authorName: "夜城測試員",
      createdAtOffsetDays: 5,
      content:
        "在 1440p 螢幕下，充值微交易介面的確認按鈕會被底部導覽列遮住約 20%。\n\n重現步驟：\n1. 進入商城 → 虛空禮包\n2. 點擊購買\n3. 確認視窗底部按鈕不可點擊\n\n裝置：Chrome 136 / Windows 11",
      comments: [
        {
          authorName: "NexusPlay 客服",
          content: "已收錄至 v1.2.4 修復清單，感謝回報！臨時解法可縮放至 90% 顯示。",
          offsetHours: 6,
        },
      ],
    },
    {
      title: "新賽季深淵排名心得分享",
      category: "general",
      authorName: "虛空領主",
      createdAtOffsetDays: 1,
      content:
        "這季深淵排名賽的節奏比上季快很多，建議大家早點定好主核心，不要頻繁換卡組。\n\n我個人用「虛無共鳴 + 護盾循環」穩定在前 500，祝大家衝榜順利！",
    },
  ],
  "CoreDefense: Mindustry X": [
    {
      title: "Mindustry X 第 12 關通關佈局分享",
      category: "guide",
      authorName: "鋼鐵工程師",
      createdAtOffsetDays: 3,
      content:
        "第 12 關異星機械潮會從東、北兩側同時進攻，建議佈局如下：\n\n🔧 核心區：雙層輸送帶環形供彈，銅→鋼→穿甲彈藥全自動\n🛡️ 外圍：雷射塔 + 濺射砲塔 3:2 比例\n⚡ 關鍵：第 8 波前完成核心裂變升級\n\n附上我的佈局邏輯，歡迎交流優化！",
      comments: [
        {
          authorName: "物流達人",
          content: "環形供彈超關鍵！我之前直線輸送在第 10 波斷鏈，學到了。",
          offsetHours: 4,
        },
      ],
    },
    {
      title: "這款 3D 渲染優化得太流暢了吧！",
      category: "feedback",
      authorName: "FPS獵人",
      createdAtOffsetDays: 1,
      content:
        "在 GTX 1660 上全高畫質還能穩 60fps，工廠全速運轉時也沒明顯掉幀。\n\n重工業場景的粒子效果和金屬材質質感真的頂，NeonTowers 的技術力太強了。",
      comments: [
        {
          authorName: "NeonTowers 官方",
          content: "感謝支持！下一版會加入更多動態光影與輸送帶批次渲染優化。",
          offsetHours: 12,
        },
      ],
    },
    {
      title: "核心裂變升級時機怎麼抓？",
      category: "general",
      authorName: "防線指揮官",
      createdAtOffsetDays: 4,
      content:
        "每次都在猶豫什麼時候點核心裂變——太早資源不夠，太晚又撐不住。\n\n大家通常第幾波升級？有沒有通用的資源門檻參考？",
    },
  ],
  "CyberFortune 012": [
    {
      title: "012 矩陣全餐打法真的能提高勝率嗎？",
      category: "guide",
      authorName: "概率學徒",
      createdAtOffsetDays: 2,
      content:
        "看了幾場高端局的回放，全餐打法（0-1-2 矩陣三線同開）好像勝率很高，但資源消耗也驚人。\n\n想請教：\n- 適合新手嗎？\n- 什麼牌型下才值得啟動全餐？\n- 有沒有反制策略？",
      comments: [
        {
          authorName: "賽博牌神",
          content:
            "全餐適合中後期，起手別硬開。關鍵是看對手棄牌節奏，通常第 4 回合是最佳窗口。",
          offsetHours: 5,
        },
        {
          authorName: "統計分析師",
          content: "我跑了 500 場數據，全餐在牌型分散度 > 0.7 時期望值最高。",
          offsetHours: 10,
        },
      ],
    },
    {
      title: "復古電競霓虹風的 UI 設計太戳我了",
      category: "feedback",
      authorName: "UI收藏家",
      createdAtOffsetDays: 1,
      content:
        "黑魂金配色 + 霓虹線條的 HUD 簡直藝術品級別，統計面板那個概率曲線動畫我可以看一整天。\n\nEliteRoyal Gaming 的視覺團隊真的懂高端電競審美。",
      comments: [
        {
          authorName: "EliteRoyal 美術組",
          content: "謝謝喜歡！下一版會加入可自訂霓虹主題色，敬請期待。",
          offsetHours: 8,
        },
      ],
    },
    {
      title: "對戰配對有時候等太久",
      category: "bug",
      authorName: "夜城玩家",
      createdAtOffsetDays: 6,
      content:
        "尖峰時段（晚上 9-11 點）配對有時要等 2-3 分鐘，不知道是不是伺服器負載問題？\n\n有人有同樣狀況嗎？",
    },
  ],
};

export const SEED_GAME_COMMENTS: Record<string, SeedGameComment[]> = {
  "CoreDefense: Mindustry X": [
    {
      authorName: "塔防愛好者",
      content: "七種砲塔搭配起來超有策略深度，自動下一波功能很貼心！",
      offsetHours: 2,
    },
    {
      authorName: "工業迷",
      content: "畫面雖然是 demo 但手感已經很完整了，期待正式版。",
      offsetHours: 5,
    },
  ],
  "CyberFortune 012": [
    {
      authorName: "概率王",
      content: "連擊系統很上癮，排行榜讓我想一直刷分。",
      offsetHours: 3,
    },
  ],
  [VOID_GACHA_TITLE]: [
    {
      authorName: "虛空旅人",
      content: "抽卡動畫和霓虹 UI 質感一流，已加入收藏。",
      offsetHours: 4,
    },
  ],
};

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
    plays_count: record.plays_count > 0 ? record.plays_count : meta.playsCount,
    rating_avg:
      Number(record.rating_avg) > 0 ? record.rating_avg : meta.ratingAvg,
  };
}

export function formatEngagementCount(count: number): string {
  if (count >= 10_000) return `${(count / 10_000).toFixed(1)} 萬`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}k`;
  return `${count}`;
}
