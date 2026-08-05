/**
 * 將 Neon Hold'em 上架為虛擬遊戲，創作者綁定現有虛擬玩家「卡牌收集家」(hk-04)。
 * 用法：npm run db:seed-neon-holdem
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  ambientCreatorBotEmail,
  getVirtualPlayerById,
} from "../lib/virtual-players";
import { ambientEmailAliases } from "../lib/ambient-local-email";
import { upsertBotProfile } from "../lib/profile-player-number";
import { resolveVirtualPlayerAvatarUrl } from "../lib/virtual-player-avatar";
import {
  NEON_HOLDEM_SLUG,
  NEON_HOLDEM_TITLE,
  nativeReactGameUrl,
} from "../lib/native-react-games";

const CREATOR_PLAYER_ID = "hk-04";

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

async function findUserIdByEmails(
  admin: SupabaseClient,
  emails: string[]
): Promise<string | null> {
  const emailSet = new Set(emails.map((e) => e.toLowerCase()));
  let page = 1;
  const perPage = 200;
  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    for (const user of data.users ?? []) {
      if (user.email && emailSet.has(user.email.toLowerCase())) {
        return user.id;
      }
    }
    if ((data.users?.length ?? 0) < perPage) break;
    page += 1;
  }
  return null;
}

async function ensureCreatorFromVirtualPlayer(
  admin: SupabaseClient
): Promise<{ userId: string; displayName: string }> {
  const player = getVirtualPlayerById(CREATOR_PLAYER_ID);
  if (!player) {
    throw new Error(`找不到虛擬玩家 ${CREATOR_PLAYER_ID}`);
  }

  const [email, legacyEmail] = ambientEmailAliases(
    `ambient.creator.${player.id}`
  );
  const existingId = await findUserIdByEmails(admin, [email, legacyEmail]);
  if (existingId) {
    await upsertBotProfile(admin, {
      userId: existingId,
      displayName: player.displayName,
      avatarUrl: resolveVirtualPlayerAvatarUrl(player.id),
      role: "creator",
    });
    return { userId: existingId, displayName: player.displayName };
  }

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: "AmbientBot_NexusPlay_2026!",
    email_confirm: true,
    user_metadata: {
      display_name: player.displayName,
      role: "creator",
      ambient_bot: true,
      ambient_id: player.id,
    },
  });

  if (error || !data.user?.id) {
    throw new Error(error?.message ?? "建立 ambient creator 失敗");
  }

  await upsertBotProfile(admin, {
    userId: data.user.id,
    displayName: player.displayName,
    avatarUrl: resolveVirtualPlayerAvatarUrl(player.id),
    role: "creator",
  });

  return { userId: data.user.id, displayName: player.displayName };
}

async function main() {
  loadEnv();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      "缺少 NEXT_PUBLIC_SUPABASE_URL 或 SUPABASE_SERVICE_ROLE_KEY（.env.local）"
    );
  }

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  console.log("🃏 Neon Hold'em 虛擬遊戲 Seed…\n");

  const { userId: creatorId, displayName } =
    await ensureCreatorFromVirtualPlayer(admin);
  console.log(
    `✓ 創作者：${displayName} (${ambientCreatorBotEmail(CREATOR_PLAYER_ID)})`
  );
  console.log(`  userId=${creatorId}\n`);

  const description =
    "霓虹德州撲克：積分入場、24/7 常開牌桌，支援跟注、加注、棄牌與全下。每日簽到與任務累積籌碼，在雨夜牌局裡拼一把運氣與膽識。";
  const gameUrl = nativeReactGameUrl(NEON_HOLDEM_SLUG);
  const coverUrl = "/covers/neon-holdem-cover.png";
  const tags = ["卡牌", "策略", "賽博朋克", "多人", "休閒"];

  const { data: existing } = await admin
    .from("games")
    .select("id, slug, title, creator_id, game_url")
    .eq("slug", NEON_HOLDEM_SLUG)
    .maybeSingle();

  if (existing) {
    const { error: updateError } = await admin
      .from("games")
      .update({
        title: NEON_HOLDEM_TITLE,
        description,
        category: "卡牌",
        cover_url: coverUrl,
        game_url: gameUrl,
        creator_id: creatorId,
        publish_status: "public",
        status: "approved",
        tags,
        viewport_width: 1100,
        viewport_height: 720,
        fullscreen_button: true,
        ai_disclosed: true,
        ai_content_types: ["graphics", "sound", "code"],
        details_html: `<p><strong>霓虹德州撲克</strong> — ${description}</p>`,
        pricing_type: "free",
        price: 0,
        currency: "USD",
      })
      .eq("slug", NEON_HOLDEM_SLUG);

    if (updateError) {
      throw new Error(`更新失敗：${updateError.message}`);
    }
    console.log(
      `✓ 已更新既有遊戲：${NEON_HOLDEM_TITLE} (id=${existing.id}, slug=${NEON_HOLDEM_SLUG})`
    );
  } else {
    const { data, error } = await admin
      .from("games")
      .insert({
        title: NEON_HOLDEM_TITLE,
        description,
        category: "卡牌",
        cover_url: coverUrl,
        game_url: gameUrl,
        creator_id: creatorId,
        created_at: new Date(Date.now() - 2 * 86_400_000).toISOString(),
        plays_count: 3_640,
        rating_avg: 4.76,
        publish_status: "public",
        status: "approved",
        slug: NEON_HOLDEM_SLUG,
        tags,
        viewport_width: 1100,
        viewport_height: 720,
        fullscreen_button: true,
        ai_disclosed: true,
        ai_content_types: ["graphics", "sound", "code"],
        details_html: `<p><strong>霓虹德州撲克</strong> — ${description}</p>`,
        pricing_type: "free",
        price: 0,
        currency: "USD",
      })
      .select("id, slug, title")
      .single();

    if (error) {
      throw new Error(`插入失敗：${error.message}`);
    }
    console.log(
      `✓ 已新增遊戲：${data.title} (id=${data.id}, slug=${data.slug})`
    );
  }

  console.log("\n✅ 完成。首頁卡片／搜尋應可見；遊玩路徑：/game/neon-holdem");
}

main().catch((error) => {
  console.error("Seed 失敗：", error instanceof Error ? error.message : error);
  process.exit(1);
});
