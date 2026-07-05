import {
  buildForumDigestPreview,
  renderForumDigestHtml,
  renderForumDigestText,
} from "@/lib/forum-digest-service";
import { isEmailConfigured, sendEmail } from "@/lib/email-service";
import { buildForumDigestUnsubscribeUrl } from "@/lib/email-unsubscribe-token";
import { readPreferredLocale } from "@/lib/locale-preference-service";
import { logForumDigestDelivery } from "@/lib/forum-digest-delivery-log";
import { createServerSupabase } from "@/lib/supabase-server";

export type ForumDigestDeliveryOutcome =
  | { kind: "sent"; postCount: number }
  | { kind: "skipped_empty" }
  | { kind: "skipped_no_email" }
  | { kind: "failed"; message: string };

export async function deliverForumDigestToUser(
  userId: string
): Promise<ForumDigestDeliveryOutcome> {
  const supabase = createServerSupabase();
  const locale = await readPreferredLocale(userId);
  const preview = await buildForumDigestPreview(userId, locale);

  if (preview.posts.length === 0) {
    return { kind: "skipped_empty" };
  }

  const { data: userData, error: userError } =
    await supabase.auth.admin.getUserById(userId);

  if (userError) throw new Error(userError.message);

  const email = userData.user?.email?.trim();
  if (!email) {
    return { kind: "skipped_no_email" };
  }

  const unsubscribeUrl = buildForumDigestUnsubscribeUrl(userId);

  await sendEmail({
    to: email,
    subject: preview.subject,
    html: renderForumDigestHtml(preview, { unsubscribeUrl }),
    text: renderForumDigestText(preview, { unsubscribeUrl }),
  });

  await logForumDigestDelivery({
    userId,
    locale,
    postCount: preview.posts.length,
    status: "sent",
  });

  const { error: updateError } = await supabase
    .from("profiles")
    .update({ forum_digest_last_sent_at: new Date().toISOString() })
    .eq("id", userId);

  if (updateError) throw new Error(updateError.message);

  return { kind: "sent", postCount: preview.posts.length };
}

export async function enqueueForumDigestRetry(userId: string, errorMessage: string) {
  const supabase = createServerSupabase();
  const nextRetryAt = new Date(Date.now() + 86_400_000).toISOString();

  const { data: existing, error: existingError } = await supabase
    .from("forum_digest_retry_queue")
    .select("id")
    .eq("user_id", userId)
    .eq("status", "pending")
    .maybeSingle();

  if (existingError) throw new Error(existingError.message);

  if (existing) {
    const { error } = await supabase
      .from("forum_digest_retry_queue")
      .update({
        last_error: errorMessage,
        next_retry_at: nextRetryAt,
      })
      .eq("id", existing.id as number);

    if (error) throw new Error(error.message);
    return;
  }

  const { error } = await supabase.from("forum_digest_retry_queue").insert({
    user_id: userId,
    next_retry_at: nextRetryAt,
    last_error: errorMessage,
    status: "pending",
  });

  if (error) throw new Error(error.message);
}

export async function resolveForumDigestRetry(
  userId: string,
  status: "succeeded" | "exhausted" | "cancelled"
) {
  const supabase = createServerSupabase();
  const { error } = await supabase
    .from("forum_digest_retry_queue")
    .update({
      status,
      resolved_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .eq("status", "pending");

  if (error) throw new Error(error.message);
}

export type ForumDigestRetryResult = {
  due: number;
  sent: number;
  skippedEmpty: number;
  skippedNoEmail: number;
  failed: number;
  exhausted: number;
  emailConfigured: boolean;
};

const RETRY_BACKOFF_MS = 86_400_000;

export async function processForumDigestRetries(): Promise<ForumDigestRetryResult> {
  const result: ForumDigestRetryResult = {
    due: 0,
    sent: 0,
    skippedEmpty: 0,
    skippedNoEmail: 0,
    failed: 0,
    exhausted: 0,
    emailConfigured: isEmailConfigured(),
  };

  if (!result.emailConfigured) {
    return result;
  }

  const supabase = createServerSupabase();
  const nowIso = new Date().toISOString();

  const { data: rows, error } = await supabase
    .from("forum_digest_retry_queue")
    .select("id, user_id, attempt_count, max_attempts")
    .eq("status", "pending")
    .lte("next_retry_at", nowIso)
    .order("next_retry_at", { ascending: true })
    .limit(50);

  if (error) throw new Error(error.message);
  if (!rows?.length) return result;

  result.due = rows.length;

  for (const row of rows) {
    const userId = row.user_id as string;
    const attemptCount = row.attempt_count as number;
    const maxAttempts = row.max_attempts as number;
    const queueId = row.id as number;

    try {
      const outcome = await deliverForumDigestToUser(userId);

      if (outcome.kind === "sent") {
        await resolveForumDigestRetry(userId, "succeeded");
        result.sent += 1;
        continue;
      }

      if (outcome.kind === "skipped_empty" || outcome.kind === "skipped_no_email") {
        await resolveForumDigestRetry(userId, "cancelled");
        if (outcome.kind === "skipped_empty") result.skippedEmpty += 1;
        else result.skippedNoEmail += 1;
        continue;
      }

      throw new Error(outcome.message);
    } catch (retryError) {
      const message =
        retryError instanceof Error ? retryError.message : String(retryError);
      const nextAttempt = attemptCount + 1;

      if (nextAttempt >= maxAttempts) {
        await supabase
          .from("forum_digest_retry_queue")
          .update({
            attempt_count: nextAttempt,
            last_error: message,
            status: "exhausted",
            resolved_at: new Date().toISOString(),
          })
          .eq("id", queueId);

        try {
          const locale = await readPreferredLocale(userId);
          await logForumDigestDelivery({
            userId,
            locale,
            postCount: 0,
            status: "failed",
            errorMessage: `Retry exhausted: ${message}`,
          });
        } catch (logError) {
          console.error("[forum digest retry log]", userId, logError);
        }

        result.exhausted += 1;
        continue;
      }

      const { error: updateError } = await supabase
        .from("forum_digest_retry_queue")
        .update({
          attempt_count: nextAttempt,
          last_error: message,
          next_retry_at: new Date(
            Date.now() + RETRY_BACKOFF_MS * nextAttempt
          ).toISOString(),
        })
        .eq("id", queueId);

      if (updateError) throw new Error(updateError.message);

      result.failed += 1;
    }
  }

  return result;
}

export async function countPendingForumDigestRetries() {
  const supabase = createServerSupabase();
  const { count, error } = await supabase
    .from("forum_digest_retry_queue")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");

  if (error) throw new Error(error.message);
  return count ?? 0;
}

export type ForumDigestRetryQueueItem = {
  id: number;
  userId: string;
  attemptCount: number;
  maxAttempts: number;
  nextRetryAt: string;
  lastError: string | null;
  createdAt: string;
};

export async function listForumDigestRetryQueue(
  limit = 20
): Promise<ForumDigestRetryQueueItem[]> {
  const supabase = createServerSupabase();
  const { data, error } = await supabase
    .from("forum_digest_retry_queue")
    .select("id, user_id, attempt_count, max_attempts, next_retry_at, last_error, created_at")
    .eq("status", "pending")
    .order("next_retry_at", { ascending: true })
    .limit(limit);

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => ({
    id: row.id as number,
    userId: row.user_id as string,
    attemptCount: row.attempt_count as number,
    maxAttempts: row.max_attempts as number,
    nextRetryAt: row.next_retry_at as string,
    lastError: (row.last_error as string | null) ?? null,
    createdAt: row.created_at as string,
  }));
}
