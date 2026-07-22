/**
 * profiles 表：authenticated 在 security-hardening 後的可寫欄位。
 * 勿在 auth client 的 update/upsert 帶入 role / is_admin / 金流／supporter 等欄位。
 */
export const PROFILES_AUTH_UPDATE_COLUMNS = [
  "display_name",
  "avatar_url",
  "bio",
  "support_email",
  "equipped_title_id",
  "username",
] as const;

/** 僅容忍「表尚未建立／不在 schema cache」；權限錯誤必須回傳失敗 */
export function isMissingProfilesRelation(error: {
  code?: string;
  message?: string;
} | null) {
  if (!error) return false;
  return (
    error.code === "PGRST205" ||
    Boolean(
      error.message?.includes("schema cache") &&
        error.message?.includes("profiles")
    )
  );
}
