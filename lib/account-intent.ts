import type { UserRole } from "@/lib/auth";
import { sanitizeInternalRedirect } from "@/lib/safe-redirect";

export type AccountIntent = UserRole;

export function buildChooseRolePath(redirectTo: string) {
  const safeRedirect = sanitizeInternalRedirect(redirectTo);
  return `/auth/choose-role?redirect=${encodeURIComponent(safeRedirect)}`;
}

export function shouldSkipAccountIntent(user: {
  user_metadata?: Record<string, unknown>;
}): boolean {
  const metadata = user.user_metadata ?? {};
  if (metadata.role === "admin") return true;
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
