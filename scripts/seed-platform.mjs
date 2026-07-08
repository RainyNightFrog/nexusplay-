import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import pg from "pg";

const { Client } = pg;

const NEW_GAMES = [
  {
    title: "CoreDefense: Mindustry X",
    description:
      "建立你的重工業採礦帝國，拉起鋼鐵防禦陣線！利用精密的輸送帶與全自動化工廠供應鏈，抵禦無窮無盡的異星機械狂潮。當核心裂變點燃，唯有鋼鐵與全自動砲塔能為你贏得最後尊嚴。",
    category: "策略",
    cover_url: "/covers/core-defense-cover.png",
    game_url: "/demos/core-defense-preview.html",
    plays_count: 98500,
    rating_avg: 4.91,
    daysAgo: 12,
  },
  {
    title: "CyberFortune 012",
    description:
      "這是一場融合了未來大數據統計與博弈策略的頭腦風暴。在霓虹交織的賽博夜城中，利用獨創的 012 矩陣與全餐對戰策略，精準推算對手的下一步。在概率的世界裡，你就是唯一的王。",
    category: "益智",
    cover_url: "/covers/cyber-fortune-cover.png",
    game_url: "/demos/cyber-fortune-preview.html",
    plays_count: 64200,
    rating_avg: 4.76,
    daysAgo: 8,
  },
  {
    title: "Neon Abyss: Void Runner",
    description:
      "在霓虹深淵中疾馳穿越三線虛空航道！閃避脈衝雷射與浮游地雷，蓄力虛空衝刺突破死局，收集能量核心疊加連擊倍率。每五波深淵領主降臨——唯有最頂尖的駕駛員能衝破虛無。",
    category: "動作",
    cover_url: "/covers/neon-abyss-runner-cover.png",
    game_url: "/demos/neon-abyss-runner-preview.html",
    plays_count: 72800,
    rating_avg: 4.88,
    daysAgo: 5,
  },
  {
    title: "Signal Breach: ICE Protocol",
    description:
      "潛入企業主機的 8×8 訊號節點網路，在 ICE 安全程式巡邏的夾縊中，規劃滲透路徑直達資料核心。十二層防火牆關卡、倒數計時與連鎖破解加成。",
    category: "益智",
    cover_url: "/covers/signal-breach-cover.png",
    game_url: "/demos/signal-breach-preview.html",
    plays_count: 58400,
    rating_avg: 4.84,
    daysAgo: 6,
  },
  {
    title: "Void Relay: Card Descent",
    description:
      "墜入虛空深淵的 Roguelike 卡牌征途！20 種虛空卡牌、敵人意圖預判、每層三選一強化卡組。第五層深淵領主守關，一路廝殺至第十五層深淵之底。",
    category: "卡牌對戰",
    cover_url: "/covers/void-relay-cover.png",
    game_url: "/demos/void-relay-preview.html",
    plays_count: 81200,
    rating_avg: 4.91,
    daysAgo: 4,
  },
  {
    title: "Pulse Protocol: Neon Beat",
    description:
      "四軌霓虹節拍戰場！在脈衝協議的賽博律動中精準敲擊 Perfect / Great 判定，疊加連擊倍率衝入 Fever 狂熱模式。三首原創電子曲目 × 三種難度。",
    category: "音樂節奏",
    cover_url: "/covers/pulse-protocol-cover.png",
    game_url: "/demos/pulse-protocol-preview.html",
    plays_count: 66500,
    rating_avg: 4.79,
    daysAgo: 3,
  },
  {
    title: "軌道回收：環形防線",
    description:
      "在環形軌道上部署脈衝、電磁、新星、冰霜與回收五系砲塔，攔截沿螺旋軌道殺向核心反應爐的敵潮。20 波攻防、環形升級槽位、BOSS 每五波來襲。",
    category: "塔防",
    cover_url: "/covers/orbital-salvage-cover.png",
    game_url: "/demos/orbital-salvage-preview.html",
    plays_count: 54300,
    rating_avg: 4.86,
    daysAgo: 7,
  },
];

const FORUM_SEED = {
  "VOID GACHA": [
    {
      title: "求神秘虛擬卡牌的核心卡組搭配！",
      category: "guide",
      authorEmail: "seed.void.guide@nexusplay.local",
      authorName: "鐵鳩船長",
      content:
        "剛入坑 VOID GACHA，目前手上有 3 張 SSR 虛空卡，但深淵關卡第 7 層一直卡關。\n\n想請各位大佬分享「核心卡組」的組法：\n- 虛無共鳴流 vs 暴擊連鎖流哪個更穩？\n- 微交易抽卡池要不要等活動再砸？\n\n任何心得都歡迎，感謝！",
      daysAgo: 2,
    },
    {
      title: "回報：充值微交易介面的 UI 顯示 Bug",
      category: "bug",
      authorEmail: "seed.void.bug@nexusplay.local",
      authorName: "哈姆亂太郎",
      content:
        "在 1440p 螢幕下，充值微交易介面的確認按鈕會被底部導覽列遮住約 20%。\n\n重現步驟：\n1. 進入商城 → 虛空禮包\n2. 點擊購買\n3. 確認視窗底部按鈕不可點擊\n\n裝置：Chrome 136 / Windows 11",
      daysAgo: 5,
    },
    {
      title: "新賽季深淵排名心得分享",
      category: "general",
      authorEmail: "seed.void.rank@nexusplay.local",
      authorName: "旺角揸Fit人",
      content:
        "這季深淵排名賽的節奏比上季快很多，建議大家早點定好主核心，不要頻繁換卡組。\n\n我個人用「虛無共鳴 + 護盾循環」穩定在前 500，祝大家衝榜順利！",
      daysAgo: 1,
    },
  ],
  "CoreDefense: Mindustry X": [
    {
      title: "Mindustry X 第 12 關通關佈局分享",
      category: "guide",
      authorEmail: "seed.core.guide@nexusplay.local",
      authorName: "硬之練膠術師",
      content:
        "第 12 關異星機械潮會從東、北兩側同時進攻，建議佈局如下：\n\n🔧 核心區：雙層輸送帶環形供彈，銅→鋼→穿甲彈藥全自動\n🛡️ 外圍：雷射塔 + 濺射砲塔 3:2 比例\n⚡ 關鍵：第 8 波前完成核心裂變升級\n\n附上我的佈局邏輯，歡迎交流優化！",
      daysAgo: 3,
    },
    {
      title: "這款 3D 渲染優化得太流暢了吧！",
      category: "feedback",
      authorEmail: "seed.core.fps@nexusplay.local",
      authorName: "長崎涼美",
      content:
        "在 GTX 1660 上全高畫質還能穩 60fps，工廠全速運轉時也沒明顯掉幀。\n\n重工業場景的粒子效果和金屬材質質感真的頂，NeonTowers 的技術力太強了。",
      daysAgo: 1,
    },
    {
      title: "核心裂變升級時機怎麼抓？",
      category: "general",
      authorEmail: "seed.core.tips@nexusplay.local",
      authorName: "伊莎Bear",
      content:
        "每次都在猶豫什麼時候點核心裂變——太早資源不夠，太晚又撐不住。\n\n大家通常第幾波升級？有沒有通用的資源門檻參考？",
      daysAgo: 4,
    },
  ],
  "CyberFortune 012": [
    {
      title: "012 矩陣全餐打法真的能提高勝率嗎？",
      category: "guide",
      authorEmail: "seed.cyber.guide@nexusplay.local",
      authorName: "蠟筆小新",
      content:
        "看了幾場高端局的回放，全餐打法（0-1-2 矩陣三線同開）好像勝率很高，但資源消耗也驚人。\n\n想請教：\n- 適合新手嗎？\n- 什麼牌型下才值得啟動全餐？\n- 有沒有反制策略？",
      daysAgo: 2,
    },
    {
      title: "復古電競霓虹風的 UI 設計太戳我了",
      category: "feedback",
      authorEmail: "seed.cyber.ui@nexusplay.local",
      authorName: "陳冠希",
      content:
        "黑魂金配色 + 霓虹線條的 HUD 簡直藝術品級別，統計面板那個概率曲線動畫我可以看一整天。\n\nEliteRoyal Gaming 的視覺團隊真的懂高端電競審美。",
      daysAgo: 1,
    },
    {
      title: "對戰配對有時候等太久",
      category: "bug",
      authorEmail: "seed.cyber.match@nexusplay.local",
      authorName: "打小是祖宗",
      content:
        "尖峰時段（晚上 9-11 點）配對有時要等 2-3 分鐘，不知道是不是伺服器負載問題？\n\n有人有同樣狀況嗎？",
      daysAgo: 6,
    },
  ],
};

function loadEnv() {
  const envPath = resolve(process.cwd(), ".env.local");
  const content = readFileSync(envPath, "utf8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

function buildConnectionCandidates() {
  if (process.env.DATABASE_URL) return [process.env.DATABASE_URL];
  const password = process.env.SUPABASE_DB_PASSWORD;
  if (!password) return [];
  const projectUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const match = projectUrl.match(/https:\/\/([^.]+)\.supabase\.co/);
  if (!match) return [];
  const projectRef = match[1];
  const encodedPassword = encodeURIComponent(password);
  const region = process.env.SUPABASE_DB_REGION ?? "ap-southeast-1";
  return [
    process.env.SUPABASE_DB_URL,
    `postgresql://postgres.${projectRef}:${encodedPassword}@aws-1-${region}.pooler.supabase.com:5432/postgres`,
    `postgresql://postgres:${encodedPassword}@db.${projectRef}.supabase.co:5432/postgres`,
  ].filter(Boolean);
}

async function connectClient(candidates) {
  let lastError = null;
  for (const connectionString of candidates) {
    const client = new Client({
      connectionString,
      ssl: { rejectUnauthorized: false },
    });
    try {
      await client.connect();
      return client;
    } catch (error) {
      lastError = error;
      await client.end().catch(() => undefined);
    }
  }
  throw lastError ?? new Error("無法連線資料庫");
}

async function ensureSeedUser(admin, email, displayName) {
  const { data: listData } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  const existing = listData?.users?.find((user) => user.email === email);
  if (existing) return existing.id;

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: "SeedPass_NexusPlay_2026!",
    email_confirm: true,
    user_metadata: { display_name: displayName, role: "player" },
  });
  if (error) throw error;
  return data.user.id;
}

async function upsertProfile(admin, userId, displayName) {
  const { error } = await admin.from("profiles").upsert(
    { id: userId, display_name: displayName, role: "player" },
    { onConflict: "id" }
  );
  if (error && !error.message.includes("duplicate")) {
    console.warn(`profiles upsert 略過：${error.message}`);
  }
}

async function main() {
  loadEnv();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.error("缺少 NEXT_PUBLIC_SUPABASE_URL 或 SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  console.log("🎮 NexusPlay 平台種子資料寫入中…\n");

  // 1. 追加新遊戲（不碰 VOID GACHA）
  for (const game of NEW_GAMES) {
    const { data: existing } = await admin
      .from("games")
      .select("id, title")
      .eq("title", game.title)
      .maybeSingle();

    if (existing) {
      console.log(`✓ 遊戲已存在，跳過：${game.title} (id=${existing.id})`);
      continue;
    }

    const createdAt = new Date(
      Date.now() - game.daysAgo * 86_400_000
    ).toISOString();

    const { data, error } = await admin.from("games").insert({
      title: game.title,
      description: game.description,
      category: game.category,
      cover_url: game.cover_url,
      game_url: game.game_url,
      plays_count: game.plays_count,
      rating_avg: game.rating_avg,
      created_at: createdAt,
      publish_status: "public",
      status: "approved",
    }).select("id").single();

    if (error) {
      console.error(`✗ 插入遊戲失敗 ${game.title}:`, error.message);
    } else {
      console.log(`✓ 已新增遊戲：${game.title} (id=${data.id})`);
    }
  }

  // 2. 確認 VOID GACHA 存在（只讀，不修改）
  const { data: voidGacha } = await admin
    .from("games")
    .select("id, title, plays_count")
    .eq("title", "VOID GACHA")
    .maybeSingle();

  if (voidGacha) {
    console.log(`\n✓ VOID GACHA 已就緒 (id=${voidGacha.id}, plays=${voidGacha.plays_count}) — 未修改`);
  } else {
    console.log("\n⚠ VOID GACHA 不在資料庫中（請保留你現有的上傳版本，本腳本不會建立它）");
  }

  // 3. 論壇貼文（需 DB 直連以設定 created_at）
  const candidates = buildConnectionCandidates();
  if (candidates.length === 0) {
    console.log("\n⚠ 缺少 SUPABASE_DB_PASSWORD，跳過論壇貼文寫入（UI 仍會顯示種子討論）");
    return;
  }

  const client = await connectClient(candidates);
  console.log("\n已連線 Postgres，寫入社群討論貼文…");

  try {
    for (const [gameTitle, posts] of Object.entries(FORUM_SEED)) {
      const { rows: gameRows } = await client.query(
        "select id from public.games where title = $1 limit 1",
        [gameTitle]
      );
      if (gameRows.length === 0) {
        console.log(`  ⚠ 找不到遊戲「${gameTitle}」，跳過論壇種子`);
        continue;
      }
      const gameId = gameRows[0].id;

      for (const post of posts) {
        const { rows: existingPosts } = await client.query(
          "select id from public.forum_posts where game_id = $1 and title = $2 limit 1",
          [gameId, post.title]
        );
        if (existingPosts.length > 0) {
          console.log(`  ✓ 貼文已存在：${post.title}`);
          continue;
        }

        const userId = await ensureSeedUser(admin, post.authorEmail, post.authorName);
        await upsertProfile(admin, userId, post.authorName);

        const createdAt = new Date(
          Date.now() - post.daysAgo * 86_400_000
        ).toISOString();

        await client.query(
          `insert into public.forum_posts (game_id, user_id, title, category, content, created_at)
           values ($1, $2, $3, $4, $5, $6)`,
          [gameId, userId, post.title, post.category, post.content, createdAt]
        );
        console.log(`  ✓ 已新增貼文：「${post.title}」→ ${gameTitle}`);
      }
    }
  } finally {
    await client.end();
  }

  console.log("\n✅ 平台種子完成！可執行 vercel --prod 部署上線。");
}

main().catch((error) => {
  console.error("種子失敗：", error.message);
  process.exit(1);
});
