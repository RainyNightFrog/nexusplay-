import type { ChatChannel } from "@/lib/chat";

const isDevAmbient = process.env.NODE_ENV === "development";

/** 虛擬聊天發言間隔（有人開聊天／Cron 觸發時檢查；本機開發再縮短） */
export const AMBIENT_POST_INTERVAL_MS: Record<ChatChannel, number> = {
  world: isDevAmbient ? 45_000 : 2 * 60_000,
  creator: isDevAmbient ? 90_000 : 6 * 60_000,
};

/** 閒置過久時一次補發的最大輪數（每輪 1～2 則） */
export const AMBIENT_CATCH_UP_MAX_ROUNDS: Record<ChatChannel, number> = {
  world: 3,
  creator: 2,
};

/** 初次無訊息時，避免短時間內重複灌入 */
export const AMBIENT_SEED_COOLDOWN_MS = isDevAmbient ? 60_000 : 5 * 60_000;

/** 依香港時間判斷時段用 */
export const AMBIENT_TIMEZONE = "Asia/Hong_Kong";
