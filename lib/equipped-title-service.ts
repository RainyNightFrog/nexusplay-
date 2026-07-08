import type { SupabaseClient } from "@supabase/supabase-js";
import type { EquippedTitle } from "@/lib/titles";

type ProfileTitleRow = {
  id: string;
  equipped_title_id: string | null;
};

type TitleRow = {
  id: string;
  name: string;
  css_class: string;
  rarity_tier: EquippedTitle["rarity_tier"];
};

function mapTitle(row: TitleRow): EquippedTitle {
  return {
    id: row.id,
    name: row.name,
    css_class: row.css_class,
    rarity_tier: row.rarity_tier,
  };
}

export async function resolveEquippedTitles(
  supabase: SupabaseClient,
  userIds: string[]
): Promise<Map<string, EquippedTitle | null>> {
  const result = new Map<string, EquippedTitle | null>();
  const uniqueIds = [...new Set(userIds.filter(Boolean))];

  for (const userId of uniqueIds) {
    result.set(userId, null);
  }

  if (uniqueIds.length === 0) {
    return result;
  }

  const { data: profiles, error: profileError } = await supabase
    .from("profiles")
    .select("id, equipped_title_id")
    .in("id", uniqueIds);

  if (profileError) {
    if (
      profileError.code === "PGRST205" ||
      profileError.message?.includes("equipped_title_id")
    ) {
      return result;
    }
    throw new Error(`讀取佩戴稱號失敗：${profileError.message}`);
  }

  const titleIds = [
    ...new Set(
      ((profiles ?? []) as ProfileTitleRow[])
        .map((row) => row.equipped_title_id)
        .filter((id): id is string => Boolean(id))
    ),
  ];

  if (titleIds.length === 0) {
    return result;
  }

  const { data: titles, error: titleError } = await supabase
    .from("titles")
    .select("id, name, css_class, rarity_tier")
    .in("id", titleIds);

  if (titleError) {
    if (titleError.code === "PGRST205") {
      return result;
    }
    throw new Error(`讀取稱號資料失敗：${titleError.message}`);
  }

  const titleMap = new Map(
    ((titles ?? []) as TitleRow[]).map((row) => [row.id, mapTitle(row)])
  );

  for (const profile of (profiles ?? []) as ProfileTitleRow[]) {
    if (!profile.equipped_title_id) continue;
    result.set(profile.id, titleMap.get(profile.equipped_title_id) ?? null);
  }

  return result;
}

export async function resolveEquippedTitleForUser(
  supabase: SupabaseClient,
  userId: string
): Promise<EquippedTitle | null> {
  const map = await resolveEquippedTitles(supabase, [userId]);
  return map.get(userId) ?? null;
}
