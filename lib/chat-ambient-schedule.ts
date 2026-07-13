import type { ChatChannel } from "@/lib/chat";

const isDevAmbient = process.env.NODE_ENV === "development";

/** 虛擬聊天發言間隔（與 Vercel Cron 週期對齊；本機開發縮短以便測試） */
export const AMBIENT_POST_INTERVAL_MS: Record<ChatChannel, number> = {
  world: isDevAmbient ? 90_000 : 6 * 60_000,
  creator: isDevAmbient ? 3 * 60_000 : 18 * 60_000,
};

/** 初次無訊息時，避免短時間內重複灌入 */
export const AMBIENT_SEED_COOLDOWN_MS = isDevAmbient ? 2 * 60_000 : 10 * 60_000;

/** 依香港時間判斷時段用 */
export const AMBIENT_TIMEZONE = "Asia/Hong_Kong";
