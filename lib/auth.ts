import type { EquippedTitle } from "@/lib/titles";
import type { ProfileShowcaseTagId } from "@/lib/profile-showcase-tags";

export type UserRole = "player" | "creator";

export type UserProfile = {
  id: string;
  player_number: number | null;
  display_name: string;
  username: string | null;
  avatar_url: string | null;
  role: UserRole;
  is_admin: boolean;
  created_at: string;
  bio: string | null;
  website: string | null;
  twitter: string | null;
  playing_games: boolean;
  developing_games: boolean;
  support_email: string | null;
  profile_public: boolean;
  show_in_leaderboard: boolean;
  profile_showcase_tags: ProfileShowcaseTagId[];
  equipped_title_id: string | null;
  equipped_title: EquippedTitle | null;
  stripe_account_id?: string | null;
  stripe_details_submitted?: boolean;
  is_supporter: boolean;
  supporter_since: string | null;
  supporter_badge: string | null;
};

export function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

export function isCreator(profile: UserProfile | null | undefined) {
  return profile?.role === "creator";
}

export function isAdmin(profile: UserProfile | null | undefined) {
  return profile?.is_admin === true;
}
