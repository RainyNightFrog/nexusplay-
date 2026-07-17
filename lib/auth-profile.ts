import type { User } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { UserProfile, UserRole } from "@/lib/auth";
import { isAdminUser } from "@/lib/admin-auth";
import { resolveEquippedTitleForUser } from "@/lib/equipped-title-service";
import { profileFromUserMetadata } from "@/lib/profile-from-metadata";
import { resolveRoleFromPreferences } from "@/lib/profile-settings";

export { profileFromUserMetadata } from "@/lib/profile-from-metadata";

function normalizeRole(value: unknown): UserRole {
  return value === "creator" ? "creator" : "player";
}

function readOptionalString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function isMissingProfilesTable(error: { code?: string; message?: string } | null) {
  if (!error) return false;
  return (
    error.code === "PGRST205" ||
    error.message?.includes("profiles") ||
    error.message?.includes("schema cache")
  );
}

export async function resolveUserProfile(
  supabase: SupabaseClient,
  user: User
): Promise<UserProfile> {
  const metadataProfile = profileFromUserMetadata(user);

  const selectWithLifetime =
    "id, display_name, avatar_url, role, created_at, support_email, equipped_title_id, bio, player_number, is_supporter, supporter_since, supporter_badge, supporter_lifetime, username, is_admin";
  const selectBase =
    "id, display_name, avatar_url, role, created_at, support_email, equipped_title_id, bio, player_number, is_supporter, supporter_since, supporter_badge, username, is_admin";

  let profile: Record<string, unknown> | null = null;
  let error: { code?: string; message?: string } | null = null;

  {
    const result = await supabase
      .from("profiles")
      .select(selectWithLifetime)
      .eq("id", user.id)
      .maybeSingle();
    error = result.error;
    profile = result.data as Record<string, unknown> | null;

    if (
      error &&
      (error.message?.includes("supporter_lifetime") ||
        error.message?.includes("column"))
    ) {
      const fallback = await supabase
        .from("profiles")
        .select(selectBase)
        .eq("id", user.id)
        .maybeSingle();
      error = fallback.error;
      profile = fallback.data as Record<string, unknown> | null;
    }
  }

  if (!error && profile) {
    const dbIsAdmin = profile.is_admin === true;
    const isAdmin =
      isAdminUser(user) || metadataProfile.is_admin === true || dbIsAdmin;
    const developingGames =
      metadataProfile.developing_games ||
      normalizeRole(profile.role) === "creator" ||
      isAdmin;
    const equippedTitleId =
      typeof profile.equipped_title_id === "string"
        ? profile.equipped_title_id
        : null;
    const equippedTitle = equippedTitleId
      ? await resolveEquippedTitleForUser(supabase, user.id)
      : null;

    return {
      ...metadataProfile,
      player_number:
        typeof profile.player_number === "number"
          ? profile.player_number
          : profile.player_number != null
            ? Number(profile.player_number) || null
            : null,
      display_name:
        (typeof profile.display_name === "string" && profile.display_name) ||
        metadataProfile.display_name,
      username: readOptionalString(profile.username),
      avatar_url:
        (typeof profile.avatar_url === "string" ? profile.avatar_url : null) ??
        metadataProfile.avatar_url,
      role: resolveRoleFromPreferences(developingGames),
      is_admin: isAdmin,
      created_at:
        (typeof profile.created_at === "string" && profile.created_at) ||
        metadataProfile.created_at,
      developing_games: developingGames,
      support_email: readOptionalString(profile.support_email),
      bio: readOptionalString(profile.bio) ?? metadataProfile.bio,
      equipped_title_id: equippedTitleId,
      equipped_title: equippedTitle,
      is_supporter: profile.is_supporter === true,
      supporter_since: readOptionalString(profile.supporter_since),
      supporter_badge: readOptionalString(profile.supporter_badge),
      supporter_lifetime: profile.supporter_lifetime === true,
    };
  }

  if (error && !isMissingProfilesTable(error)) {
    throw new Error(error.message);
  }

  return metadataProfile;
}

export async function resolveUserRole(
  supabase: SupabaseClient,
  user: User
): Promise<UserRole> {
  const profile = await resolveUserProfile(supabase, user);
  return profile.role;
}

/** 創作者後台與上傳 API：創作者或超級管理員皆可 */
export function hasCreatorDashboardAccess(
  user: User,
  role: UserRole,
  isAdminFlag = false
): boolean {
  return isAdminUser(user) || isAdminFlag === true || role === "creator";
}
