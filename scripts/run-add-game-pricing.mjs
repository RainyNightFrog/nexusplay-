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
  if (process.env.DATABASE_URL) {
    return [process.env.DATABASE_URL];
  }

  const password = process.env.SUPABASE_DB_PASSWORD;
  if (!password) {
    return [];
  }

  const projectUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const match = projectUrl.match(/https:\/\/([^.]+)\.supabase\.co/);
  if (!match) {
    return [];
  }

  const projectRef = match[1];
  const encodedPassword = encodeURIComponent(password);
  const region = process.env.SUPABASE_DB_REGION ?? "ap-southeast-1";

  return [
    process.env.SUPABASE_DB_URL,
    `postgresql://postgres.${projectRef}:${encodedPassword}@aws-1-${region}.pooler.supabase.com:5432/postgres`,
    `postgresql://postgres.${projectRef}:${encodedPassword}@aws-0-${region}.pooler.supabase.com:5432/postgres`,
    `postgresql://postgres.${projectRef}:${encodedPassword}@aws-1-${region}.pooler.supabase.com:6543/postgres`,
    `postgresql://postgres.${projectRef}:${encodedPassword}@aws-0-${region}.pooler.supabase.com:6543/postgres`,
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

async function main() {
  loadEnv();

  const candidates = buildConnectionCandidates();
  if (candidates.length === 0) {
    console.error("缺少資料庫連線資訊。請在 .env.local 加入：");
    console.error("  SUPABASE_DB_PASSWORD=你的資料庫密碼");
    process.exit(1);
  }

  const client = await connectClient(candidates);
  console.log("已連線 Supabase Postgres。");

  try {
    const sqlPath = resolve(process.cwd(), "supabase/add-game-pricing.sql");
    const sql = readFileSync(sqlPath, "utf8");
    console.log("執行 supabase/add-game-pricing.sql …");
    await client.query(sql);
    console.log("✓ price、currency、pricing_type、min_price 已就緒");

    const { rows } = await client.query(`
      select column_name, data_type, column_default
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'games'
        and column_name in ('price', 'currency', 'pricing_type', 'min_price')
      order by column_name;
    `);

    console.log("\ngames 表新欄位：");
    for (const row of rows) {
      console.log(
        `  - ${row.column_name} (${row.data_type}, default ${row.column_default})`
      );
    }
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error("執行失敗：", error.message);
  process.exit(1);
});
