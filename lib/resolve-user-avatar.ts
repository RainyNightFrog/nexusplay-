/**
 * 解析玩家頭像：優先 profiles.avatar_url，其次 Auth metadata（OAuth 圖等）。
 */
export function resolveUserAvatarUrl(
  profileAvatar: string | null | undefined,
  metadata?: Record<string, unknown> | null
): string | null {
  const fromProfile =
    typeof profileAvatar === "string" && profileAvatar.trim()
      ? profileAvatar.trim()
      : null;
  if (fromProfile) return fromProfile;

  if (!metadata) return null;

  for (const key of ["avatar_url", "picture"] as const) {
    const value = metadata[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return null;
}
