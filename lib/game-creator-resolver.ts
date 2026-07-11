import {
  getPlatformGameMeta,
  VOID_GACHA_TITLE,
} from "@/lib/platform-catalog";
import type { GameRecord } from "@/lib/supabase";
import type { SupabaseClient } from "@supabase/supabase-js";

export type ResolvedGameCreator = {
  creatorId: string | null;
  creatorName: string;
};

let cachedPlatformCreatorId: string | null | undefined;

async function getPlatformDefaultCreatorId(
  supabase: SupabaseClient
): Promise<string | null> {
  if (cachedPlatformCreatorId !== undefined) {
    return cachedPlatformCreatorId;
  }

  const { data, error } = await supabase
    .from("games")
    .select("creator_id")
    .eq("title", VOID_GACHA_TITLE)
    .not("creator_id", "is", null)
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);

  cachedPlatformCreatorId = data?.creator_id ?? null;
  return cachedPlatformCreatorId;
}

async function readCreatorDisplayName(
  supabase: SupabaseClient,
  creatorId: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", creatorId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return typeof data?.display_name === "string" && data.display_name.trim()
    ? data.display_name.trim()
    : null;
}

export async function resolveGameCreator(
  supabase: SupabaseClient,
  record: Pick<GameRecord, "title" | "creator_id">
): Promise<ResolvedGameCreator> {
  const meta = getPlatformGameMeta(record.title);
  const catalogCreatorName = meta?.creator?.trim() ?? "";

  if (record.creator_id) {
    const profileName = await readCreatorDisplayName(
      supabase,
      record.creator_id
    );
    return {
      creatorId: record.creator_id,
      creatorName: profileName ?? catalogCreatorName,
    };
  }

  if (meta?.platformStar) {
    const fallbackCreatorId = await getPlatformDefaultCreatorId(supabase);
    if (fallbackCreatorId) {
      const profileName = await readCreatorDisplayName(
        supabase,
        fallbackCreatorId
      );
      return {
        creatorId: fallbackCreatorId,
        creatorName: catalogCreatorName || profileName || "",
      };
    }
  }

  return {
    creatorId: null,
    creatorName: catalogCreatorName,
  };
}
