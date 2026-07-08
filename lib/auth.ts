import type { EquippedTitle } from "@/lib/titles";

export type UserRole = "player" | "creator";

export type UserProfile = {
  id: string;
  display_name: string;
  avatar_url: string | null;
  role: UserRole;
  is_admin: boolean;
  created_at: string;
  website: string | null;
  twitter: string | null;
  playing_games: boolean;
  developing_games: boolean;
  support_email: string | null;
  profile_public: boolean;
  show_in_leaderboard: boolean;
  equipped_title_id: string | null;
  equipped_title: EquippedTitle | null;
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
