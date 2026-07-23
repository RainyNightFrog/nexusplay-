import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import pg from "pg";

const { Client } = pg;

function loadEnv() {
  const content = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
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

function buildCandidates() {
  if (process.env.DATABASE_URL) return [process.env.DATABASE_URL];
  const password = process.env.SUPABASE_DB_PASSWORD;
  if (!password) return [];
  const projectUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const match = projectUrl.match(/https:\/\/([^.]+)\.supabase\.co/);
  if (!match) return [];
  const projectRef = match[1];
  const enc = encodeURIComponent(password);
  const region = process.env.SUPABASE_DB_REGION ?? "ap-southeast-1";
  return [
    process.env.SUPABASE_DB_URL,
    `postgresql://postgres.${projectRef}:${enc}@aws-1-${region}.pooler.supabase.com:5432/postgres`,
    `postgresql://postgres:${enc}@db.${projectRef}.supabase.co:5432/postgres`,
  ].filter(Boolean);
}

async function main() {
  loadEnv();
  const candidates = buildCandidates();
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
    console.error("Unable to connect");
    process.exit(1);
  }

  try {
    // Only scale once: if already 10x (common title >= 2000), skip
    const check = await client.query(
      `select cost_ap from ap_store_items where key = 'title_neon_nova' limit 1`
    );
    const current = Number(check.rows[0]?.cost_ap ?? 0);
    if (current >= 2000) {
      console.log("Prices already look 10x; skipping multiply.");
    } else {
      await client.query(`update public.ap_store_items set cost_ap = cost_ap * 10`);
      console.log("OK: all ap_store_items cost_ap multiplied by 10");
    }
    const after = await client.query(
      `select key, rarity, cost_ap from ap_store_items order by sort_order`
    );
    for (const row of after.rows) {
      console.log(`${row.key}\t${row.rarity}\t${row.cost_ap}`);
    }
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
