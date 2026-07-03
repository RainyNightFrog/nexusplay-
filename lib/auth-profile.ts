import type { User } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { UserProfile, UserRole } from "@/lib/auth";

function normalizeRole(value: unknown): UserRole {
  return value === "creator" ? "creator" : "player";
}

export function profileFromUserMetadata(user: User): UserProfile {
  const metadata = user.user_metadata ?? {};

  return {
    id: user.id,
    display_name:
      (typeof metadata.display_name === "string" && metadata.display_name.trim()) ||
      user.email?.split("@")[0] ||
      "玩家",
    avatar_url:
      typeof metadata.avatar_url === "string" ? metadata.avatar_url : null,
    role: normalizeRole(metadata.role),
    created_at: user.created_at,
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
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url, role, created_at")
    .eq("id", user.id)
    .maybeSingle();

  if (!error && profile) {
    return {
      ...profile,
      role: normalizeRole(profile.role),
    };
  }

  if (error && !isMissingProfilesTable(error)) {
    throw new Error(error.message);
  }

  return profileFromUserMetadata(user);
}

export async function resolveUserRole(
  supabase: SupabaseClient,
  user: User
): Promise<UserRole> {
  const profile = await resolveUserProfile(supabase, user);
  return profile.role;
}
