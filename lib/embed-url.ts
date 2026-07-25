import { getPlayHostname, getPlayOrigin } from "@/lib/play-origin";
import { getRootDomain } from "@/lib/subdomain";

/** Allow https game-files on Supabase storage, play embed, demos, or bundled HTML games. */
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

    const siteHosts = new Set<string>();
    const rootDomain = getRootDomain();
    siteHosts.add(rootDomain);
    siteHosts.add(`www.${rootDomain}`);
    siteHosts.add("localhost");
    siteHosts.add("127.0.0.1");

    const playHost = getPlayHostname();
    if (playHost) siteHosts.add(playHost);
    siteHosts.add("play.localhost");
    siteHosts.add(`play.${rootDomain}`);

    try {
      if (process.env.NEXT_PUBLIC_SITE_URL) {
        siteHosts.add(
          new URL(process.env.NEXT_PUBLIC_SITE_URL).hostname.toLowerCase()
        );
      }
      const playOrigin = getPlayOrigin();
      if (playOrigin) {
        siteHosts.add(new URL(playOrigin).hostname.toLowerCase());
      }
    } catch {
      /* ignore */
    }

    const host = parsed.hostname.toLowerCase();
    const isSiteHost =
      siteHosts.has(host) ||
      host.endsWith(`.${rootDomain}`) ||
      host.endsWith(".localhost");

    if (isSiteHost) {
      if (
        parsed.pathname.startsWith("/demos/") &&
        parsed.pathname.endsWith(".html")
      ) {
        return true;
      }
      if (
        parsed.pathname.startsWith("/games/") &&
        parsed.pathname.endsWith(".html")
      ) {
        return true;
      }
      if (
        parsed.pathname.startsWith("/api/games/") &&
        parsed.pathname.includes("/embed")
      ) {
        return true;
      }
      return false;
    }

    const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
      ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname.toLowerCase()
      : null;

    if (supabaseHost && host === supabaseHost) {
      return parsed.pathname.includes("/storage/v1/object/public/game-files/");
    }

    return false;
  } catch {
    return false;
  }
}
