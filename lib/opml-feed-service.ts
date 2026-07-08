import { GAME_GENRES } from "@/lib/game-metadata";
import { platformGamesAtomFeedPath } from "@/lib/feed-discovery";
import {
  categoryAtomFeedPath,
  categoryFeedPath,
} from "@/lib/rss-feed-service";
import { getSiteUrl } from "@/lib/site-url";

export type OpmlOutline = {
  text: string;
  xmlUrl: string;
  htmlUrl?: string;
};

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function outlineXml(outline: OpmlOutline) {
  const htmlUrl = outline.htmlUrl
    ? ` htmlUrl="${escapeXml(outline.htmlUrl)}"`
    : "";
  return `    <outline type="rss" text="${escapeXml(outline.text)}" xmlUrl="${escapeXml(outline.xmlUrl)}"${htmlUrl} />`;
}

export function buildPlatformOpmlOutlines(): OpmlOutline[] {
  const baseUrl = getSiteUrl();
  const outlines: OpmlOutline[] = [
    {
      text: "RainyNightFrog — New Games (RSS)",
      xmlUrl: `${baseUrl}/feed.xml`,
      htmlUrl: baseUrl,
    },
    {
      text: "RainyNightFrog — New Games (Atom)",
      xmlUrl: `${baseUrl}${platformGamesAtomFeedPath()}`,
      htmlUrl: baseUrl,
    },
    {
      text: "RainyNightFrog — Forum (RSS)",
      xmlUrl: `${baseUrl}/feed/forum.xml`,
      htmlUrl: `${baseUrl}/community`,
    },
    {
      text: "RainyNightFrog — Forum (Atom)",
      xmlUrl: `${baseUrl}/feed/forum.xml?format=atom`,
      htmlUrl: `${baseUrl}/community`,
    },
  ];

  for (const category of GAME_GENRES) {
    outlines.push({
      text: `RainyNightFrog — ${category} (RSS)`,
      xmlUrl: `${baseUrl}${categoryFeedPath(category)}`,
      htmlUrl: `${baseUrl}/?category=${encodeURIComponent(category)}`,
    });
    outlines.push({
      text: `RainyNightFrog — ${category} (Atom)`,
      xmlUrl: `${baseUrl}${categoryAtomFeedPath(category)}`,
      htmlUrl: `${baseUrl}/?category=${encodeURIComponent(category)}`,
    });
  }

  return outlines;
}

export function buildOpmlDocument(outlines: OpmlOutline[]) {
  const now = new Date().toUTCString();
  const body = outlines.map(outlineXml).join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<opml version="2.0">
  <head>
    <title>RainyNightFrog Feeds</title>
    <dateCreated>${now}</dateCreated>
    <dateModified>${now}</dateModified>
  </head>
  <body>
${body}
  </body>
</opml>`;
}

export function buildPlatformOpmlDocument() {
  return buildOpmlDocument(buildPlatformOpmlOutlines());
}
