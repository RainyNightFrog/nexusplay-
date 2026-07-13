/**
 * iframe sandbox tokens for embedded games.
 *
 * - 同源嵌入（/api/games/.../embed）：需要 allow-same-origin，否則 origin 變成 null，
 *   localStorage／同源資源／PWA manifest 全部失敗（VOID GACHA 無法運作）。
 * - 外站嵌入：維持不給 allow-same-origin，避免外來腳本讀取平台 cookie／session。
 * - 一律不給 allow-top-navigation*，防止挾持父頁。
 */
export const IFRAME_SANDBOX_OPAQUE =
  "allow-scripts allow-forms allow-pointer-lock";

export const IFRAME_SANDBOX_SAME_ORIGIN =
  "allow-scripts allow-forms allow-pointer-lock allow-same-origin";

/** @deprecated 請改用 sandboxForEmbedUrl；預設為同源安全集合 */
export const IFRAME_SANDBOX = IFRAME_SANDBOX_SAME_ORIGIN;

export function sandboxForEmbedUrl(embedUrl: string | null | undefined) {
  const url = String(embedUrl || "");
  if (url.startsWith("/api/games/") && url.includes("/embed")) {
    return IFRAME_SANDBOX_SAME_ORIGIN;
  }
  if (/^https?:\/\//i.test(url)) {
    try {
      // 相對路徑以外的絕對 URL：僅平台自身網域才給同源
      const host = new URL(url, "https://rainynightfrog.com").hostname.toLowerCase();
      if (
        host === "rainynightfrog.com" ||
        host.endsWith(".rainynightfrog.com") ||
        host === "localhost" ||
        host.endsWith(".localhost")
      ) {
        return IFRAME_SANDBOX_SAME_ORIGIN;
      }
    } catch {
      /* fall through */
    }
    return IFRAME_SANDBOX_OPAQUE;
  }
  // /demos、/games 等同源靜態包
  if (url.startsWith("/")) {
    return IFRAME_SANDBOX_SAME_ORIGIN;
  }
  return IFRAME_SANDBOX_OPAQUE;
}

export function buildEmbedCode(
  embedUrl: string,
  width = 960,
  height = 600
) {
  const escapedUrl = embedUrl
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  const sandbox = sandboxForEmbedUrl(embedUrl);

  return `<iframe src="${escapedUrl}" width="${width}" height="${height}" frameborder="0" sandbox="${sandbox}" allowfullscreen referrerpolicy="no-referrer"></iframe>`;
}
