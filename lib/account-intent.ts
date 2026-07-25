import type { UserRole } from "@/lib/auth";
import { sanitizeInternalRedirect } from "@/lib/safe-redirect";

export type AccountIntent = UserRole;

export function buildChooseRolePath(redirectTo: string) {
  const safeRedirect = sanitizeInternalRedirect(redirectTo);
  return `/auth/choose-role?redirect=${encodeURIComponent(safeRedirect)}`;
}

export function shouldSkipAccountIntent(user: {
  user_metadata?: Record<string, unknown>;
  app_metadata?: Record<string, unknown>;
}): boolean {
  // 不可再信 user_metadata.role=admin（可偽造）；僅 service app_metadata 或已選過意圖
  if (user.app_metadata?.role === "admin") return true;
  const metadata = user.user_metadata ?? {};
  return (
    typeof metadata.account_intent_at === "string" &&
    metadata.account_intent_at.length > 0
  );
}

export function readAccountIntentFromMetadata(user: {
  user_metadata?: Record<string, unknown>;
}): AccountIntent {
  const metadata = user.user_metadata ?? {};
  if (metadata.role === "creator" || metadata.developing_games === true) {
    return "creator";
  }
  return "player";
}

export function accountIntentToProfile(intent: AccountIntent) {
  return {
    developing_games: intent === "creator",
    role: intent,
  };
}
