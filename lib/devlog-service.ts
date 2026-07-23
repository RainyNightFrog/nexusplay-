import type { SupabaseClient } from "@supabase/supabase-js";
import { createServerSupabase } from "@/lib/supabase-server";
import { sanitizePlainText } from "@/lib/sanitize-plain";
import { sanitizeRichHtml } from "@/lib/sanitize-rich-html";
import { createUserNotification } from "@/lib/user-notifications-service";
import { listWishlistUserIdsForGame } from "@/lib/wishlist-service";

export const MAX_DEVLOG_TITLE_LENGTH = 120;
export const MAX_DEVLOG_HTML_LENGTH = 20_000;

export type GameDevlogRecord = {
  id: string;
  gameId: number;
  creatorId: string;
  title: string;
  contentHtml: string;
  publishedAt: string;
};

function mapDevlogRow(row: Record<string, unknown>): GameDevlogRecord {
  return {
    id: row.id as string,
    gameId: Number(row.game_id),
    creatorId: row.creator_id as string,
    title: row.title as string,
    contentHtml: (row.content_html as string) ?? "",
    publishedAt: row.published_at as string,
  };
}

export async function listGameDevlogs(
  gameId: number,
  options?: { limit?: number; supabase?: SupabaseClient }
): Promise<GameDevlogRecord[]> {
  const client = options?.supabase ?? createServerSupabase();
  const limit = options?.limit ?? 50;

  const { data, error } = await client
    .from("game_devlogs")
    .select("id, game_id, creator_id, title, content_html, published_at")
    .eq("game_id", gameId)
    .order("published_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => mapDevlogRow(row as Record<string, unknown>));
}

export async function createGameDevlog(
  input: {
    gameId: number;
    creatorId: string;
    title: string;
    contentHtml: string;
    gameTitle?: string;
  },
  supabase?: SupabaseClient
) {
  const client = supabase ?? createServerSupabase();
  const title = sanitizePlainText(input.title, MAX_DEVLOG_TITLE_LENGTH);
  const contentHtml = sanitizeRichHtml(
    input.contentHtml,
    MAX_DEVLOG_HTML_LENGTH
  );

  if (!title) {
    throw new Error("請輸入開發日誌標題");
  }

  const plainContent = contentHtml.replace(/<[^>]*>/g, "").trim();
  if (!plainContent) {
    throw new Error("請輸入開發日誌內容");
  }

  const { data: game, error: gameError } = await client
    .from("games")
    .select("id, title, creator_id")
    .eq("id", input.gameId)
    .maybeSingle();

  if (gameError) throw new Error(gameError.message);
  if (!game) throw new Error("找不到此遊戲");
  if (game.creator_id !== input.creatorId) {
    throw new Error("只有遊戲創作者可以發布開發日誌");
  }

  const publishedAt = new Date().toISOString();
  const { data, error } = await client
    .from("game_devlogs")
    .insert({
      game_id: input.gameId,
      creator_id: input.creatorId,
      title,
      content_html: contentHtml,
      published_at: publishedAt,
      updated_at: publishedAt,
    })
    .select("id, game_id, creator_id, title, content_html, published_at")
    .single();

  if (error) throw new Error(error.message);

  const entry = mapDevlogRow(data as Record<string, unknown>);
  const gameTitle =
    input.gameTitle?.trim() || (game.title as string) || "遊戲";

  void notifyWishlistUsersOfDevlog({
    gameId: input.gameId,
    gameTitle,
    creatorId: input.creatorId,
    devlogTitle: title,
    supabase: client,
  }).catch((notifyError) => {
    console.error("[devlog] wishlist notify failed:", notifyError);
  });

  return entry;
}

export async function deleteGameDevlog(
  input: { gameId: number; devlogId: string; creatorId: string },
  supabase?: SupabaseClient
) {
  const client = supabase ?? createServerSupabase();
  const { error } = await client
    .from("game_devlogs")
    .delete()
    .eq("id", input.devlogId)
    .eq("game_id", input.gameId)
    .eq("creator_id", input.creatorId);

  if (error) throw new Error(error.message);
}

async function notifyWishlistUsersOfDevlog(input: {
  gameId: number;
  gameTitle: string;
  creatorId: string;
  devlogTitle: string;
  supabase: SupabaseClient;
}) {
  const userIds = await listWishlistUserIdsForGame(input.gameId);
  const recipients = userIds.filter((id) => id !== input.creatorId);

  await Promise.all(
    recipients.map((userId) =>
      createUserNotification(
        {
          userId,
          kind: "wishlist_devlog",
          title: `${input.gameTitle} 發布了開發日誌`,
          body: input.devlogTitle,
          href: `/game/${input.gameId}`,
        },
        input.supabase
      )
    )
  );
}
