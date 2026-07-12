const EXCHANGE_PREFIX = "supabase:oauth-exchange:";

export function beginAuthCodeExchange(code: string): boolean {
  if (typeof window === "undefined") return true;

  const key = `${EXCHANGE_PREFIX}${code}`;
  const state = window.sessionStorage.getItem(key);

  // 只擋已完成兌換的 code；開發模式 Strict Mode 會重跑 effect，不能擋 pending
  if (state === "done") {
    return false;
  }

  window.sessionStorage.setItem(key, "pending");
  return true;
}

export function completeAuthCodeExchange(code: string) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(`${EXCHANGE_PREFIX}${code}`, "done");
}

export function failAuthCodeExchange(code: string) {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(`${EXCHANGE_PREFIX}${code}`);
}

/** 讓瀏覽器有時間把 PKCE cookie 寫入後再跳轉到 Google */
export async function waitForAuthStorageFlush() {
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve());
    });
  });
}
