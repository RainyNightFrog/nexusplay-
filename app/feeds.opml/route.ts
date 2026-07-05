import { NextResponse } from "next/server";
import { buildPlatformOpmlDocument } from "@/lib/opml-feed-service";
import { opmlXmlResponse } from "@/lib/rss-response";

export async function GET(request: Request) {
  try {
    const xml = buildPlatformOpmlDocument();
    return opmlXmlResponse(xml, request);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to build OPML";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
