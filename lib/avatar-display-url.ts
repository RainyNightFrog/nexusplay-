/**
 * 將外部 DiceBear URL 改寫為同源代理，避免手機端直接打 api.dicebear.com 失敗破圖。
 * 非 DiceBear URL（上傳檔、Google 等）原樣回傳。
 */
export function toDisplayAvatarUrl(
  url: string | null | undefined
): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith("/api/avatar/dicebear/")) {
    return trimmed;
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.hostname === "api.dicebear.com") {
      return `/api/avatar/dicebear${parsed.pathname}${parsed.search}`;
    }
    return trimmed;
  } catch {
    return trimmed;
  }
}
