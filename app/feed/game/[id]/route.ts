import { NextResponse } from "next/server";
import {
  buildAtomFeedXml,
  buildRssFeedXml,
  listSingleGameFeedItems,
  singleGameFeedChannel,
} from "@/lib/rss-feed-service";
import { feedXmlResponse, parseFeedFormat } from "@/lib/rss-response";
import { atomChannelSelfUrl } from "@/lib/feed-atom-self-url";

type Props = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, { params }: Props) {
  try {
    const { id } = await params;
    const gameId = Number.parseInt(id, 10);
    if (!Number.isFinite(gameId)) {
      return NextResponse.json({ error: "Invalid game id" }, { status: 400 });
    }

    const result = await listSingleGameFeedItems(gameId);
    if (!result) {
      return NextResponse.json({ error: "Game not found" }, { status: 404 });
    }

    const format = parseFeedFormat(request);
    const channel = {
      ...singleGameFeedChannel(result.gameTitle, gameId),
      ...(format === "atom"
        ? atomChannelSelfUrl(`/feed/game/${gameId}?format=atom`)
        : {}),
    };
    const xml =
      format === "atom"
        ? buildAtomFeedXml(result.items, channel)
        : buildRssFeedXml(result.items, channel);

    return feedXmlResponse(xml, format, request);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to build game feed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
