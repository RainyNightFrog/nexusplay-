import type { SupabaseClient } from "@supabase/supabase-js";
import type { GameRecord } from "@/lib/supabase";

type AuthorizeResult =
  | { ok: true; record: GameRecord; isOrphan: boolean }
  | { ok: false; status: 403 | 404; message: string };

/** 驗證創作者能否管理此遊戲（本人或尚未綁定 creator_id 的孤兒遊戲） */
export async function authorizeGameEdit(
  supabase: SupabaseClient,
  gameId: number,
  userId: string
): Promise<AuthorizeResult> {
  const { data: record, error } = await supabase
    .from("games")
    .select("*")
    .eq("id", gameId)
    .maybeSingle();

  if (error) {
    throw new Error(`讀取遊戲失敗：${error.message}`);
  }

  if (!record) {
    return { ok: false, status: 404, message: "找不到此遊戲" };
  }

  if (record.creator_id && record.creator_id !== userId) {
    return { ok: false, status: 403, message: "你沒有權限編輯此遊戲" };
  }

  return {
    ok: true,
    record,
    isOrphan: record.creator_id === null,
  };
}

export function orphanGameHint(title: string) {
  return `「${title}」尚未綁定創作者帳號（舊版上傳常見）。儲存變更後將自動綁定至你的帳號。`;
}
