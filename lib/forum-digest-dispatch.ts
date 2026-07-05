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
      const locale = await readPreferredLocale(userId);
      const preview = await buildForumDigestPreview(userId, locale);
      if (preview.posts.length === 0) {
        result.skippedEmpty += 1;
        continue;
      }

      const { data: userData, error: userError } =
        await supabase.auth.admin.getUserById(userId);

      if (userError) throw new Error(userError.message);

      const email = userData.user?.email?.trim();
      if (!email) {
        result.skippedNoEmail += 1;
        continue;
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

      result.sent += 1;
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
