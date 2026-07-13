import type Stripe from "stripe";
import {
  DEFAULT_SUPPORTER_BADGE,
  formatCentsAsUsd,
  sanitizeCents,
} from "@/lib/checkout-order";
import { getCheckoutPaymentsState } from "@/lib/game-checkout-service";
import {
  resolveSupporterPassCheckout,
  type ResolvedSupporterPassCheckout,
} from "@/lib/supporter-pass";
import { ensurePayerStripeCustomer } from "@/lib/stripe-payer-customer";
import {
  getStripeClient,
  isPaymentsLive,
  resolveSiteUrl,
} from "@/lib/stripe-connect";
import { createServerSupabase } from "@/lib/supabase-server";
import { grantSupporterTitlesForBadge } from "@/lib/supporter-title-service";

export { getCheckoutPaymentsState, formatCentsAsUsd };

export async function grantSupporterStatus(params: {
  userId: string;
  badge: string;
}) {
  const supabase = createServerSupabase();
  const { data: existing } = await supabase
    .from("profiles")
    .select("is_supporter, supporter_since")
    .eq("id", params.userId)
    .maybeSingle();

  const { error } = await supabase
    .from("profiles")
    .update({
      is_supporter: true,
      supporter_since: existing?.supporter_since ?? new Date().toISOString(),
      supporter_badge: params.badge || DEFAULT_SUPPORTER_BADGE,
    })
    .eq("id", params.userId);

  if (error) {
    throw new Error(error.message);
  }

  await grantSupporterTitlesForBadge({
    supabase,
    userId: params.userId,
    badge: params.badge || DEFAULT_SUPPORTER_BADGE,
    autoEquip: true,
  });
}

export async function revokeSupporterStatus(userId: string) {
  const supabase = createServerSupabase();

  const { error } = await supabase
    .from("profiles")
    .update({
      is_supporter: false,
      supporter_badge: null,
    })
    .eq("id", userId);

  if (error) {
    throw new Error(error.message);
  }
}

function buildSupporterLineItem(
  checkout: ResolvedSupporterPassCheckout,
  productName: string
): Stripe.Checkout.SessionCreateParams.LineItem {
  return {
    price_data: {
      currency: "usd",
      unit_amount: checkout.priceCents,
      product_data: {
        name: productName,
      },
      recurring: { interval: checkout.interval },
    },
    quantity: 1,
  };
}

export async function createSupporterPassCheckoutSession(params: {
  userId: string;
  userEmail: string;
  displayName: string;
  tierId: string;
  localePath?: string;
  requestOrigin: string;
}) {
  if (!isPaymentsLive()) {
    return { mode: "preview" as const };
  }

  const resolved = resolveSupporterPassCheckout({
    tierId: params.tierId,
  });
  if (!resolved.ok) {
    return { error: resolved.error, status: 400 };
  }

  const checkout = resolved.checkout;
  const priceCents = sanitizeCents(checkout.priceCents);
  if (priceCents <= 0) {
    return { error: "方案金額無效", status: 400 };
  }

  const supabase = createServerSupabase();

  const { data: orderRow, error: insertError } = await supabase
    .from("orders")
    .insert({
      buyer_id: params.userId,
      game_id: null,
      order_type: "supporter_pass",
      game_price_cents: priceCents,
      platform_tip_cents: 0,
      total_amount_cents: priceCents,
      status: "pending",
    })
    .select("id")
    .single();

  if (insertError) {
    throw new Error(insertError.message);
  }

  const payerProfile = await supabase
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", params.userId)
    .maybeSingle();

  const customerId = await ensurePayerStripeCustomer({
    supabase,
    userId: params.userId,
    email: params.userEmail,
    displayName: params.displayName,
    existingCustomerId: payerProfile.data?.stripe_customer_id ?? null,
  });

  const stripe = getStripeClient();
  const siteUrl = resolveSiteUrl(params.requestOrigin);
  const supporterPath = params.localePath ?? "/supporter";
  const productName =
    checkout.interval === "year"
      ? `平台支持者年費 · $${formatCentsAsUsd(priceCents)}`
      : `平台支持者月費 · $${formatCentsAsUsd(priceCents)}`;

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    client_reference_id: params.userId,
    line_items: [buildSupporterLineItem(checkout, productName)],
    subscription_data: {
      metadata: {
        nexusplay_user_id: params.userId,
        order_type: "supporter_pass",
        nexusplay_order_type: "supporter_pass",
        supporter_tier_id: checkout.tierId,
        supporter_badge: checkout.badge,
        billing_interval: checkout.interval,
      },
    },
    metadata: {
      nexusplay_order_id: orderRow.id,
      order_type: "supporter_pass",
      nexusplay_order_type: "supporter_pass",
      nexusplay_user_id: params.userId,
      supporter_tier_id: checkout.tierId,
      supporter_badge: checkout.badge,
      billing_interval: checkout.interval,
      game_price_cents: String(priceCents),
      platform_tip_cents: "0",
      total_amount_cents: String(priceCents),
    },
    success_url: `${siteUrl}${supporterPath}?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${siteUrl}${supporterPath}?checkout=cancelled`,
  });

  const { error: updateError } = await supabase
    .from("orders")
    .update({ stripe_session_id: session.id })
    .eq("id", orderRow.id);

  if (updateError) {
    throw new Error(updateError.message);
  }

  if (!session.url) {
    return { error: "無法建立結帳連結", status: 500 };
  }

  return {
    mode: "live" as const,
    url: session.url,
    orderId: orderRow.id,
    checkout,
    priceCents,
  };
}

export async function recordPreviewSupporterPass(params: {
  userId: string;
  tierId: string;
}) {
  const resolved = resolveSupporterPassCheckout({
    tierId: params.tierId,
  });
  if (!resolved.ok) {
    return { error: resolved.error, status: 400 };
  }

  const checkout = resolved.checkout;
  const priceCents = sanitizeCents(checkout.priceCents);
  const supabase = createServerSupabase();

  const { data, error } = await supabase
    .from("orders")
    .insert({
      buyer_id: params.userId,
      game_id: null,
      order_type: "supporter_pass",
      game_price_cents: priceCents,
      platform_tip_cents: 0,
      total_amount_cents: priceCents,
      status: "pending",
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  await grantSupporterStatus({
    userId: params.userId,
    badge: checkout.badge,
  });

  return {
    mode: "preview" as const,
    orderId: data.id,
    checkout,
    priceCents,
  };
}
