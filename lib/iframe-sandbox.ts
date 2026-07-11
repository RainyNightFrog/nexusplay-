/**
 * iframe sandbox tokens for embedded games.
 * Intentionally excludes allow-same-origin so sandboxed game JS cannot access
 * the parent origin's localStorage, cookies, or Supabase session.
 * Also excludes allow-top-navigation* to prevent hijacking the parent page.
 * Cloud save/load is proxied via GameEmbedBridge postMessage.
 */
export const IFRAME_SANDBOX =
  "allow-scripts allow-forms allow-pointer-lock";

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

  return `<iframe src="${escapedUrl}" width="${width}" height="${height}" frameborder="0" sandbox="${IFRAME_SANDBOX}" allowfullscreen referrerpolicy="no-referrer"></iframe>`;
}
