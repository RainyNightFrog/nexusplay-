export type UserRole = "player" | "creator";

export type UserProfile = {
  id: string;
  display_name: string;
  avatar_url: string | null;
  role: UserRole;
  created_at: string;
  website: string | null;
  twitter: string | null;
  playing_games: boolean;
  developing_games: boolean;
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
