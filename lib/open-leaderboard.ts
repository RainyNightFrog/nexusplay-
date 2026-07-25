export const OPEN_LEADERBOARD_EVENT = "rnf-open-leaderboard";

/** 從手機選單等處請求開啟排行榜 */
export function requestOpenLeaderboard() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(OPEN_LEADERBOARD_EVENT));
}
