import type { User } from "@supabase/supabase-js";
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

/** Build a UserProfile from Supabase auth user_metadata (client-safe). */
export function profileFromUserMetadata(user: User): UserProfile {
  const metadata = user.user_metadata ?? {};
  const isAdmin = metadata.role === "admin";
  const role = isAdmin ? "player" : normalizeRole(metadata.role);
  const developingGames = readBoolean(
    metadata.developing_games,
    role === "creator" || isAdmin
  );

  return {
    id: user.id,
    player_number: null,
    display_name:
      (typeof metadata.display_name === "string" && metadata.display_name.trim()) ||
      user.email?.split("@")[0] ||
      "玩家",
    avatar_url:
      typeof metadata.avatar_url === "string" ? metadata.avatar_url : null,
    role: isAdmin ? "player" : resolveRoleFromPreferences(developingGames),
    is_admin: isAdmin,
    created_at: user.created_at,
    bio: readOptionalString(metadata.bio),
    website: readOptionalString(metadata.website),
    twitter: readOptionalString(metadata.twitter),
    playing_games: readBoolean(metadata.playing_games, true),
    developing_games: developingGames,
    support_email: null,
    profile_public: readBoolean(metadata.profile_public, true),
    show_in_leaderboard: readBoolean(metadata.show_in_leaderboard, true),
    equipped_title_id: null,
    equipped_title: null,
    is_supporter: false,
    supporter_since: null,
    supporter_badge: null,
  };
}
