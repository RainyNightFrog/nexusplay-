import { createServerSupabase } from "@/lib/supabase-server";
import { getWebSubCallbackUrl } from "@/lib/websub-callback";
import { getWebSubHubUrl, listDefaultWebSubTopics } from "@/lib/websub-service";

const DEFAULT_LEASE_SECONDS = 864_000;

export type WebSubSubscriptionRecord = {
  id: number;
  topicUrl: string;
  callbackUrl: string;
  leaseExpiresAt: string | null;
  lastVerifiedAt: string | null;
  status: "pending" | "active" | "expired" | "failed";
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
};

export async function logWebSubNotification(input: {
  topicUrl: string;
  contentType?: string | null;
}) {
  const supabase = createServerSupabase();
  const { error } = await supabase.from("websub_notifications").insert({
    topic_url: input.topicUrl,
    content_type: input.contentType ?? null,
  });

  if (error) throw new Error(error.message);
}

export async function markWebSubSubscriptionVerified(
  topicUrl: string,
  leaseSeconds: number | null
) {
  const supabase = createServerSupabase();
  const now = Date.now();
  const leaseMs = (leaseSeconds ?? DEFAULT_LEASE_SECONDS) * 1000;
  const leaseExpiresAt = new Date(now + leaseMs).toISOString();

  const { error } = await supabase.from("websub_subscriptions").upsert(
    {
      topic_url: topicUrl,
      callback_url: getWebSubCallbackUrl(),
      lease_expires_at: leaseExpiresAt,
      last_verified_at: new Date(now).toISOString(),
      status: "active",
      last_error: null,
      updated_at: new Date(now).toISOString(),
    },
    { onConflict: "topic_url" }
  );

  if (error) throw new Error(error.message);
}

export async function markWebSubSubscriptionUnsubscribed(topicUrl: string) {
  const supabase = createServerSupabase();
  const { error } = await supabase
    .from("websub_subscriptions")
    .update({
      status: "expired",
      updated_at: new Date().toISOString(),
    })
    .eq("topic_url", topicUrl);

  if (error) throw new Error(error.message);
}

async function requestHubSubscription(topicUrl: string) {
  const hubUrl = getWebSubHubUrl();
  if (!hubUrl) {
    return { topic: topicUrl, configured: false, ok: false };
  }

  const callbackUrl = getWebSubCallbackUrl();

  try {
    const response = await fetch(hubUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        "hub.mode": "subscribe",
        "hub.topic": topicUrl,
        "hub.callback": callbackUrl,
        "hub.lease_seconds": String(DEFAULT_LEASE_SECONDS),
      }).toString(),
    });

    const supabase = createServerSupabase();
    const status = response.ok || response.status === 202 ? "pending" : "failed";

    await supabase.from("websub_subscriptions").upsert(
      {
        topic_url: topicUrl,
        callback_url: callbackUrl,
        status,
        last_error: response.ok || response.status === 202
          ? null
          : `Hub responded ${response.status}`,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "topic_url" }
    );

    return {
      topic: topicUrl,
      configured: true,
      ok: response.ok || response.status === 202,
      status: response.status,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Subscribe failed";
    const supabase = createServerSupabase();

    await supabase.from("websub_subscriptions").upsert(
      {
        topic_url: topicUrl,
        callback_url: getWebSubCallbackUrl(),
        status: "failed",
        last_error: message,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "topic_url" }
    );

    return {
      topic: topicUrl,
      configured: true,
      ok: false,
      error: message,
    };
  }
}

export async function subscribeDefaultWebSubTopics() {
  const topics = listDefaultWebSubTopics();
  const results = [];

  for (const topic of topics) {
    results.push(await requestHubSubscription(topic));
  }

  return {
    configured: Boolean(getWebSubHubUrl()),
    callbackUrl: getWebSubCallbackUrl(),
    results,
    successCount: results.filter((result) => result.ok).length,
  };
}

export async function listWebSubSubscriptions(limit = 20): Promise<WebSubSubscriptionRecord[]> {
  const supabase = createServerSupabase();
  const { data, error } = await supabase
    .from("websub_subscriptions")
    .select(
      "id, topic_url, callback_url, lease_expires_at, last_verified_at, status, last_error, created_at, updated_at"
    )
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => ({
    id: row.id as number,
    topicUrl: row.topic_url as string,
    callbackUrl: row.callback_url as string,
    leaseExpiresAt: (row.lease_expires_at as string | null) ?? null,
    lastVerifiedAt: (row.last_verified_at as string | null) ?? null,
    status: row.status as WebSubSubscriptionRecord["status"],
    lastError: (row.last_error as string | null) ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }));
}

export async function countWebSubNotificationsSince(since: string) {
  const supabase = createServerSupabase();
  const { count, error } = await supabase
    .from("websub_notifications")
    .select("id", { count: "exact", head: true })
    .gte("created_at", since);

  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function getWebSubAdminSummary() {
  const supabase = createServerSupabase();
  const since7 = new Date(Date.now() - 7 * 86_400_000).toISOString();

  const [activeResult, pendingResult, notifications7d] = await Promise.all([
    supabase
      .from("websub_subscriptions")
      .select("id", { count: "exact", head: true })
      .eq("status", "active"),
    supabase
      .from("websub_subscriptions")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    countWebSubNotificationsSince(since7),
  ]);

  if (activeResult.error) throw new Error(activeResult.error.message);
  if (pendingResult.error) throw new Error(pendingResult.error.message);

  return {
    configured: Boolean(getWebSubHubUrl()),
    callbackUrl: getWebSubCallbackUrl(),
    activeSubscriptions: activeResult.count ?? 0,
    pendingSubscriptions: pendingResult.count ?? 0,
    notificationsLast7Days: notifications7d,
    subscriptions: await listWebSubSubscriptions(10),
  };
}
