import { getSiteUrl } from "@/lib/site-url";
import type { RssChannelConfig } from "@/lib/rss-feed-service";

export function atomChannelSelfUrl(pathWithQuery: string): Pick<RssChannelConfig, "atomSelfUrl"> {
  return { atomSelfUrl: `${getSiteUrl()}${pathWithQuery}` };
}
