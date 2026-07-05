import { createServerSupabase } from "@/lib/supabase-server";
import type { AppLocale } from "@/i18n/routing";

export type ForumDigestDeliveryRecord = {
  id: number;
  locale: AppLocale;
  postCount: number;
  status: "sent" | "failed";
  errorMessage: string | null;
  createdAt: string;
};

export async function logForumDigestDelivery(input: {
  userId: string;
  locale: AppLocale;
  postCount: number;
  status: "sent" | "failed";
  errorMessage?: string | null;
}) {
  const supabase = createServerSupabase();
  const { error } = await supabase.from("forum_digest_deliveries").insert({
    user_id: input.userId,
    locale: input.locale,
    post_count: input.postCount,
    status: input.status,
    error_message: input.errorMessage ?? null,
  });

  if (error) throw new Error(error.message);
}

export async function listForumDigestDeliveries(
  userId: string,
  limit = 10
): Promise<ForumDigestDeliveryRecord[]> {
  const supabase = createServerSupabase();
  const { data, error } = await supabase
    .from("forum_digest_deliveries")
    .select("id, locale, post_count, status, error_message, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => ({
    id: row.id as number,
    locale: row.locale as AppLocale,
    postCount: row.post_count as number,
    status: row.status as "sent" | "failed",
    errorMessage: (row.error_message as string | null) ?? null,
    createdAt: row.created_at as string,
  }));
}
