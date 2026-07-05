import { NextResponse } from "next/server";
import {
  buildAtomFeedXml,
  buildRssFeedXml,
  creatorFeedPath,
  creatorRssChannel,
  listCreatorRssFeedItems,
} from "@/lib/rss-feed-service";
import { feedXmlResponse, parseFeedFormat } from "@/lib/rss-response";
import { atomChannelSelfUrl } from "@/lib/feed-atom-self-url";

type Props = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, { params }: Props) {
  try {
    const { id } = await params;
    const result = await listCreatorRssFeedItems(id);

    if (!result) {
      return NextResponse.json({ error: "Creator not found" }, { status: 404 });
    }

    const format = parseFeedFormat(request);
    const channel = {
      ...creatorRssChannel(result.displayName, id),
      ...(format === "atom"
        ? atomChannelSelfUrl(`${creatorFeedPath(id)}?format=atom`)
        : {}),
    };
    const xml =
      format === "atom"
        ? buildAtomFeedXml(result.items, channel)
        : buildRssFeedXml(result.items, channel);

    return feedXmlResponse(xml, format, request);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to build creator RSS feed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
