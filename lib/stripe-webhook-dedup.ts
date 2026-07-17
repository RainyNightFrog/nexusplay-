import { createServerSupabase } from "@/lib/supabase-server";

const STUCK_PROCESSING_MS = 5 * 60 * 1000;

type ClaimResult =
  | { ok: true; claimed: true }
  | { ok: true; claimed: false; reason: "duplicate" | "in_flight" };

/**
 * 嘗試取得 webhook 處理權。
 * - 新事件：插入 status=processing
 * - 已 processed／skipped：拒絕（去重）
 * - failed 或卡住的 processing：允許重試
 */
export async function claimStripeWebhookEvent(
  eventId: string,
  eventType: string
): Promise<boolean> {
  const result = await claimStripeWebhookEventDetailed(eventId, eventType);
  return result.ok && result.claimed;
}

export async function claimStripeWebhookEventDetailed(
  eventId: string,
  eventType: string
): Promise<ClaimResult> {
  const supabase = createServerSupabase();
  const nowIso = new Date().toISOString();

  const { error: insertError } = await supabase
    .from("stripe_webhook_events")
    .insert({
      event_id: eventId,
      event_type: eventType,
      status: "processing",
      processed_at: nowIso,
      error_message: null,
    });

  if (!insertError) {
    return { ok: true, claimed: true };
  }

  if (insertError.code !== "23505") {
    throw new Error(insertError.message);
  }

  const { data: existing, error: readError } = await supabase
    .from("stripe_webhook_events")
    .select("status, processed_at")
    .eq("event_id", eventId)
    .maybeSingle();

  if (readError) {
    throw new Error(readError.message);
  }

  const status = existing?.status ?? "processed";
  if (status === "processed" || status === "skipped") {
    return { ok: true, claimed: false, reason: "duplicate" };
  }

  if (status === "processing") {
    const processedAt = existing?.processed_at
      ? new Date(existing.processed_at).getTime()
      : 0;
    const age = Date.now() - processedAt;
    if (Number.isFinite(age) && age < STUCK_PROCESSING_MS) {
      return { ok: true, claimed: false, reason: "in_flight" };
    }
  }

  // failed → 允許重試
  {
    const { data: reclaimedFailed, error: reclaimFailedError } = await supabase
      .from("stripe_webhook_events")
      .update({
        status: "processing",
        event_type: eventType,
        processed_at: nowIso,
        error_message: null,
      })
      .eq("event_id", eventId)
      .eq("status", "failed")
      .select("event_id")
      .maybeSingle();

    if (reclaimFailedError) {
      throw new Error(reclaimFailedError.message);
    }
    if (reclaimedFailed) {
      return { ok: true, claimed: true };
    }
  }

  // 卡住的 processing（超過閾值）→ 允許重試
  {
    const stuckBefore = new Date(
      Date.now() - STUCK_PROCESSING_MS
    ).toISOString();
    const { data: reclaimedStuck, error: reclaimStuckError } = await supabase
      .from("stripe_webhook_events")
      .update({
        status: "processing",
        event_type: eventType,
        processed_at: nowIso,
        error_message: null,
      })
      .eq("event_id", eventId)
      .eq("status", "processing")
      .lt("processed_at", stuckBefore)
      .select("event_id")
      .maybeSingle();

    if (reclaimStuckError) {
      throw new Error(reclaimStuckError.message);
    }
    if (reclaimedStuck) {
      return { ok: true, claimed: true };
    }
  }

  return { ok: true, claimed: false, reason: "duplicate" };
}

export async function markStripeWebhookEventProcessed(eventId: string) {
  const supabase = createServerSupabase();
  const { error } = await supabase
    .from("stripe_webhook_events")
    .update({
      status: "processed",
      processed_at: new Date().toISOString(),
      error_message: null,
    })
    .eq("event_id", eventId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function markStripeWebhookEventFailed(
  eventId: string,
  errorMessage: string
) {
  const supabase = createServerSupabase();
  const { error } = await supabase
    .from("stripe_webhook_events")
    .update({
      status: "failed",
      processed_at: new Date().toISOString(),
      error_message: errorMessage.slice(0, 2000),
    })
    .eq("event_id", eventId);

  if (error) {
    throw new Error(error.message);
  }
}
