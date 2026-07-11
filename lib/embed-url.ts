/** Allow https game-files on Supabase storage, same-origin embed proxy, demos, or bundled HTML games. */
export function isSafeEmbedUrl(url: string): boolean {
  if (url.startsWith("/api/games/") && url.includes("/embed")) {
    return true;
  }
  if (url.startsWith("/demos/") && url.endsWith(".html")) {
    return true;
  }
  if (url.startsWith("/games/") && url.endsWith(".html")) {
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
    if (parsed.pathname.startsWith("/games/") && parsed.pathname.endsWith(".html")) {
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
