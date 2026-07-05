import { NextResponse } from "next/server";
import {
  buildAtomFeedXml,
  buildRssFeedXml,
  forumRssChannel,
  listForumRssFeedItems,
} from "@/lib/rss-feed-service";
import { feedXmlResponse, parseFeedFormat } from "@/lib/rss-response";
import { atomChannelSelfUrl } from "@/lib/feed-atom-self-url";

export async function GET(request: Request) {
  try {
    const format = parseFeedFormat(request);
    const items = await listForumRssFeedItems();
    const channel = {
      ...forumRssChannel(),
      ...(format === "atom" ? atomChannelSelfUrl("/feed/forum.xml?format=atom") : {}),
    };
    const xml =
      format === "atom"
        ? buildAtomFeedXml(items, channel)
        : buildRssFeedXml(items, channel);

    return feedXmlResponse(xml, format, request);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to build forum feed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
