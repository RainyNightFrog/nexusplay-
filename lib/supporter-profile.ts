import type { SupabaseClient } from "@supabase/supabase-js";

export async function resolveSupporterFlags(
  supabase: SupabaseClient,
  userIds: string[]
): Promise<Map<string, boolean>> {
  const flags = new Map<string, boolean>();
  const uniqueIds = [...new Set(userIds.filter(Boolean))];
  if (uniqueIds.length === 0) return flags;

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, is_supporter")
    .in("id", uniqueIds);

  for (const userId of uniqueIds) {
    const profile = profiles?.find((row) => row.id === userId);
    flags.set(userId, profile?.is_supporter === true);
  }

  return flags;
}
