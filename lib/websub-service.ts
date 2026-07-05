import { getSiteUrl } from "@/lib/site-url";
import { platformGamesFeedAlternates } from "@/lib/feed-discovery";

export function getWebSubHubUrl() {
  return process.env.WEBSUB_HUB_URL?.trim() ?? "";
}

export function isWebSubConfigured() {
  return Boolean(getWebSubHubUrl());
}

export type WebSubPublishResult = {
  topic: string;
  configured: boolean;
  ok: boolean;
  status?: number;
  error?: string;
};

export async function publishFeedToWebSubHub(
  topicUrl: string
): Promise<WebSubPublishResult> {
  const hubUrl = getWebSubHubUrl();
  if (!hubUrl) {
    return { topic: topicUrl, configured: false, ok: false };
  }

  try {
    const response = await fetch(hubUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        "hub.mode": "publish",
        "hub.url": topicUrl,
      }).toString(),
    });

    return {
      topic: topicUrl,
      configured: true,
      ok: response.ok,
      status: response.status,
    };
  } catch (error) {
    return {
      topic: topicUrl,
      configured: true,
      ok: false,
      error: error instanceof Error ? error.message : "WebSub ping failed",
    };
  }
}

export function listDefaultWebSubTopics() {
  const baseUrl = getSiteUrl();
  const games = platformGamesFeedAlternates();

  return [games.rss, games.atom, `${baseUrl}/feed/forum.xml`];
}

export function forumWebSubTopicUrl() {
  return `${getSiteUrl()}/feed/forum.xml`;
}

export async function publishForumFeedToWebSubHub() {
  return publishFeedToWebSubHub(forumWebSubTopicUrl());
}

export function triggerForumWebSubPing() {
  void publishForumFeedToWebSubHub().then((result) => {
    if (!result.configured) return;
    console.info("[websub forum ping]", result.ok ? "ok" : result.error ?? result.status);
  });
}

export async function pingDefaultWebSubFeeds() {
  const topics = listDefaultWebSubTopics();
  const results: WebSubPublishResult[] = [];

  for (const topic of topics) {
    results.push(await publishFeedToWebSubHub(topic));
  }

  return {
    configured: isWebSubConfigured(),
    results,
    successCount: results.filter((result) => result.ok).length,
  };
}

export function triggerWebSubFeedPing() {
  void pingDefaultWebSubFeeds().then((summary) => {
    if (!summary.configured) return;
    console.info(
      "[websub ping]",
      `${summary.successCount}/${summary.results.length} topics acknowledged`
    );
  });
}
