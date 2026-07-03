import { NextResponse } from "next/server";
import { extractAndUploadGameBuild } from "@/lib/extract-game-zip";
import { createServerSupabase } from "@/lib/supabase-server";
import { isDirectlyPlayable, mapRecordToGame } from "@/lib/games-data";

const FILES_BUCKET = "game-files";

function extractStoragePath(publicUrl: string) {
  const marker = `/storage/v1/object/public/${FILES_BUCKET}/`;
  const index = publicUrl.indexOf(marker);
  if (index === -1) return null;
  return decodeURIComponent(publicUrl.slice(index + marker.length));
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const numericId = Number.parseInt(id, 10);

    if (Number.isNaN(numericId)) {
      return NextResponse.json({ error: "無效的遊戲 ID" }, { status: 400 });
    }

    const supabase = createServerSupabase();
    const { data: record, error: readError } = await supabase
      .from("games")
      .select("*")
      .eq("id", numericId)
      .maybeSingle();

    if (readError) {
      throw new Error(`讀取遊戲失敗：${readError.message}`);
    }

    if (!record) {
      return NextResponse.json({ error: "找不到此遊戲" }, { status: 404 });
    }

    if (isDirectlyPlayable(record.game_url)) {
      return NextResponse.json({ game: mapRecordToGame(record) });
    }

    const zipResponse = await fetch(record.game_url);
    if (!zipResponse.ok) {
      throw new Error("無法下載舊版 zip 檔案，請重新上傳遊戲");
    }

    const zipBuffer = await zipResponse.arrayBuffer();
    const buildUpload = await extractAndUploadGameBuild(supabase, zipBuffer);

    const oldZipPath = extractStoragePath(record.game_url);
    const { data: updated, error: updateError } = await supabase
      .from("games")
      .update({ game_url: buildUpload.playUrl })
      .eq("id", numericId)
      .select()
      .single();

    if (updateError) {
      await supabase.storage
        .from(FILES_BUCKET)
        .remove(buildUpload.uploadedPaths)
        .catch(() => undefined);
      throw new Error(`更新遊戲連結失敗：${updateError.message}`);
    }

    if (oldZipPath) {
      await supabase.storage
        .from(FILES_BUCKET)
        .remove([oldZipPath])
        .catch(() => undefined);
    }

    return NextResponse.json({ game: mapRecordToGame(updated) });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "遊戲遷移失敗，請重新上傳";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
