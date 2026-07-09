/** 解析 API 回應；避免 HTML 錯誤頁觸發 Unexpected token '<' */
export async function readApiJson<T extends Record<string, unknown>>(
  response: Response
): Promise<T & { error?: string }> {
  const contentType = response.headers.get("content-type") ?? "";
  const raw = await response.text();

  if (contentType.includes("application/json") || raw.trimStart().startsWith("{")) {
    try {
      return JSON.parse(raw) as T & { error?: string };
    } catch {
      /* fall through */
    }
  }

  if (response.status === 413) {
    return {
      error:
        "上傳檔案過大（正式站單次請求上限約 4 MB）。請壓縮 zip 後再試，或先只更新設定、不附 zip。",
    } as T & { error?: string };
  }

  if (response.status === 504 || response.status === 502) {
    return {
      error: "伺服器處理逾時或暫時無法連線，請稍後再試。",
    } as T & { error?: string };
  }

  if (raw.includes("<!DOCTYPE") || raw.includes("<html")) {
    return {
      error:
        "伺服器回傳異常（非 JSON）。若剛上傳 zip，可能是檔案過大或伺服器解壓失敗，請壓縮後再試或聯絡平台管理員。",
    } as T & { error?: string };
  }

  return {
    error: raw.trim().slice(0, 240) || "請求失敗，請稍後再試",
  } as T & { error?: string };
}
