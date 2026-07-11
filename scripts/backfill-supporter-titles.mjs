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

async function ensureTitleRows(client) {
  const sql = readFileSync(
    resolve(process.cwd(), "supabase/supporter-titles.sql"),
    "utf8"
  );
  await client.query(sql);
}

async function main() {
  loadEnv();
  const candidates = buildConnectionCandidates();
  if (candidates.length === 0) {
    console.error("缺少 SUPABASE_DB_PASSWORD");
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
    await ensureTitleRows(client);

    const titles = await client.query(
      `select id, name from public.titles where name in ('平台支持者', '熱心支持者')`
    );

    const titleMap = new Map(
      titles.rows.map((row) => [row.name, row.id])
    );

    const { rows: supporters } = await client.query(
      `select id, supporter_badge from public.profiles where is_supporter = true`
    );

    let synced = 0;

    for (const profile of supporters) {
      const badge = profile.supporter_badge ?? "supporter_v1";
      const primaryName = badge === "supporter_v2" ? "熱心支持者" : "平台支持者";
      const primaryId = titleMap.get(primaryName);
      const basicId = titleMap.get("平台支持者");
      if (!primaryId) continue;

      if (basicId) {
        await client.query(
          `insert into public.user_titles (user_id, title_id)
           values ($1, $2)
           on conflict (user_id, title_id) do nothing`,
          [profile.id, basicId]
        );
      }

      await client.query(
        `insert into public.user_titles (user_id, title_id)
         values ($1, $2)
         on conflict (user_id, title_id) do nothing`,
        [profile.id, primaryId]
      );

      const { rows: equippedRows } = await client.query(
        `select p.equipped_title_id, t.name
         from public.profiles p
         left join public.titles t on t.id = p.equipped_title_id
         where p.id = $1`,
        [profile.id]
      );
      const equipped = equippedRows[0];
      const shouldEquip =
        !equipped?.equipped_title_id ||
        equipped.name === "平台支持者" ||
        equipped.name === "熱心支持者";

      if (shouldEquip) {
        await client.query(
          `update public.profiles set equipped_title_id = $2 where id = $1`,
          [profile.id, primaryId]
        );
      }

      synced += 1;
    }

    console.log(`✓ 已為 ${synced} 位支持者補發稱號`);
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error("執行失敗：", error.message);
  process.exit(1);
});
