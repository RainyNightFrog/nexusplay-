import { NextResponse } from "next/server";
import {
  buildFeedPreview,
  FEED_PREVIEW_DEFAULT_LIMIT,
  FEED_PREVIEW_MAX_LIMIT,
  parseFeedPreviewKind,
} from "@/lib/feed-preview-service";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const feed = parseFeedPreviewKind(searchParams.get("feed"));

  if (!feed) {
    return NextResponse.json(
      { error: "Missing or invalid feed. Use games, forum, category, game, or creator." },
      { status: 400 }
    );
  }

  const limitRaw = Number.parseInt(
    searchParams.get("limit") ?? String(FEED_PREVIEW_DEFAULT_LIMIT),
    10
  );
  const limit = Number.isFinite(limitRaw)
    ? Math.min(Math.max(limitRaw, 1), FEED_PREVIEW_MAX_LIMIT)
    : FEED_PREVIEW_DEFAULT_LIMIT;

  const category = searchParams.get("category") ?? undefined;
  const gameIdRaw =
    searchParams.get("gameId") ?? (feed === "game" ? searchParams.get("id") : null);
  const creatorId =
    searchParams.get("creatorId") ?? (feed === "creator" ? searchParams.get("id") : null) ?? undefined;

  const gameId = gameIdRaw ? Number.parseInt(gameIdRaw, 10) : undefined;

  try {
    const preview = await buildFeedPreview({
      feed,
      limit,
      category,
      gameId: feed === "game" ? gameId : undefined,
      creatorId: feed === "creator" ? creatorId : undefined,
    });

    if (!preview) {
      return NextResponse.json({ error: "Feed not found" }, { status: 404 });
    }

    return NextResponse.json(preview, {
      headers: {
        "Cache-Control": "public, s-maxage=120, stale-while-revalidate=300",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to build feed preview";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
