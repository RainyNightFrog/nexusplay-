import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import pg from "pg";

const { Client } = pg;

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

async function main() {
  loadEnv();
  const candidates = buildConnectionCandidates();
  if (candidates.length === 0) {
    console.error("缺少 SUPABASE_DB_PASSWORD 或 DATABASE_URL");
    process.exit(1);
  }

  let client = null;
  for (const connectionString of candidates) {
    const c = new Client({
      connectionString,
      ssl: { rejectUnauthorized: false },
    });
    try {
      await c.connect();
      client = c;
      break;
    } catch {
      await c.end().catch(() => undefined);
    }
  }
  if (!client) {
    console.error("無法連線資料庫");
    process.exit(1);
  }

  try {
    const sql = readFileSync(
      resolve(process.cwd(), "supabase/profile-player-number.sql"),
      "utf8"
    );
    await client.query(sql);

    const { rows } = await client.query(
      "select count(*)::int as total, min(player_number)::bigint as min_no, max(player_number)::bigint as max_no from public.profiles"
    );
    const stats = rows[0] ?? {};
    console.log("✓ profiles.player_number 欄位與註冊觸發器已就緒");
    console.log(
      `✓ 已分配 ${stats.total ?? 0} 個玩家 ID（#${stats.min_no ?? "?"} – #${stats.max_no ?? "?"}）`
    );
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error("執行失敗：", error.message);
  process.exit(1);
});
