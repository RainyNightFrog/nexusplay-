import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import pg from "pg";

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

loadEnv();
const password = process.env.SUPABASE_DB_PASSWORD;
const projectUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const match = projectUrl.match(/https:\/\/([^.]+)\.supabase\.co/);
const projectRef = match[1];
const encodedPassword = encodeURIComponent(password);
const region = process.env.SUPABASE_DB_REGION ?? "ap-southeast-1";
const cs = `postgresql://postgres.${projectRef}:${encodedPassword}@aws-1-${region}.pooler.supabase.com:5432/postgres`;

const client = new pg.Client({ connectionString: cs, ssl: { rejectUnauthorized: false } });
await client.connect();

for (const table of ["forum_posts", "forum_comments"]) {
  const { rows } = await client.query(
    `select column_name, data_type, is_nullable
     from information_schema.columns
     where table_schema = 'public' and table_name = $1
     order by ordinal_position`,
    [table]
  );
  console.log(`\n${table}:`);
  for (const row of rows) {
    console.log(`  ${row.column_name}: ${row.data_type} (nullable=${row.is_nullable})`);
  }
}

await client.end();
