import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

const SUPPORTER_BADGE_V1 = "supporter_v1";
const SUPPORTER_BADGE_V2 = "supporter_v2";
const TITLE_V1 = "平台支持者";
const TITLE_V2 = "熱心支持者";

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

async function findUserByEmail(admin, email) {
  let page = 1;
  const perPage = 200;
  const target = email.trim().toLowerCase();

  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;

    const match = (data.users ?? []).find(
      (user) => user.email?.toLowerCase() === target
    );
    if (match) return match;

    if ((data.users?.length ?? 0) < perPage) break;
    page += 1;
  }

  return null;
}

function resolveBadge(tierArg) {
  const normalized = String(tierArg ?? "")
    .trim()
    .toLowerCase();
  if (normalized === "svip" || normalized === "v2" || normalized === "premium") {
    return SUPPORTER_BADGE_V2;
  }
  return SUPPORTER_BADGE_V1;
}

async function grantSupporterTitles(admin, userId, badge) {
  const primaryName = badge === SUPPORTER_BADGE_V2 ? TITLE_V2 : TITLE_V1;

  const { data: titles, error: titlesError } = await admin
    .from("titles")
    .select("id, name")
    .in("name", [TITLE_V1, TITLE_V2]);

  if (titlesError) {
    console.warn("稱號表讀取警告：", titlesError.message);
    return;
  }

  const titleMap = new Map((titles ?? []).map((row) => [row.name, row.id]));
  const primaryId = titleMap.get(primaryName);
  const basicId = titleMap.get(TITLE_V1);

  if (!primaryId) {
    console.warn("找不到支持者稱號，請先執行 npm run db:supporter-titles");
    return;
  }

  if (basicId) {
    await admin.from("user_titles").upsert(
      { user_id: userId, title_id: basicId },
      { onConflict: "user_id,title_id", ignoreDuplicates: true }
    );
  }

  await admin.from("user_titles").upsert(
    { user_id: userId, title_id: primaryId },
    { onConflict: "user_id,title_id", ignoreDuplicates: true }
  );

  const { data: profile } = await admin
    .from("profiles")
    .select("equipped_title_id")
    .eq("id", userId)
    .maybeSingle();

  let shouldEquip = false;

  if (profile?.equipped_title_id) {
    const { data: equippedTitle } = await admin
      .from("titles")
      .select("name")
      .eq("id", profile.equipped_title_id)
      .maybeSingle();

    shouldEquip =
      equippedTitle?.name === TITLE_V1 || equippedTitle?.name === TITLE_V2;
  }

  if (shouldEquip) {
    await admin
      .from("profiles")
      .update({ equipped_title_id: primaryId })
      .eq("id", userId);
  }
}

async function main() {
  loadEnv();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const email = process.argv[2] ?? "chungwaikin232@gmail.com";
  const badge = resolveBadge(process.argv[3]);

  if (!url || !serviceKey) {
    console.error("缺少 NEXT_PUBLIC_SUPABASE_URL 或 SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const user = await findUserByEmail(admin, email);
  if (!user) {
    console.error(`找不到使用者：${email}`);
    process.exit(1);
  }

  const { data: existing } = await admin
    .from("profiles")
    .select("is_supporter, supporter_since, display_name")
    .eq("id", user.id)
    .maybeSingle();

  const { error: updateError } = await admin
    .from("profiles")
    .update({
      is_supporter: true,
      supporter_since: existing?.supporter_since ?? new Date().toISOString(),
      supporter_badge: badge,
    })
    .eq("id", user.id);

  if (updateError) {
    console.error("更新 profiles 失敗：", updateError.message);
    process.exit(1);
  }

  await grantSupporterTitles(admin, user.id, badge);

  const tierLabel = badge === SUPPORTER_BADGE_V2 ? "SVIP" : "VIP";

  console.log(`✓ 已授予 ${tierLabel} 測試資格`);
  console.log(`  帳號：${user.email ?? email}`);
  console.log(`  UID：${user.id}`);
  console.log(`  顯示名稱：${existing?.display_name ?? "—"}`);
  console.log(`  supporter_badge：${badge}`);
  console.log("\n請在網站登出後重新登入，或硬刷新（Ctrl+Shift+R）再測試聊天變色。");
}

main().catch((error) => {
  console.error("執行失敗：", error.message);
  process.exit(1);
});
