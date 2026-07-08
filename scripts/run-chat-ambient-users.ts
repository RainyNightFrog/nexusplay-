import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  bootstrapAmbientCreatorChat,
  bootstrapAmbientWorldChat,
  ensureAllAmbientPlayers,
} from "../lib/chat-ambient-service";

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
  const bootstrap = process.argv.includes("--bootstrap");
  const result = await ensureAllAmbientPlayers();
  console.log(
    `✓ 虛擬聊天帳號就緒：${result.total} 個（新建 ${result.created.length}）`
  );
  if (result.created.length > 0) {
    console.log(result.created.join(", "));
  }

  if (bootstrap) {
    const world = await bootstrapAmbientWorldChat(8);
    const creator = await bootstrapAmbientCreatorChat(4);
    console.log(`✓ 世界頻道灌入 ${world.posted} 則（${world.rounds} 輪）`);
    console.log(`✓ 創作者頻道灌入 ${creator.posted} 則（${creator.rounds} 輪）`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
