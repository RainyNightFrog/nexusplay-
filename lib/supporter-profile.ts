import type { SupabaseClient } from "@supabase/supabase-js";

export type SupporterProfileFlags = {
  isSupporter: boolean;
  badge: string | null;
};

export async function resolveSupporterProfiles(
  supabase: SupabaseClient,
  userIds: string[]
): Promise<Map<string, SupporterProfileFlags>> {
  const flags = new Map<string, SupporterProfileFlags>();
  const uniqueIds = [...new Set(userIds.filter(Boolean))];
  if (uniqueIds.length === 0) return flags;

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, is_supporter, supporter_badge")
    .in("id", uniqueIds);

  for (const userId of uniqueIds) {
    const profile = profiles?.find((row) => row.id === userId);
    flags.set(userId, {
      isSupporter: profile?.is_supporter === true,
      badge: profile?.supporter_badge ?? null,
    });
  }

  return flags;
}

export async function resolveSupporterFlags(
  supabase: SupabaseClient,
  userIds: string[]
): Promise<Map<string, boolean>> {
  const profiles = await resolveSupporterProfiles(supabase, userIds);
  const flags = new Map<string, boolean>();

  for (const [userId, profile] of profiles) {
    flags.set(userId, profile.isSupporter);
  }

  return flags;
}
