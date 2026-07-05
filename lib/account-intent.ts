import type { UserRole } from "@/lib/auth";

export type AccountIntent = UserRole;

export function buildChooseRolePath(redirectTo: string) {
  const safeRedirect = redirectTo.startsWith("/") ? redirectTo : "/";
  return `/auth/choose-role?redirect=${encodeURIComponent(safeRedirect)}`;
}

export function shouldSkipAccountIntent(user: {
  user_metadata?: Record<string, unknown>;
}): boolean {
  return user.user_metadata?.role === "admin";
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
