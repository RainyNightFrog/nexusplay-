import {
  deliverForumDigestToUser,
  enqueueForumDigestRetry,
} from "@/lib/forum-digest-retry-service";
import { isEmailConfigured } from "@/lib/email-service";
import { readPreferredLocale } from "@/lib/locale-preference-service";
import { logForumDigestDelivery } from "@/lib/forum-digest-delivery-log";
import { createServerSupabase } from "@/lib/supabase-server";

const DIGEST_COOLDOWN_MS = 6 * 86_400_000;

export type ForumDigestDispatchResult = {
  eligible: number;
  sent: number;
  skippedEmpty: number;
  skippedRecent: number;
  skippedNoEmail: number;
  failed: number;
  emailConfigured: boolean;
};

export async function dispatchWeeklyForumDigests(): Promise<ForumDigestDispatchResult> {
  const result: ForumDigestDispatchResult = {
    eligible: 0,
    sent: 0,
    skippedEmpty: 0,
    skippedRecent: 0,
    skippedNoEmail: 0,
    failed: 0,
    emailConfigured: isEmailConfigured(),
  };

  if (!result.emailConfigured) {
    return result;
  }

  const supabase = createServerSupabase();
  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("id, forum_digest_last_sent_at")
    .eq("forum_email_digest", true);

  if (error) throw new Error(error.message);
  if (!profiles?.length) return result;

  result.eligible = profiles.length;
  const now = Date.now();

  for (const profile of profiles) {
    const userId = profile.id as string;
    const lastSent = profile.forum_digest_last_sent_at as string | null;

    if (lastSent) {
      const elapsed = now - new Date(lastSent).getTime();
      if (elapsed < DIGEST_COOLDOWN_MS) {
        result.skippedRecent += 1;
        continue;
      }
    }

    try {
      const outcome = await deliverForumDigestToUser(userId);

      if (outcome.kind === "sent") {
        result.sent += 1;
        continue;
      }

      if (outcome.kind === "skipped_empty") {
        result.skippedEmpty += 1;
        continue;
      }

      if (outcome.kind === "skipped_no_email") {
        result.skippedNoEmail += 1;
        continue;
      }

      throw new Error(outcome.message);
    } catch (dispatchError) {
      result.failed += 1;
      const message =
        dispatchError instanceof Error ? dispatchError.message : String(dispatchError);
      console.error("[forum digest dispatch]", userId, message);

      try {
        const locale = await readPreferredLocale(userId);
        await logForumDigestDelivery({
          userId,
          locale,
          postCount: 0,
          status: "failed",
          errorMessage: message,
        });
        await enqueueForumDigestRetry(userId, message);
      } catch (logError) {
        console.error(
          "[forum digest dispatch log]",
          userId,
          logError instanceof Error ? logError.message : logError
        );
      }
    }
  }

  return result;
}
