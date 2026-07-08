import { readFileSync } from "node:fs";
import { resolve } from "node:path";

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

async function main() {
  loadEnv();
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    console.error("缺少 CRON_SECRET（.env.local）");
    process.exit(1);
  }

  const channel = process.argv.find((arg) => arg.startsWith("--channel="))?.split("=")[1] ?? "world";
  const path =
    channel === "creator"
      ? "/api/cron/chat-ambient-creator"
      : "/api/cron/chat-ambient-world";

  const base =
    process.env.CHAT_AMBIENT_URL?.trim() ||
    `http://localhost:${process.env.PORT || 3000}${path}`;

  const response = await fetch(base, {
    headers: { Authorization: `Bearer ${secret}` },
  });

  const body = await response.json();
  if (!response.ok) {
    console.error("失敗：", body);
    process.exit(1);
  }

  console.log(`✓ 已發送${channel === "creator" ? "創作者" : "世界"}頻道虛擬聊天`, body);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
