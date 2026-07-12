/** 只允許站內相對路徑，阻擋 //evil.com 等協議相對 URL 開放重導 */
export function sanitizeInternalRedirect(
  redirectTo: string | null | undefined,
  fallback = "/"
): string {
  const value = (redirectTo ?? "").trim();
  if (!value.startsWith("/")) return fallback;
  if (value.startsWith("//")) return fallback;
  if (value.includes("://")) return fallback;
  if (value.includes("\\")) return fallback;
  return value;
}
