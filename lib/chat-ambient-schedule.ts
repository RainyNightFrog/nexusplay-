import type { ChatChannel } from "@/lib/chat";

/** 虛擬聊天發言間隔（與 Vercel Cron 週期對齊） */
export const AMBIENT_POST_INTERVAL_MS: Record<ChatChannel, number> = {
  world: 6 * 60_000,
  creator: 18 * 60_000,
};

/** 初次無訊息時，避免短時間內重複灌入 */
export const AMBIENT_SEED_COOLDOWN_MS = 10 * 60_000;

/** 依香港時間判斷時段用 */
export const AMBIENT_TIMEZONE = "Asia/Hong_Kong";
