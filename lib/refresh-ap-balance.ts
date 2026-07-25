export const REFRESH_AP_BALANCE_EVENT = "rnf-refresh-ap-balance";

/** 任務領獎／商店異動後，通知頂欄 AP 餘額與商店面板重新拉取 */
export function requestRefreshApBalance() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(REFRESH_AP_BALANCE_EVENT));
}
