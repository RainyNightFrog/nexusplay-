import { NextResponse } from "next/server";
import {
  buildAtomFeedXml,
  buildRssFeedXml,
  categoryFeedPath,
  categoryRssChannel,
  isValidFeedCategory,
  listCategoryGameFeedItems,
} from "@/lib/rss-feed-service";
import { feedXmlResponse, parseFeedFormat } from "@/lib/rss-response";
import { atomChannelSelfUrl } from "@/lib/feed-atom-self-url";

type Props = {
  params: Promise<{ category: string }>;
};

export async function GET(request: Request, { params }: Props) {
  try {
    const { category: rawCategory } = await params;
    const category = decodeURIComponent(rawCategory);

    if (!isValidFeedCategory(category)) {
      return NextResponse.json({ error: "Invalid category" }, { status: 404 });
    }

    const format = parseFeedFormat(request);
    const items = await listCategoryGameFeedItems(category);
    const channel = {
      ...categoryRssChannel(category),
      ...(format === "atom"
        ? atomChannelSelfUrl(`${categoryFeedPath(category)}?format=atom`)
        : {}),
    };
    const xml =
      format === "atom" ? buildAtomFeedXml(items, channel) : buildRssFeedXml(items, channel);

    return feedXmlResponse(xml, format, request);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to build category feed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
