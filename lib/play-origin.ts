import { getRootDomain } from "@/lib/subdomain";

function isLocalHost(hostname: string) {
  const host = hostname.toLowerCase();
  return (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host.endsWith(".localhost")
  );
}

/** 上傳遊戲 embed 專用 origin（無 session cookie） */
export function getPlayOrigin(): string | null {
  const configured = process.env.NEXT_PUBLIC_PLAY_ORIGIN?.trim().replace(
    /\/$/,
    ""
  );
  if (configured) return configured;

  if (process.env.NODE_ENV === "development") {
    const port = process.env.PORT?.trim() || "3000";
    return `http://play.localhost:${port}`;
  }

  if (
    process.env.VERCEL_ENV === "production" ||
    process.env.NODE_ENV === "production"
  ) {
    return `https://play.${getRootDomain()}`;
  }

  return null;
}

export function getPlayHostname(): string | null {
  const origin = getPlayOrigin();
  if (!origin) return null;
  try {
    return new URL(origin).hostname.toLowerCase();
  } catch {
    return null;
  }
}

export function isPlayEmbedHost(hostHeader: string | null | undefined): boolean {
  const hostname = (hostHeader ?? "").split(":")[0]?.trim().toLowerCase();
  if (!hostname) return false;

  const playHost = getPlayHostname();
  if (playHost && hostname === playHost) return true;

  // 後備：標籤為 play 的子網域（含 play.localhost）
  if (hostname === "play.localhost") return true;
  const root = getRootDomain();
  if (hostname === `play.${root}`) return true;

  return false;
}

/** play host 僅允許此路徑（遊戲資產嵌入） */
export function isPlayEmbedPath(pathname: string): boolean {
  return /^\/api\/games\/\d+\/embed(?:\/|$)/.test(pathname);
}

export function buildPlayEmbedUrl(gameId: number, assetPath = "index.html") {
  const path = `/api/games/${gameId}/embed/${assetPath.replace(/^\/+/, "")}`;
  const playOrigin = getPlayOrigin();
  if (playOrigin) {
    return `${playOrigin}${path}`;
  }
  return path;
}

function pushUnique(list: string[], value: string) {
  if (value && !list.includes(value)) list.push(value);
}

/** 父頁（主站）允許的 origin，供 postMessage 白名單 */
export function getAllowedParentOrigins(): string[] {
  const origins: string[] = [];
  const root = getRootDomain();

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "");
  if (siteUrl) {
    try {
      pushUnique(origins, new URL(siteUrl).origin);
    } catch {
      /* ignore */
    }
  }

  pushUnique(origins, `https://${root}`);
  pushUnique(origins, `https://www.${root}`);
  pushUnique(origins, "http://localhost:3000");
  pushUnique(origins, "http://127.0.0.1:3000");

  if (typeof window !== "undefined") {
    const host = window.location.hostname.toLowerCase();
    if (isLocalHost(host) && !host.startsWith("play.")) {
      pushUnique(origins, window.location.origin);
    }
  }

  return origins;
}

export function isAllowedParentOrigin(origin: string): boolean {
  return getAllowedParentOrigins().includes(origin);
}
