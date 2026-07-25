/** 只允許站內相對路徑，阻擋 //evil.com、編碼繞過等開放重導 */
export function sanitizeInternalRedirect(
  redirectTo: string | null | undefined,
  fallback = "/"
): string {
  const value = (redirectTo ?? "").trim();
  if (!value.startsWith("/")) return fallback;
  if (value.startsWith("//")) return fallback;
  if (value.includes("://")) return fallback;
  if (value.includes("\\")) return fallback;
  if (/[\u0000-\u001f\u007f]/.test(value)) return fallback;
  if (/%0[ad]/i.test(value)) return fallback;

  try {
    const decoded = decodeURIComponent(value);
    if (!decoded.startsWith("/") || decoded.startsWith("//")) return fallback;
    if (decoded.includes("://") || decoded.includes("\\")) return fallback;
    if (/[\u0000-\u001f\u007f]/.test(decoded)) return fallback;
  } catch {
    return fallback;
  }

  return value;
}

/**
 * 密碼重設 redirectTo 僅允許本站 /auth/callback（或明確 allowlist 來源）。
 */
export function sanitizePasswordResetRedirectUrl(
  redirectTo: string | null | undefined,
  fallback: string
): string {
  const value = (redirectTo ?? "").trim();
  if (!value) return fallback;

  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") {
      return fallback;
    }
    if (url.username || url.password) {
      return fallback;
    }

    const hostname = url.hostname.toLowerCase();
    const allowedHosts = new Set([
      "rainynightfrog.com",
      "www.rainynightfrog.com",
      "localhost",
      "127.0.0.1",
    ]);

    const rootDomain = (
      process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "rainynightfrog.com"
    )
      .trim()
      .toLowerCase();
    allowedHosts.add(rootDomain);
    allowedHosts.add(`www.${rootDomain}`);

    try {
      const siteHost = process.env.NEXT_PUBLIC_SITE_URL
        ? new URL(process.env.NEXT_PUBLIC_SITE_URL).hostname.toLowerCase()
        : null;
      if (siteHost) allowedHosts.add(siteHost);
    } catch {
      /* ignore */
    }

    const isLocal =
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname.endsWith(".localhost");
    const isAllowedHost =
      allowedHosts.has(hostname) ||
      hostname.endsWith(`.${rootDomain}`) ||
      isLocal;

    if (!isAllowedHost) return fallback;
    if (!url.pathname.startsWith("/auth/callback")) return fallback;

    return url.toString();
  } catch {
    return fallback;
  }
}
