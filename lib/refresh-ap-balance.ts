export const REFRESH_AP_BALANCE_EVENT = "rnf-refresh-ap-balance";

/** 任務領獎／商店異動後，通知頂欄與商店面板刷新 AP 餘額（輕量，非整頁商店重載） */
export function requestRefreshApBalance() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(REFRESH_AP_BALANCE_EVENT));
}
