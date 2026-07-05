import { NextResponse } from "next/server";
import {
  buildAtomFeedXml,
  buildRssFeedXml,
  gamesRssChannel,
  listGameRssFeedItems,
} from "@/lib/rss-feed-service";
import { feedXmlResponse, parseFeedFormat } from "@/lib/rss-response";
import { atomChannelSelfUrl } from "@/lib/feed-atom-self-url";

export async function GET(request: Request) {
  try {
    const format = parseFeedFormat(request);
    const items = await listGameRssFeedItems();
    const channel = {
      ...gamesRssChannel(),
      ...(format === "atom" ? atomChannelSelfUrl("/feed.xml?format=atom") : {}),
    };
    const xml =
      format === "atom"
        ? buildAtomFeedXml(items, channel)
        : buildRssFeedXml(items, channel);

    return feedXmlResponse(xml, format, request);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to build feed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
