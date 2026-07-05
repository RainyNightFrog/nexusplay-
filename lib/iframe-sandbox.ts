/**
 * iframe sandbox tokens for embedded games.
 * Intentionally excludes allow-top-navigation and
 * allow-top-navigation-by-user-activation to prevent hijacking the parent page.
 */
export const IFRAME_SANDBOX =
  "allow-scripts allow-same-origin allow-popups allow-forms";

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
