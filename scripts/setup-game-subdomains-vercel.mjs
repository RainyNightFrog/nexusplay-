/**
 * 將資料庫中的遊戲 slug 子網域加入 Vercel 專案（取得個別 SSL 憑證）
 *
 * 用法：npm run setup:game-subdomains-vercel
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { execSync } from "node:child_process";
import pg from "pg";

const { Client } = pg;
const DOMAIN = "rainynightfrog.com";

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

function buildConnectionCandidates() {
  const password = process.env.SUPABASE_DB_PASSWORD;
  const projectUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const match = projectUrl.match(/https:\/\/([^.]+)\.supabase\.co/);
  if (!password || !match) return [];

  const projectRef = match[1];
  const encodedPassword = encodeURIComponent(password);
  const region = process.env.SUPABASE_DB_REGION ?? "ap-southeast-1";

  return [
    `postgresql://postgres.${projectRef}:${encodedPassword}@aws-1-${region}.pooler.supabase.com:5432/postgres`,
    `postgresql://postgres.${projectRef}:${encodedPassword}@aws-0-${region}.pooler.supabase.com:5432/postgres`,
    `postgresql://postgres:${encodedPassword}@db.${projectRef}.supabase.co:5432/postgres`,
  ];
}

async function fetchSlugs() {
  const candidates = buildConnectionCandidates();
  for (const connectionString of candidates) {
    const client = new Client({
      connectionString,
      ssl: { rejectUnauthorized: false },
    });
    try {
      await client.connect();
      const { rows } = await client.query(
        "select slug from games where slug is not null order by id"
      );
      await client.end();
      return rows.map((row) => String(row.slug));
    } catch {
      await client.end().catch(() => {});
    }
  }
  throw new Error("無法連線資料庫讀取遊戲 slug");
}

async function main() {
  loadEnv();
  const slugs = await fetchSlugs();
  console.log(`找到 ${slugs.length} 個遊戲 slug，加入 Vercel 專案…\n`);

  for (const slug of slugs) {
    const host = `${slug}.${DOMAIN}`;
    try {
      execSync(`npx vercel domains add ${host}`, {
        stdio: "pipe",
        encoding: "utf8",
      });
      console.log(`✓ ${host}`);
    } catch (error) {
      const output =
        (error && typeof error === "object" && "stdout" in error
          ? String(error.stdout)
          : "") +
        (error && typeof error === "object" && "stderr" in error
          ? String(error.stderr)
          : "") +
        (error instanceof Error ? error.message : "");
      if (/already|exists|assigned/i.test(output)) {
        console.log(`– ${host}（已存在）`);
      } else {
        console.log(`✗ ${host}`);
        console.log(output.trim());
      }
    }
  }

  console.log("\n完成。Vercel 會為每個子網域自動簽發 SSL（通常 1–2 分鐘內生效）。");
}

main().catch((error) => {
  console.error(error.message ?? error);
  process.exit(1);
});
