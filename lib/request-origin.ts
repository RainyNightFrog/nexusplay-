/**
 * 可信父頁／主站 Origin 檢查。
 * 拒絕 play.*（同 eTLD+1 仍屬 same-site，惡意 embed 可能 credentialed fetch）。
 */
import { getPlayHostname, getPlayOrigin } from "@/lib/play-origin";
import { getRootDomain } from "@/lib/subdomain";
import { NextResponse } from "next/server";

function isLocalHost(hostname: string) {
  const host = hostname.toLowerCase();
  return (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host.endsWith(".localhost")
  );
}

function collectTrustedHosts(): Set<string> {
  const hosts = new Set<string>();
  const root = getRootDomain();
  hosts.add(root);
  hosts.add(`www.${root}`);
  hosts.add("localhost");
  hosts.add("127.0.0.1");

  try {
    if (process.env.NEXT_PUBLIC_SITE_URL) {
      hosts.add(
        new URL(process.env.NEXT_PUBLIC_SITE_URL).hostname.toLowerCase()
      );
    }
  } catch {
    /* ignore */
  }

  return hosts;
}

function isPlayHostname(hostname: string) {
  const host = hostname.toLowerCase();
  const playHost = getPlayHostname();
  if (playHost && host === playHost) return true;
  if (host === "play.localhost") return true;
  if (host === `play.${getRootDomain()}`) return true;
  return false;
}

function isTrustedHostname(hostname: string) {
  const host = hostname.toLowerCase();
  if (isPlayHostname(host)) return false;

  const trusted = collectTrustedHosts();
  if (trusted.has(host)) return true;

  // 本機非 play 子網域（例如 void-gacha.localhost 已導向主站，一般不會打 API）
  if (isLocalHost(host) && !host.startsWith("play.")) return true;

  const root = getRootDomain();
  // 不信任任意子網域；僅 apex／www（已在 set）與明確 SITE_URL
  if (host === root || host === `www.${root}`) return true;

  return false;
}

function readRequestOrigin(request: Request): string | null {
  const origin = request.headers.get("origin")?.trim();
  if (origin) return origin;

  const referer = request.headers.get("referer")?.trim();
  if (!referer) return null;
  try {
    return new URL(referer).origin;
  } catch {
    return null;
  }
}

/**
 * 對會改狀態／讀敏感資料的 API：要求 Origin／Referer 來自主站，並拒絕 play。
 * 同站導覽（無 Origin）且 Sec-Fetch-Site 為 same-origin 時放行。
 */
export function assertTrustedBrowserOrigin(request: Request): NextResponse | null {
  const originHeader = request.headers.get("origin")?.trim();
  if (originHeader) {
    try {
      const host = new URL(originHeader).hostname;
      if (!isTrustedHostname(host)) {
        return NextResponse.json({ error: "拒絕的來源" }, { status: 403 });
      }
      return null;
    } catch {
      return NextResponse.json({ error: "拒絕的來源" }, { status: 403 });
    }
  }

  const referer = request.headers.get("referer")?.trim();
  if (referer) {
    try {
      const host = new URL(referer).hostname;
      if (!isTrustedHostname(host)) {
        return NextResponse.json({ error: "拒絕的來源" }, { status: 403 });
      }
      return null;
    } catch {
      return NextResponse.json({ error: "拒絕的來源" }, { status: 403 });
    }
  }

  const fetchSite = request.headers.get("sec-fetch-site")?.toLowerCase();
  if (fetchSite === "same-origin" || fetchSite === "none") {
    return null;
  }

  // 無 Origin／Referer 的跨站寫入：拒絕（可擋 play iframe credentialed fetch）
  if (fetchSite === "same-site" || fetchSite === "cross-site") {
    return NextResponse.json({ error: "拒絕的來源" }, { status: 403 });
  }

  // 舊瀏覽器／伺服器對伺服器：無 Sec-Fetch 時保守放行 GET；寫入方法拒絕
  const method = request.method.toUpperCase();
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") {
    return null;
  }

  return NextResponse.json({ error: "拒絕的來源" }, { status: 403 });
}

/** @deprecated 名稱保留；請用 assertTrustedBrowserOrigin */
export function rejectUntrustedOrigin(request: Request) {
  return assertTrustedBrowserOrigin(request);
}

export function getTrustedSiteOriginHint() {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    getPlayOrigin()?.replace(/^https:\/\/play\./, "https://") ||
    `https://${getRootDomain()}`
  );
}
