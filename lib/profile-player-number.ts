import type { SupabaseClient } from "@supabase/supabase-js";

type ProfileRow = {
  id: string;
  player_number: number | null;
};

export async function allocateProfilePlayerNumber(
  supabase: SupabaseClient
): Promise<number> {
  const { data, error } = await supabase.rpc("allocate_profile_player_number");
  if (!error && data != null) {
    const value = Number(data);
    if (Number.isFinite(value) && value > 0) return value;
  }

  const { data: row, error: readError } = await supabase
    .from("profiles")
    .select("player_number")
    .order("player_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (readError) throw new Error(readError.message);

  const base =
    typeof row?.player_number === "number"
      ? row.player_number
      : row?.player_number != null
        ? Number(row.player_number) || 100_000
        : 100_000;

  return base + 1;
}

export async function upsertBotProfile(
  supabase: SupabaseClient,
  input: {
    userId: string;
    displayName: string;
    avatarUrl: string | null;
    role: "player" | "creator";
  }
) {
  const { data: existing, error: readError } = await supabase
    .from("profiles")
    .select("id, player_number")
    .eq("id", input.userId)
    .maybeSingle();

  if (readError) throw new Error(readError.message);

  const profile = existing as ProfileRow | null;

  if (profile?.player_number != null) {
    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: input.displayName,
        avatar_url: input.avatarUrl,
        role: input.role,
      })
      .eq("id", input.userId);
    if (error) throw new Error(error.message);
    return;
  }

  const playerNumber = await allocateProfilePlayerNumber(supabase);

  if (profile) {
    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: input.displayName,
        avatar_url: input.avatarUrl,
        role: input.role,
        player_number: playerNumber,
      })
      .eq("id", input.userId);
    if (error) throw new Error(error.message);
    return;
  }

  const { error } = await supabase.from("profiles").insert({
    id: input.userId,
    display_name: input.displayName,
    avatar_url: input.avatarUrl,
    role: input.role,
    player_number: playerNumber,
  });
  if (error) throw new Error(error.message);
}
