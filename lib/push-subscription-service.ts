import { createServerSupabase } from "@/lib/supabase-server";

export type PushSubscriptionRecord = {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

export async function listPushSubscriptions(userId: string): Promise<PushSubscriptionRecord[]> {
  const supabase = createServerSupabase();
  const { data, error } = await supabase
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("user_id", userId);

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => ({
    id: row.id as string,
    endpoint: row.endpoint as string,
    p256dh: row.p256dh as string,
    auth: row.auth as string,
  }));
}

export async function savePushSubscription(
  userId: string,
  input: { endpoint: string; p256dh: string; auth: string }
) {
  const supabase = createServerSupabase();
  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: userId,
      endpoint: input.endpoint,
      p256dh: input.p256dh,
      auth: input.auth,
    },
    { onConflict: "user_id,endpoint" }
  );

  if (error) throw new Error(error.message);
}

export async function deletePushSubscription(userId: string, endpoint: string) {
  const supabase = createServerSupabase();
  const { error } = await supabase
    .from("push_subscriptions")
    .delete()
    .eq("user_id", userId)
    .eq("endpoint", endpoint);

  if (error) throw new Error(error.message);
}

export async function deleteAllPushSubscriptions(userId: string) {
  const supabase = createServerSupabase();
  const { error } = await supabase
    .from("push_subscriptions")
    .delete()
    .eq("user_id", userId);

  if (error) throw new Error(error.message);
}

export async function isPushNotifyEnabled(userId: string) {
  const supabase = createServerSupabase();
  const { data, error } = await supabase
    .from("profiles")
    .select("push_notify_enabled")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data?.push_notify_enabled === true;
}
