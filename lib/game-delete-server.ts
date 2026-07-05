import type { SupabaseClient } from "@supabase/supabase-js";
import {
  COVERS_BUCKET,
  extractPublicStoragePath,
  FILES_BUCKET,
  removeBuildFolder,
  removeStoragePaths,
} from "@/lib/game-storage";

export type DeletableGameRecord = {
  id: number;
  title: string;
  cover_url: string;
  game_url: string;
  creator_id?: string | null;
};

type DeleteFilter =
  | { mode: "admin" }
  | { mode: "creator"; userId: string; isOrphan: boolean };

export async function deleteGameAndAssets(
  supabase: SupabaseClient,
  record: DeletableGameRecord,
  filter: DeleteFilter
): Promise<void> {
  let deleteQuery = supabase.from("games").delete().eq("id", record.id);

  if (filter.mode === "creator") {
    if (filter.isOrphan) {
      deleteQuery = deleteQuery.is("creator_id", null);
    } else {
      deleteQuery = deleteQuery.eq("creator_id", filter.userId);
    }
  }

  const { error: deleteError } = await deleteQuery;

  if (deleteError) {
    throw new Error(`刪除遊戲失敗：${deleteError.message}`);
  }

  const coverPath = extractPublicStoragePath(record.cover_url, COVERS_BUCKET);
  if (coverPath) {
    await removeStoragePaths(supabase, COVERS_BUCKET, [coverPath]);
  }

  const gameUrl = record.game_url;
  if (gameUrl) {
    const zipPath = extractPublicStoragePath(gameUrl, FILES_BUCKET);
    if (zipPath?.toLowerCase().endsWith(".zip")) {
      await removeStoragePaths(supabase, FILES_BUCKET, [zipPath]);
    } else {
      await removeBuildFolder(supabase, gameUrl);
    }
  }
}
