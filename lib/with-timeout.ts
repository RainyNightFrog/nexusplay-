/** 共用逾時：Auth Admin／API 讀取預設約 8–10 秒 */

export const AUTH_ADMIN_TIMEOUT_MS = 9_000;
export const API_FETCH_TIMEOUT_MS = 9_000;
export const AMBIENT_BOOTSTRAP_BUDGET_MS = 10_000;
export const SERVER_QUERY_TIMEOUT_MS = 9_000;

export class TimeoutError extends Error {
  constructor(message = "timeout") {
    super(message);
    this.name = "TimeoutError";
  }
}

export function isTimeoutError(error: unknown): boolean {
  if (error instanceof TimeoutError) return true;
  if (error instanceof DOMException && error.name === "AbortError") return true;
  if (error instanceof Error) {
    const lower = error.message.toLowerCase();
    return lower.includes("timed out") || lower.includes("timeout");
  }
  return false;
}

export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  label = "operation"
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          reject(
            new TimeoutError(`${label} timed out after ${timeoutMs}ms`)
          );
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}
