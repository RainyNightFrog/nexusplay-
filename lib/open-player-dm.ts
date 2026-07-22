export const OPEN_PLAYER_DM_EVENT = "rnf-open-player-dm";

export type OpenPlayerDmDetail = {
  userId?: string;
  virtualPlayerId?: string;
};

/** 從論壇／排行榜等頁面請求開啟聊天室私訊 */
export function requestOpenPlayerDm(target: {
  userId?: string | null;
  virtualPlayerId?: string | null;
}) {
  if (typeof window === "undefined") return;
  const userId = target.userId?.trim() || undefined;
  const virtualPlayerId = target.virtualPlayerId?.trim() || undefined;
  if (!userId && !virtualPlayerId) return;
  window.dispatchEvent(
    new CustomEvent<OpenPlayerDmDetail>(OPEN_PLAYER_DM_EVENT, {
      detail: { userId, virtualPlayerId },
    })
  );
}
