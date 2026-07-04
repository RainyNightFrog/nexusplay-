import type { User } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { UserProfile, UserRole } from "@/lib/auth";
import { resolveRoleFromPreferences } from "@/lib/profile-settings";

function normalizeRole(value: unknown): UserRole {
  return value === "creator" ? "creator" : "player";
}

function readBoolean(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

function readOptionalString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function profileFromUserMetadata(user: User): UserProfile {
  const metadata = user.user_metadata ?? {};
  const isAdmin = metadata.role === "admin";
  const role = isAdmin ? "player" : normalizeRole(metadata.role);
  const developingGames = readBoolean(
    metadata.developing_games,
    role === "creator"
  );

  return {
    id: user.id,
    display_name:
      (typeof metadata.display_name === "string" && metadata.display_name.trim()) ||
      user.email?.split("@")[0] ||
      "玩家",
    avatar_url:
      typeof metadata.avatar_url === "string" ? metadata.avatar_url : null,
    role: isAdmin ? "player" : resolveRoleFromPreferences(developingGames),
    is_admin: isAdmin,
    created_at: user.created_at,
    website: readOptionalString(metadata.website),
    twitter: readOptionalString(metadata.twitter),
    playing_games: readBoolean(metadata.playing_games, true),
    developing_games: developingGames,
  };
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
    .select("id, display_name, avatar_url, role, created_at")
    .eq("id", user.id)
    .maybeSingle();

  if (!error && profile) {
    const isAdmin = metadataProfile.is_admin;
    const developingGames =
      metadataProfile.developing_games || normalizeRole(profile.role) === "creator";

    return {
      ...metadataProfile,
      display_name: profile.display_name || metadataProfile.display_name,
      avatar_url: profile.avatar_url ?? metadataProfile.avatar_url,
      role: isAdmin ? "player" : resolveRoleFromPreferences(developingGames),
      is_admin: isAdmin,
      created_at: profile.created_at ?? metadataProfile.created_at,
      developing_games: developingGames,
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
