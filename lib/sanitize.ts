const HTML_ENTITIES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

/** Escape text for safe insertion into HTML attribute values or text nodes. */
export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => HTML_ENTITIES[char] ?? char);
}

/** Strip HTML tags and trim; used for user-provided title/description before storage. */
export function sanitizePlainText(
  value: string,
  maxLength: number
): string {
  const stripped = value
    .replace(/<[^>]*>/g, "")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .trim();

  if (stripped.length > maxLength) {
    return stripped.slice(0, maxLength);
  }

  return stripped;
}

/** Allow https game-files on Supabase storage, same-origin embed proxy, or demo previews. */
export function isSafeEmbedUrl(url: string): boolean {
  if (url.startsWith("/api/games/") && url.includes("/embed")) {
    return true;
  }
  if (url.startsWith("/demos/") && url.endsWith(".html")) {
    return true;
  }

  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return false;
    }
    if (parsed.pathname.startsWith("/demos/") && parsed.pathname.endsWith(".html")) {
      return true;
    }
    const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
      ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
      : null;
    if (supabaseHost && parsed.hostname === supabaseHost) {
      return parsed.pathname.includes("/storage/v1/object/public/game-files/");
    }
    return parsed.pathname.includes("/storage/v1/object/public/game-files/");
  } catch {
    return false;
  }
}
