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
import { creditSupporterPassBonusForCheckout } from "@/lib/supporter-ap-bonus";
import { announceLifetimeSupporterBecome } from "@/lib/supporter-lifetime-announce";
import { ensurePayerStripeCustomer } from "@/lib/stripe-payer-customer";
import {
  getStripeClient,
  isPaymentsLive,
  resolveSiteUrl,
} from "@/lib/stripe-connect";
import { createServerSupabase } from "@/lib/supabase-server";
import {
  grantLifetimeRainyNightFrogTitle,
  grantSupporterTitlesForBadge,
  revokeSupporterTitles,
} from "@/lib/supporter-title-service";

export { getCheckoutPaymentsState, formatCentsAsUsd };

export async function grantSupporterStatus(params: {
  userId: string;
  badge: string;
  lifetime?: boolean;
}) {
  const supabase = createServerSupabase();
  const { data: existing } = await supabase
    .from("profiles")
    .select("is_supporter, supporter_since, supporter_lifetime, display_name")
    .eq("id", params.userId)
    .maybeSingle();

  const wasLifetime = existing?.supporter_lifetime === true;
  const patch: Record<string, unknown> = {
    is_supporter: true,
    supporter_since: existing?.supporter_since ?? new Date().toISOString(),
    supporter_badge: params.badge || DEFAULT_SUPPORTER_BADGE,
  };

  if (params.lifetime) {
    patch.supporter_lifetime = true;
  }

  const { error } = await supabase
    .from("profiles")
    .update(patch)
    .eq("id", params.userId);

  if (error) {
    throw new Error(error.message);
  }

  await grantSupporterTitlesForBadge({
    supabase,
    userId: params.userId,
    badge: params.badge || DEFAULT_SUPPORTER_BADGE,
    autoEquip: !params.lifetime,
  });

  if (params.lifetime) {
    await grantLifetimeRainyNightFrogTitle({
      supabase,
      userId: params.userId,
      autoEquip: true,
    });

    if (!wasLifetime) {
      try {
        await announceLifetimeSupporterBecome({
          userId: params.userId,
          displayName: existing?.display_name ?? null,
        });
      } catch {
        // 廣播失敗不應阻擋授予身分
      }
    }
  }
}

export async function revokeSupporterStatus(
  userId: string,
  options?: { force?: boolean }
) {
  const supabase = createServerSupabase();

  const { data: existing } = await supabase
    .from("profiles")
    .select("supporter_lifetime")
    .eq("id", userId)
    .maybeSingle();

  // 永久支持者不受訂閱取消影響；後台可 force 強制撤銷
  if (existing?.supporter_lifetime === true && !options?.force) {
    return { revoked: false as const, reason: "lifetime" as const };
  }

  await revokeSupporterTitles({ supabase, userId });

  // 強制撤銷時一併收回永久稱號
  if (options?.force && existing?.supporter_lifetime === true) {
    const { data: lifetimeTitle } = await supabase
      .from("titles")
      .select("id")
      .eq("name", "RainyNightFrog")
      .maybeSingle();

    if (lifetimeTitle?.id) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("equipped_title_id")
        .eq("id", userId)
        .maybeSingle();

      if (profile?.equipped_title_id === lifetimeTitle.id) {
        await supabase
          .from("profiles")
          .update({ equipped_title_id: null })
          .eq("id", userId);
      }

      await supabase
        .from("user_titles")
        .delete()
        .eq("user_id", userId)
        .eq("title_id", lifetimeTitle.id);
    }
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      is_supporter: false,
      supporter_badge: null,
      supporter_since: null,
      supporter_lifetime: false,
      supporter_lifetime_announced_at: null,
    })
    .eq("id", userId);

  if (error) {
    throw new Error(error.message);
  }

  return { revoked: true as const };
}

function buildSubscriptionLineItem(
  checkout: ResolvedSupporterPassCheckout,
  productName: string
): Stripe.Checkout.SessionCreateParams.LineItem {
  if (checkout.interval === "lifetime") {
    throw new Error("永久方案不可建立訂閱項目");
  }

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

function buildOneTimeLineItem(
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
    },
    quantity: 1,
  };
}

export async function createSupporterPassCheckoutSession(params: {
  userId: string;
  userEmail: string;
  displayName: string;
  tierId: string;
  customAmountUsd?: unknown;
  localePath?: string;
  requestOrigin: string;
}) {
  if (!isPaymentsLive()) {
    return { mode: "preview" as const };
  }

  const resolved = resolveSupporterPassCheckout({
    tierId: params.tierId,
    customAmountUsd: params.customAmountUsd,
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
  const productName = checkout.lifetime
    ? `平台支持者 · $${formatCentsAsUsd(priceCents)}`
    : checkout.interval === "year"
      ? `平台支持者年費 · $${formatCentsAsUsd(priceCents)}`
      : `平台支持者月費 · $${formatCentsAsUsd(priceCents)}`;

  const sharedMetadata = {
    nexusplay_order_id: orderRow.id,
    order_type: "supporter_pass",
    nexusplay_order_type: "supporter_pass",
    nexusplay_user_id: params.userId,
    supporter_tier_id: checkout.tierId,
    supporter_badge: checkout.badge,
    billing_interval: checkout.interval,
    supporter_lifetime: checkout.lifetime ? "1" : "0",
    game_price_cents: String(priceCents),
    platform_tip_cents: "0",
    total_amount_cents: String(priceCents),
  };

  const session = checkout.lifetime
    ? await stripe.checkout.sessions.create({
        mode: "payment",
        customer: customerId,
        client_reference_id: params.userId,
        // 鎖定信用卡，避免延遲付款在未入帳時觸發 completed
        payment_method_types: ["card"],
        line_items: [buildOneTimeLineItem(checkout, productName)],
        metadata: sharedMetadata,
        success_url: `${siteUrl}${supporterPath}?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${siteUrl}${supporterPath}?checkout=cancelled`,
      })
    : await stripe.checkout.sessions.create({
        mode: "subscription",
        customer: customerId,
        client_reference_id: params.userId,
        payment_method_types: ["card"],
        line_items: [buildSubscriptionLineItem(checkout, productName)],
        subscription_data: {
          metadata: {
            nexusplay_user_id: params.userId,
            order_type: "supporter_pass",
            nexusplay_order_type: "supporter_pass",
            supporter_tier_id: checkout.tierId,
            supporter_badge: checkout.badge,
            billing_interval: checkout.interval,
            supporter_lifetime: "0",
          },
        },
        metadata: sharedMetadata,
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
  customAmountUsd?: unknown;
}) {
  const resolved = resolveSupporterPassCheckout({
    tierId: params.tierId,
    customAmountUsd: params.customAmountUsd,
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
    lifetime: checkout.lifetime,
  });

  await creditSupporterPassBonusForCheckout({
    userId: params.userId,
    orderId: data.id,
    checkout,
    supabase,
  });

  return {
    mode: "preview" as const,
    orderId: data.id,
    checkout,
    priceCents,
  };
}
