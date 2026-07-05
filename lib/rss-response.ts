import { createHash } from "node:crypto";
import { NextResponse } from "next/server";

const FEED_CACHE_CONTROL = "public, s-maxage=600, stale-while-revalidate=1800";

function buildEtag(body: string) {
  return `"${createHash("sha256").update(body).digest("hex").slice(0, 32)}"`;
}

function cachedXmlResponse(body: string, contentType: string, request?: Request) {
  const etag = buildEtag(body);

  if (request?.headers.get("if-none-match") === etag) {
    return new NextResponse(null, {
      status: 304,
      headers: {
        ETag: etag,
        "Cache-Control": FEED_CACHE_CONTROL,
      },
    });
  }

  return new NextResponse(body, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": FEED_CACHE_CONTROL,
      ETag: etag,
    },
  });
}

export function rssXmlResponse(xml: string, request?: Request) {
  return cachedXmlResponse(xml, "application/rss+xml; charset=utf-8", request);
}

export function atomXmlResponse(xml: string, request?: Request) {
  return cachedXmlResponse(xml, "application/atom+xml; charset=utf-8", request);
}

export type FeedFormat = "rss" | "atom";

export function feedXmlResponse(xml: string, format: FeedFormat, request?: Request) {
  return format === "atom" ? atomXmlResponse(xml, request) : rssXmlResponse(xml, request);
}

export function opmlXmlResponse(xml: string, request?: Request) {
  return cachedXmlResponse(xml, "text/x-opml+xml; charset=utf-8", request);
}

export function parseFeedFormat(request: Request): FeedFormat {
  const { searchParams } = new URL(request.url);
  return searchParams.get("format") === "atom" ? "atom" : "rss";
}
