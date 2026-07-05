import type { MetadataRoute } from "next";
import {
  listPublicSitemapCreatorIds,
  listPublicSitemapGames,
} from "@/lib/sitemap-service";
import { getSiteUrl } from "@/lib/site-url";

const STATIC_PATHS = [
  { path: "", priority: 1, changeFrequency: "daily" as const },
  { path: "/community", priority: 0.8, changeFrequency: "daily" as const },
  { path: "/search", priority: 0.6, changeFrequency: "weekly" as const },
  { path: "/legal", priority: 0.4, changeFrequency: "monthly" as const },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getSiteUrl();
  const now = new Date();

  const entries: MetadataRoute.Sitemap = STATIC_PATHS.map((item) => ({
    url: `${baseUrl}${item.path}`,
    lastModified: now,
    changeFrequency: item.changeFrequency,
    priority: item.priority,
  }));

  try {
    const [games, creatorIds] = await Promise.all([
      listPublicSitemapGames(),
      listPublicSitemapCreatorIds(),
    ]);

    for (const game of games) {
      entries.push({
        url: `${baseUrl}/game/${game.id}`,
        lastModified: game.updatedAt ? new Date(game.updatedAt) : now,
        changeFrequency: "weekly",
        priority: 0.7,
      });
    }

    for (const creatorId of creatorIds) {
      entries.push({
        url: `${baseUrl}/creator/${creatorId}`,
        lastModified: now,
        changeFrequency: "weekly",
        priority: 0.5,
      });
    }
  } catch (error) {
    console.error("[sitemap]", error instanceof Error ? error.message : error);
  }

  return entries;
}
