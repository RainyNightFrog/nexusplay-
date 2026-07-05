import { getSiteUrl } from "@/lib/site-url";

export type FeedHealthCheck = {
  id: string;
  url: string;
  ok: boolean;
  status?: number;
  error?: string;
};

export type FeedHealthReport = {
  checkedAt: string;
  healthy: boolean;
  checks: FeedHealthCheck[];
};

async function probeFeedUrl(id: string, path: string): Promise<FeedHealthCheck> {
  const url = `${getSiteUrl()}${path}`;

  try {
    const response = await fetch(url, {
      headers: { Accept: "application/xml, application/rss+xml, application/atom+xml" },
      next: { revalidate: 0 },
    });

    return {
      id,
      url,
      ok: response.ok,
      status: response.status,
      error: response.ok ? undefined : `HTTP ${response.status}`,
    };
  } catch (error) {
    return {
      id,
      url,
      ok: false,
      error: error instanceof Error ? error.message : "Fetch failed",
    };
  }
}

export async function checkFeedHealth(): Promise<FeedHealthReport> {
  const checks = await Promise.all([
    probeFeedUrl("games-rss", "/feed.xml"),
    probeFeedUrl("games-atom", "/feed.xml?format=atom"),
    probeFeedUrl("forum-rss", "/feed/forum.xml"),
    probeFeedUrl("forum-atom", "/feed/forum.xml?format=atom"),
    probeFeedUrl("catalog", "/api/feeds/catalog"),
    probeFeedUrl("opml", "/feeds.opml"),
  ]);

  return {
    checkedAt: new Date().toISOString(),
    healthy: checks.every((check) => check.ok),
    checks,
  };
}
