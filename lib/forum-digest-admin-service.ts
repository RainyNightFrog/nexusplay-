import { createServerSupabase } from "@/lib/supabase-server";

export type ForumDigestAdminReport = {
  subscribers: number;
  sentLast7Days: number;
  failedLast7Days: number;
  sentLast30Days: number;
  failedLast30Days: number;
  recent: Array<{
    id: number;
    userId: string;
    locale: string;
    postCount: number;
    status: "sent" | "failed";
    errorMessage: string | null;
    createdAt: string;
  }>;
};

function sinceDays(days: number) {
  return new Date(Date.now() - days * 86_400_000).toISOString();
}

async function countDeliveriesSince(status: "sent" | "failed", since: string) {
  const supabase = createServerSupabase();
  const { count, error } = await supabase
    .from("forum_digest_deliveries")
    .select("id", { count: "exact", head: true })
    .eq("status", status)
    .gte("created_at", since);

  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function getForumDigestAdminReport(): Promise<ForumDigestAdminReport> {
  const supabase = createServerSupabase();
  const since7 = sinceDays(7);
  const since30 = sinceDays(30);

  const [
    subscribersResult,
    sent7,
    failed7,
    sent30,
    failed30,
    recentResult,
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("forum_email_digest", true),
    countDeliveriesSince("sent", since7),
    countDeliveriesSince("failed", since7),
    countDeliveriesSince("sent", since30),
    countDeliveriesSince("failed", since30),
    supabase
      .from("forum_digest_deliveries")
      .select("id, user_id, locale, post_count, status, error_message, created_at")
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  if (subscribersResult.error) throw new Error(subscribersResult.error.message);
  if (recentResult.error) throw new Error(recentResult.error.message);

  return {
    subscribers: subscribersResult.count ?? 0,
    sentLast7Days: sent7,
    failedLast7Days: failed7,
    sentLast30Days: sent30,
    failedLast30Days: failed30,
    recent: (recentResult.data ?? []).map((row) => ({
      id: row.id as number,
      userId: row.user_id as string,
      locale: row.locale as string,
      postCount: row.post_count as number,
      status: row.status as "sent" | "failed",
      errorMessage: (row.error_message as string | null) ?? null,
      createdAt: row.created_at as string,
    })),
  };
}
