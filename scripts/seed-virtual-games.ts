/**
 * 虛擬創作者 + 10 款電競重製 HTML5 遊戲 Seed 腳本
 * 用法：npm run db:seed-virtual-games
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  DEFAULT_VIEWPORT_HEIGHT,
  DEFAULT_VIEWPORT_WIDTH,
} from "../lib/game-metadata";
import { upsertBotProfile } from "../lib/profile-player-number";
import { VIRTUAL_GAMES_SEED } from "../lib/virtual-games-seed-data";

const SEED_PASSWORD = "SeedPass_RainyNightFrog_2026!";
const EMAIL_DOMAIN = "rainynightfrog.local";

type VirtualCreator = {
  displayName: string;
  username: string;
  bio: string;
};

const VIRTUAL_CREATORS: VirtualCreator[] = [
  {
    displayName: "CyberViper_Studio",
    username: "cyberviper-studio",
    bio: "霓虹極速 arcade 重製專家，專注氮氣加速與粒子拖尾特效。",
  },
  {
    displayName: "BubbleMaster_X",
    username: "bubblemaster-x",
    bio: "賽博泡泡與連擊震屏特效的創意實驗室。",
  },
  {
    displayName: "LogicKnight_HK",
    username: "logicknight-hk",
    bio: "量子棋類與邏輯競技的香港獨立開發者。",
  },
  {
    displayName: "PixelArchitect",
    username: "pixelarchitect",
    bio: "虛空打磚塊與粒子爆裂的復古街機建築師。",
  },
  {
    displayName: "FroggyLab_Games",
    username: "froggylab-games",
    bio: "雨夜飛天蛙與可愛賽博橫向衝刺。",
  },
  {
    displayName: "RetroGrid_Dev",
    username: "retrogrid-dev",
    bio: "霓虹方塊、Ghost 預覽與 Hard Drop 震屏專家。",
  },
  {
    displayName: "NebulaCraft",
    username: "nebulacraft",
    bio: "星際彈幕射擊與 Boss 血條震屏戰役設計。",
  },
  {
    displayName: "NeuralMind",
    username: "neuralmind",
    bio: "駭客矩陣記憶翻牌與 Glitch 視覺特效。",
  },
  {
    displayName: "HyperPong_Studio",
    username: "hyperpong-studio",
    bio: "超光速霓虹乒乓與曲球物理引擎。",
  },
  {
    displayName: "NightCity_Runner",
    username: "nightcity-runner",
    bio: "賽博無盡跑酷與動態霓虹背景。",
  },
];

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

function creatorEmail(username: string) {
  return `seed.${username}@${EMAIL_DOMAIN}`;
}

async function ensureCreatorUser(
  admin: SupabaseClient,
  creator: VirtualCreator
): Promise<string> {
  const email = creatorEmail(creator.username);

  const { data: listData } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  const existing = listData?.users?.find((user) => user.email === email);
  if (existing) return existing.id;

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: SEED_PASSWORD,
    email_confirm: true,
    user_metadata: {
      display_name: creator.displayName,
      role: "creator",
      bio: creator.bio,
      profile_public: true,
    },
  });
  if (error) throw new Error(`建立創作者 ${creator.displayName} 失敗：${error.message}`);
  return data.user.id;
}

async function upsertCreatorProfile(
  admin: SupabaseClient,
  userId: string,
  creator: VirtualCreator
) {
  await upsertBotProfile(admin, {
    userId,
    displayName: creator.displayName,
    avatarUrl: null,
    role: "creator",
  });

  const { error } = await admin
    .from("profiles")
    .update({
      username: creator.username,
      bio: creator.bio,
    })
    .eq("id", userId);

  if (error) {
    throw new Error(`更新 profile ${creator.displayName} 失敗：${error.message}`);
  }
}

async function main() {
  loadEnv();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error("缺少 NEXT_PUBLIC_SUPABASE_URL 或 SUPABASE_SERVICE_ROLE_KEY（.env.local）");
  }

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  console.log("🎮 RainyNightFrog 虛擬創作者 + 10 款電競遊戲 Seed 寫入中…\n");

  const creatorIds = new Map<string, string>();

  for (const creator of VIRTUAL_CREATORS) {
    const userId = await ensureCreatorUser(admin, creator);
    await upsertCreatorProfile(admin, userId, creator);
    creatorIds.set(creator.username, userId);
    console.log(`✓ 創作者就緒：${creator.displayName} (@${creator.username})`);
  }

  console.log("");

  for (const game of VIRTUAL_GAMES_SEED) {
    const creatorId = creatorIds.get(game.creatorUsername);
    if (!creatorId) {
      console.error(`✗ 找不到創作者 ${game.creatorUsername}，跳過 ${game.title}`);
      continue;
    }

    const { data: existingBySlug } = await admin
      .from("games")
      .select("id, title, slug")
      .eq("slug", game.slug)
      .maybeSingle();

    if (existingBySlug) {
      const { error: updateError } = await admin
        .from("games")
        .update({
          plays_count: game.playsCount,
          rating_avg: game.ratingAvg,
        })
        .eq("slug", game.slug);

      if (updateError) {
        console.error(`✗ 更新統計失敗 ${game.title}:`, updateError.message);
      } else {
        console.log(
          `✓ 已更新統計：${game.title}（遊玩 ${game.playsCount.toLocaleString()} · 讚 ${game.likesCount} · 分享 ${game.sharesCount}）`
        );
      }
      continue;
    }

    const { data: existingByTitle } = await admin
      .from("games")
      .select("id, title")
      .eq("title", game.title)
      .maybeSingle();

    if (existingByTitle) {
      console.log(`✓ 遊戲已存在（title），跳過：${game.title} (id=${existingByTitle.id})`);
      continue;
    }

    const createdAt = new Date(Date.now() - game.daysAgo * 86_400_000).toISOString();

    const { data, error } = await admin
      .from("games")
      .insert({
        title: game.title,
        description: game.description,
        category: game.category,
        cover_url: `/covers/${game.slug}-cover.png`,
        game_url: `/games/${game.slug}/index.html`,
        creator_id: creatorId,
        created_at: createdAt,
        plays_count: game.playsCount,
        rating_avg: game.ratingAvg,
        publish_status: "public",
        status: "approved",
        slug: game.slug,
        tags: game.tags,
        viewport_width: DEFAULT_VIEWPORT_WIDTH,
        viewport_height: DEFAULT_VIEWPORT_HEIGHT,
        fullscreen_button: true,
        ai_disclosed: true,
        ai_content_types: ["graphics", "sound", "code"],
        details_html: `<p><strong>${game.titleZh}</strong> — ${game.description}</p>`,
        pricing_type: "free",
        price: 0,
        currency: "USD",
      })
      .select("id, slug, title")
      .single();

    if (error) {
      console.error(`✗ 插入遊戲失敗 ${game.title}:`, error.message);
      continue;
    }

    console.log(`✓ 已新增遊戲：${data.title} (id=${data.id}, slug=${data.slug})`);
    console.log(`  標籤 (${game.tags.length})：${game.tags.join("、")}`);
  }

  console.log("\n✅ 虛擬遊戲庫 Seed 完成！");
  console.log("   執行 npm run dev 後可造訪 /games/[slug]/index.html 預覽各款遊戲。");
}

main().catch((error) => {
  console.error("Seed 失敗：", error instanceof Error ? error.message : error);
  process.exit(1);
});
