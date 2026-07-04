import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

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

function isCreator(user) {
  const role = user.user_metadata?.role;
  const developing = user.user_metadata?.developing_games;
  return role === "creator" || developing === true;
}

async function listCreatorUsers(admin) {
  const creators = [];
  let page = 1;
  const perPage = 200;

  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;

    for (const user of data.users ?? []) {
      if (isCreator(user)) {
        creators.push(user);
      }
    }

    if ((data.users?.length ?? 0) < perPage) break;
    page += 1;
  }

  return creators;
}

async function main() {
  loadEnv();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const gameTitle = process.argv[2] ?? "VOID GACHA";
  const creatorEmail = process.argv[3];

  if (!url || !serviceKey) {
    console.error("缺少 NEXT_PUBLIC_SUPABASE_URL 或 SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: game, error: gameError } = await admin
    .from("games")
    .select("id, title, creator_id")
    .eq("title", gameTitle)
    .maybeSingle();

  if (gameError) {
    console.error("讀取遊戲失敗：", gameError.message);
    process.exit(1);
  }

  if (!game) {
    console.error(`找不到遊戲「${gameTitle}」`);
    process.exit(1);
  }

  console.log(`遊戲：${game.title} (id=${game.id})`);
  console.log(`目前 creator_id：${game.creator_id ?? "NULL（未綁定）"}`);

  if (game.creator_id) {
    console.log("✓ 此遊戲已綁定創作者，無需重複操作。");
    return;
  }

  let targetUser = null;

  if (creatorEmail) {
    const { data: usersData, error: listError } =
      await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (listError) throw listError;
    targetUser = (usersData.users ?? []).find(
      (user) => user.email?.toLowerCase() === creatorEmail.toLowerCase()
    );
    if (!targetUser) {
      console.error(`找不到 email 為 ${creatorEmail} 的使用者`);
      process.exit(1);
    }
  } else {
    const creators = await listCreatorUsers(admin);
    if (creators.length === 0) {
      console.error("找不到任何創作者帳號。請指定 email：");
      console.error('  npm run db:assign-creator -- "VOID GACHA" your@email.com');
      process.exit(1);
    }
    if (creators.length > 1) {
      console.log("找到多位創作者，請指定 email：");
      for (const user of creators) {
        console.log(`  - ${user.email} (${user.id})`);
      }
      console.error('\n用法：npm run db:assign-creator -- "VOID GACHA" your@email.com');
      process.exit(1);
    }
    targetUser = creators[0];
  }

  const { data: updated, error: updateError } = await admin
    .from("games")
    .update({ creator_id: targetUser.id })
    .eq("id", game.id)
    .is("creator_id", null)
    .select("id, title, creator_id")
    .single();

  if (updateError) {
    console.error("綁定失敗：", updateError.message);
    process.exit(1);
  }

  console.log(`\n✅ 已將「${updated.title}」綁定至：`);
  console.log(`   ${targetUser.email}`);
  console.log(`   user id: ${updated.creator_id}`);
}

main().catch((error) => {
  console.error("執行失敗：", error.message);
  process.exit(1);
});
