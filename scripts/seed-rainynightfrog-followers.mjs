/**
 * 為 RainyNightFrog 創作者帳號新增追蹤者（bot 玩家）
 * 用法：node scripts/seed-rainynightfrog-followers.mjs [數量，預設 624]
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

const EMAIL_DOMAIN = "rainynightfrog.local";
const CREATOR_USERNAME = "rainynightfrog";
const DEFAULT_COUNT = 624;
const BATCH_SIZE = 50;

function loadEnv() {
  const envPath = resolve(process.cwd(), ".env.local");
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

function resolveSeedPassword() {
  const fromEnv = process.env.SEED_DEFAULT_PASSWORD?.trim();
  if (fromEnv) return fromEnv;
  console.warn(
    "[seed] SEED_DEFAULT_PASSWORD 未設定，改用開發預設密碼（請於 .env.local 設定）"
  );
  return "SeedPass_RainyNightFrog_2026!";
}

function followerEmail(index) {
  return `rnf.follower.${String(index).padStart(4, "0")}@${EMAIL_DOMAIN}`;
}

async function listAllUsers(admin) {
  const users = [];
  let page = 1;
  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    const batch = data?.users ?? [];
    users.push(...batch);
    if (batch.length < 1000) break;
    page += 1;
  }
  return users;
}

async function ensureFollowerUser(admin, usersByEmail, index) {
  const email = followerEmail(index);
  const existing = usersByEmail.get(email);
  if (existing) return existing.id;

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: resolveSeedPassword(),
    email_confirm: true,
    user_metadata: {
      display_name: `追蹤者${index}`,
      role: "player",
    },
  });
  if (error) throw new Error(`建立追蹤者 ${email} 失敗：${error.message}`);
  usersByEmail.set(email, data.user);
  return data.user.id;
}

async function upsertFollowerProfile(admin, userId, index) {
  const { data: existing, error: readError } = await admin
    .from("profiles")
    .select("id, player_number")
    .eq("id", userId)
    .maybeSingle();

  if (readError) throw new Error(readError.message);

  if (existing?.player_number != null) {
    const { error } = await admin
      .from("profiles")
      .update({ display_name: `追蹤者${index}`, role: "player" })
      .eq("id", userId);
    if (error) throw new Error(`profiles update 失敗：${error.message}`);
    return;
  }

  const { data: playerNumber, error: rpcError } = await admin.rpc(
    "allocate_profile_player_number"
  );
  if (rpcError) throw new Error(`分配 player_number 失敗：${rpcError.message}`);

  const { error } = await admin.from("profiles").upsert(
    {
      id: userId,
      display_name: `追蹤者${index}`,
      role: "player",
      player_number: playerNumber,
    },
    { onConflict: "id" }
  );
  if (error) throw new Error(`profiles upsert 失敗：${error.message}`);
}

async function findCreatorId(admin) {
  const { data: byUsername, error: usernameError } = await admin
    .from("profiles")
    .select("id, display_name, username")
    .eq("username", CREATOR_USERNAME)
    .maybeSingle();

  if (usernameError) throw usernameError;
  if (byUsername?.id) return byUsername;

  const { data: byName, error: nameError } = await admin
    .from("profiles")
    .select("id, display_name, username")
    .eq("display_name", "RainyNightFrog")
    .maybeSingle();

  if (nameError) throw nameError;
  if (byName?.id) return byName;

  throw new Error(`找不到創作者 RainyNightFrog（username: ${CREATOR_USERNAME}）`);
}

async function main() {
  loadEnv();

  const addCount = Math.max(1, Number(process.argv[2]) || DEFAULT_COUNT);
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.error("缺少 NEXT_PUBLIC_SUPABASE_URL 或 SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const creator = await findCreatorId(admin);
  console.log(`🐸 目標創作者：${creator.display_name} (@${creator.username ?? "—"}) id=${creator.id}`);

  const { count: beforeCount, error: countError } = await admin
    .from("creator_follows")
    .select("*", { count: "exact", head: true })
    .eq("creator_id", creator.id);

  if (countError) throw countError;
  console.log(`目前追蹤者：${beforeCount ?? 0} 人`);
  console.log(`準備新增：${addCount} 人\n`);

  const allUsers = await listAllUsers(admin);
  const usersByEmail = new Map(allUsers.map((user) => [user.email, user]));

  let inserted = 0;
  let skipped = 0;
  let index = 1;

  while (inserted < addCount) {
    const batchFollowerIds = [];

    for (let i = 0; i < BATCH_SIZE && inserted + batchFollowerIds.length < addCount; i++) {
      while (index < 100000) {
        const userId = await ensureFollowerUser(admin, usersByEmail, index);
        await upsertFollowerProfile(admin, userId, index);
        index += 1;

        if (userId === creator.id) continue;

        const { data: existingFollow } = await admin
          .from("creator_follows")
          .select("follower_id")
          .eq("follower_id", userId)
          .eq("creator_id", creator.id)
          .maybeSingle();

        if (!existingFollow) {
          batchFollowerIds.push(userId);
          break;
        }
        skipped += 1;
      }
    }

    if (!batchFollowerIds.length) break;

    const rows = batchFollowerIds.map((followerId) => ({
      follower_id: followerId,
      creator_id: creator.id,
    }));

    const { error: insertError } = await admin
      .from("creator_follows")
      .upsert(rows, { onConflict: "follower_id,creator_id", ignoreDuplicates: true });

    if (insertError) throw insertError;

    inserted += batchFollowerIds.length;
    process.stdout.write(`\r已新增 ${inserted}/${addCount}…`);
  }

  const { count: afterCount, error: afterError } = await admin
    .from("creator_follows")
    .select("*", { count: "exact", head: true })
    .eq("creator_id", creator.id);

  if (afterError) throw afterError;

  console.log(`\n\n✅ 完成！本次新增 ${inserted} 人，略過既有 ${skipped} 人`);
  console.log(`   RainyNightFrog 追蹤者總數：${afterCount ?? 0}`);
}

main().catch((error) => {
  console.error("\n種子失敗：", error.message);
  process.exit(1);
});
