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

async function main() {
  loadEnv();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const email = process.argv[2] ?? "chungwaikin232@gmail.com";

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

  const nextMetadata = {
    ...(user.user_metadata ?? {}),
    role: "admin",
  };

  const { data, error } = await admin.auth.admin.updateUserById(user.id, {
    user_metadata: nextMetadata,
  });

  if (error) {
    console.error("更新失敗：", error.message);
    process.exit(1);
  }

  console.log("✓ 已設定為超級管理員");
  console.log(`  帳號：${data.user?.email ?? email}`);
  console.log(`  UID：${data.user?.id ?? user.id}`);
  console.log(`  user_metadata.role：${data.user?.user_metadata?.role ?? "admin"}`);
  console.log("\n請在網站登出後重新登入，JWT 才會帶上 admin 權限。");
}

main().catch((error) => {
  console.error("執行失敗：", error.message);
  process.exit(1);
});
