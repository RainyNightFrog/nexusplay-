/**
 * iframe sandbox tokens for embedded games.
 *
 * - play.*／主站 embed：給 allow-same-origin（相對該 origin 的 localStorage）。
 *   play 與主站不同源，讀不到主站 session cookie。
 * - 外站嵌入：不給 allow-same-origin。
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
