import type Stripe from "stripe";
import { syncConnectAccountStatus } from "@/lib/creator-payout-service";
import { createServerSupabase } from "@/lib/supabase-server";

export async function syncConnectAccountFromWebhook(account: Stripe.Account) {
  const supabase = createServerSupabase();
  const metadataUserId = account.metadata?.nexusplay_user_id?.trim();

  if (metadataUserId) {
    await syncConnectAccountStatus(metadataUserId, account.id);
    return { handled: true as const, userId: metadataUserId };
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id")
    .eq("stripe_connect_account_id", account.id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!profile?.id) {
    return { handled: false as const };
  }

  await syncConnectAccountStatus(profile.id, account.id);
  return { handled: true as const, userId: profile.id };
}
