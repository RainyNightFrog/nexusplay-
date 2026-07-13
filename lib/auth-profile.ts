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

  const { data: profile, error } = await supabase
    .from("profiles")
    .select(
      "id, display_name, avatar_url, role, created_at, support_email, equipped_title_id, bio, player_number, is_supporter, supporter_since, supporter_badge, username"
    )
    .eq("id", user.id)
    .maybeSingle();

  if (!error && profile) {
    const isAdmin = isAdminUser(user) || metadataProfile.is_admin === true;
    const developingGames =
      metadataProfile.developing_games || normalizeRole(profile.role) === "creator";
    const equippedTitle = profile.equipped_title_id
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
      display_name: profile.display_name || metadataProfile.display_name,
      username: readOptionalString(profile.username),
      avatar_url: profile.avatar_url ?? metadataProfile.avatar_url,
      role: isAdmin ? "player" : resolveRoleFromPreferences(developingGames),
      is_admin: isAdmin,
      created_at: profile.created_at ?? metadataProfile.created_at,
      developing_games: developingGames,
      support_email: readOptionalString(profile.support_email),
      bio: readOptionalString(profile.bio) ?? metadataProfile.bio,
      equipped_title_id: profile.equipped_title_id ?? null,
      equipped_title: equippedTitle,
      is_supporter: profile.is_supporter === true,
      supporter_since: readOptionalString(profile.supporter_since),
      supporter_badge: readOptionalString(profile.supporter_badge),
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
  role: UserRole
): boolean {
  return isAdminUser(user) || role === "creator";
}
