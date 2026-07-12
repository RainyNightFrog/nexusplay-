import { createServerSupabase } from "@/lib/supabase-server";

export type AdminStripeWebhookRecord = {
  eventId: string;
  eventType: string;
  status: string;
  processedAt: string;
  errorMessage: string | null;
  payloadSummary: string | null;
};

export async function listAdminStripeWebhookEvents(params: {
  limit?: number;
  status?: string;
}): Promise<AdminStripeWebhookRecord[]> {
  const supabase = createServerSupabase();
  const limit = Math.min(Math.max(params.limit ?? 50, 1), 200);

  let query = supabase
    .from("stripe_webhook_events")
    .select("*")
    .order("processed_at", { ascending: false })
    .limit(limit);

  if (params.status && params.status !== "all") {
    query = query.eq("status", params.status);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => ({
    eventId: row.event_id as string,
    eventType: row.event_type as string,
    status: (row.status as string) ?? "processed",
    processedAt: row.processed_at as string,
    errorMessage: (row.error_message as string | null) ?? null,
    payloadSummary: (row.payload_summary as string | null) ?? null,
  }));
}

export async function getStripeWebhookStats() {
  const supabase = createServerSupabase();
  const since = new Date(Date.now() - 7 * 86_400_000).toISOString();

  const [total, failed, disputes] = await Promise.all([
    supabase
      .from("stripe_webhook_events")
      .select("event_id", { count: "exact", head: true })
      .gte("processed_at", since),
    supabase
      .from("stripe_webhook_events")
      .select("event_id", { count: "exact", head: true })
      .gte("processed_at", since)
      .eq("status", "failed"),
    supabase
      .from("stripe_webhook_events")
      .select("event_id", { count: "exact", head: true })
      .gte("processed_at", since)
      .ilike("event_type", "%dispute%"),
  ]);

  return {
    last7DaysTotal: total.count ?? 0,
    last7DaysFailed: failed.count ?? 0,
    last7DaysDisputes: disputes.count ?? 0,
  };
}
