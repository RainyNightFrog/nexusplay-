import type Stripe from "stripe";
import {
  creditSupporterPassBonusAp,
  resolveSupporterBonusApFromTierMetadata,
} from "@/lib/supporter-ap-bonus";
import { getStripeClient } from "@/lib/stripe-connect";
import { createServerSupabase } from "@/lib/supabase-server";

export type SupporterInvoicePaidResult =
  | { handled: false }
  | {
      handled: true;
      userId: string;
      credited: boolean;
      amount: number;
      reason?: "not_renewal" | "not_supporter" | "no_user" | "no_bonus";
    };

function resolveSubscriptionId(invoice: Stripe.Invoice): string | null {
  const raw = invoice.parent?.subscription_details?.subscription;
  if (!raw) return null;
  return typeof raw === "string" ? raw : raw.id;
}

function resolveInvoiceSubscriptionMetadata(
  invoice: Stripe.Invoice
): Stripe.Metadata | null {
  return invoice.parent?.subscription_details?.metadata ?? null;
}

function isSupporterSubscriptionMetadata(
  metadata: Stripe.Metadata | null | undefined
) {
  if (!metadata) return false;
  return (
    metadata.nexusplay_order_type === "supporter_pass" ||
    metadata.order_type === "supporter_pass" ||
    Boolean(metadata.supporter_tier_id?.trim())
  );
}

/**
 * 訂閱續訂成功時贈送 AP。
 * 略過 subscription_create（首次由 checkout.session.completed 以 order 發放，避免雙重入帳）。
 */
export async function handleSupporterInvoicePaid(
  invoice: Stripe.Invoice
): Promise<SupporterInvoicePaidResult> {
  const billingReason = invoice.billing_reason;
  if (
    billingReason !== "subscription_cycle" &&
    billingReason !== "subscription_update"
  ) {
    return { handled: false };
  }

  if (invoice.status !== "paid") {
    return { handled: false };
  }

  const snapshotMeta = resolveInvoiceSubscriptionMetadata(invoice);
  const subscriptionId = resolveSubscriptionId(invoice);

  let metadata = snapshotMeta;

  if (!isSupporterSubscriptionMetadata(metadata) && subscriptionId) {
    const stripe = getStripeClient();
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    metadata = subscription.metadata ?? null;
  }

  if (!isSupporterSubscriptionMetadata(metadata)) {
    return { handled: false };
  }

  const userId =
    metadata?.nexusplay_user_id?.trim() ||
    invoice.metadata?.nexusplay_user_id?.trim() ||
    null;

  let resolvedUserId = userId;
  if (!resolvedUserId) {
    const customerId =
      typeof invoice.customer === "string"
        ? invoice.customer
        : invoice.customer?.id ?? null;
    if (customerId) {
      const supabase = createServerSupabase();
      const { data } = await supabase
        .from("profiles")
        .select("id")
        .eq("stripe_customer_id", customerId)
        .maybeSingle();
      resolvedUserId = data?.id ?? null;
    }
  }

  if (!resolvedUserId) {
    return {
      handled: true,
      userId: "",
      credited: false,
      amount: 0,
      reason: "no_user",
    };
  }

  const tierId = metadata?.supporter_tier_id?.trim() ?? null;
  const amountPaidCents =
    typeof invoice.amount_paid === "number" ? invoice.amount_paid : null;
  const bonusAp = resolveSupporterBonusApFromTierMetadata({
    tierId,
    amountPaidCents,
  });

  if (bonusAp <= 0) {
    return {
      handled: true,
      userId: resolvedUserId,
      credited: false,
      amount: 0,
      reason: "no_bonus",
    };
  }

  const result = await creditSupporterPassBonusAp({
    userId: resolvedUserId,
    bonusAp,
    refType: "stripe_invoice",
    refId: invoice.id,
  });

  return {
    handled: true,
    userId: resolvedUserId,
    credited: result.credited,
    amount: result.amount,
  };
}
