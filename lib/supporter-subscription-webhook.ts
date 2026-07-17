import type Stripe from "stripe";
import {
  revokeSupporterStatus,
} from "@/lib/supporter-pass-service";
import { getStripeClient } from "@/lib/stripe-connect";
import { createServerSupabase } from "@/lib/supabase-server";

export type SupporterSubscriptionDeletedResult =
  | { handled: false }
  | {
      handled: true;
      userId: string;
      revoked: boolean;
      reason?: "other_active_subscription" | "lifetime";
    };

function resolveStripeCustomerId(
  customer: Stripe.Subscription["customer"]
): string | null {
  if (!customer) return null;
  return typeof customer === "string" ? customer : customer.id;
}

function isSupporterSubscription(subscription: Stripe.Subscription) {
  const metadata = subscription.metadata ?? {};
  return (
    metadata.nexusplay_order_type === "supporter_pass" ||
    metadata.order_type === "supporter_pass" ||
    Boolean(metadata.supporter_tier_id)
  );
}

async function resolveUserIdForSubscription(
  subscription: Stripe.Subscription
): Promise<string | null> {
  const metadataUserId = subscription.metadata?.nexusplay_user_id?.trim();
  if (metadataUserId) {
    return metadataUserId;
  }

  const customerId = resolveStripeCustomerId(subscription.customer);
  if (!customerId) {
    return null;
  }

  const supabase = createServerSupabase();
  const { data, error } = await supabase
    .from("profiles")
    .select("id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data?.id ?? null;
}

async function hasOtherActiveSupporterSubscription(
  customerId: string,
  deletedSubscriptionId: string
) {
  const stripe = getStripeClient();
  const subscriptions = await stripe.subscriptions.list({
    customer: customerId,
    status: "active",
    limit: 20,
  });

  return subscriptions.data.some(
    (subscription) =>
      subscription.id !== deletedSubscriptionId &&
      isSupporterSubscription(subscription)
  );
}

export async function handleSupporterSubscriptionDeleted(
  subscription: Stripe.Subscription
): Promise<SupporterSubscriptionDeletedResult> {
  if (!isSupporterSubscription(subscription)) {
    return { handled: false };
  }

  const userId = await resolveUserIdForSubscription(subscription);
  if (!userId) {
    return { handled: false };
  }

  const customerId = resolveStripeCustomerId(subscription.customer);
  if (customerId) {
    const hasOtherActive = await hasOtherActiveSupporterSubscription(
      customerId,
      subscription.id
    );
    if (hasOtherActive) {
      return {
        handled: true,
        userId,
        revoked: false,
        reason: "other_active_subscription",
      };
    }
  }

  const result = await revokeSupporterStatus(userId);

  return {
    handled: true,
    userId,
    revoked: result.revoked,
    reason: result.revoked ? undefined : result.reason,
  };
}
