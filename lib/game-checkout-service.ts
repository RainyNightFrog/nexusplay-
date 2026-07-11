import type { SupabaseClient } from "@supabase/supabase-js";
import type Stripe from "stripe";
import {
  computeStripeConnectAmounts,
  parsePlatformTipInput,
  type StripeConnectAmounts,
} from "@/lib/checkout-order";
import { canCreatorReceivePaidPayments } from "@/lib/creator-stripe-gate";
import {
  parseDisplayAmountToCents,
  parsePricingType,
  type GamePricingType,
} from "@/lib/game-pricing";
import { resolveEffectivePlatformFeePercent } from "@/lib/tip-fee-policy";
import { ensurePayerStripeCustomer } from "@/lib/tip-checkout-service";
import {
  getStripeClient,
  isPaymentsLive,
  isStripeConfigured,
  resolveSiteUrl,
} from "@/lib/stripe-connect";
import { createServerSupabase } from "@/lib/supabase-server";
import type { GameRecord } from "@/lib/supabase";

export type GameCheckoutContext = {
  game: GameRecord;
  creatorProfile: {
    stripe_connect_account_id: string | null;
    stripe_account_id: string | null;
    payout_status: string;
    stripe_customer_id: string | null;
    display_name: string;
  };
  platformFeePercent: number;
  platformCommissionRate: number;
  gamePriceCents: number;
  amounts: StripeConnectAmounts;
};

export function getCheckoutPaymentsState() {
  return {
    stripeConfigured: isStripeConfigured(),
    paymentsLive: isPaymentsLive(),
    publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? null,
  };
}

function resolveGamePriceCents(
  game: Pick<GameRecord, "pricing_type" | "price" | "min_price">,
  body: { gameAmountCents?: unknown; gameAmount?: unknown }
):
  | { ok: true; cents: number }
  | { ok: false; error: string } {
  const pricingType = parsePricingType(game.pricing_type);

  if (pricingType === "free") {
    return { ok: false, error: "此遊戲為免費，無需結帳" };
  }

  if (pricingType === "fixed") {
    const priceCents =
      typeof game.price === "number" && Number.isFinite(game.price)
        ? Math.max(0, Math.trunc(game.price))
        : 0;
    if (priceCents <= 0) {
      return { ok: false, error: "遊戲售價設定無效" };
    }
    return { ok: true, cents: priceCents };
  }

  const minPriceCents =
    typeof game.min_price === "number" && Number.isFinite(game.min_price)
      ? Math.max(0, Math.trunc(game.min_price))
      : 0;

  let amountCents: number | null = null;
  if (body.gameAmountCents !== undefined && body.gameAmountCents !== null) {
    const raw =
      typeof body.gameAmountCents === "number"
        ? body.gameAmountCents
        : Number.parseInt(String(body.gameAmountCents).trim(), 10);
    if (!Number.isFinite(raw) || raw < 0) {
      return { ok: false, error: "遊戲金額格式無效" };
    }
    amountCents = Math.trunc(raw);
  } else if (body.gameAmount !== undefined && body.gameAmount !== null) {
    const raw =
      typeof body.gameAmount === "number"
        ? body.gameAmount
        : Number.parseFloat(String(body.gameAmount).trim());
    if (!Number.isFinite(raw) || raw < 0) {
      return { ok: false, error: "遊戲金額格式無效" };
    }
    amountCents = Math.round(raw * 100);
  }

  if (amountCents == null) {
    return { ok: false, error: "請輸入願付金額" };
  }
  if (amountCents < minPriceCents) {
    return {
      ok: false,
      error: `金額不可低於最低 $${(minPriceCents / 100).toFixed(2)}`,
    };
  }
  if (amountCents <= 0) {
    return { ok: false, error: "金額必須大於 0" };
  }

  return { ok: true, cents: amountCents };
}

export async function loadGameCheckoutContext(
  supabase: SupabaseClient,
  gameId: number,
  body: {
    platformTipAmount?: unknown;
    platformTipCents?: unknown;
    gameAmountCents?: unknown;
    gameAmount?: unknown;
  }
): Promise<GameCheckoutContext | { error: string; status: number }> {
  const { data: game, error: gameError } = await supabase
    .from("games")
    .select("*")
    .eq("id", gameId)
    .maybeSingle();

  if (gameError) {
    throw new Error(gameError.message);
  }

  if (!game) {
    return { error: "找不到此遊戲", status: 404 };
  }

  if (game.publish_status !== "public") {
    return { error: "此遊戲尚未公開販售", status: 400 };
  }

  const pricingType = parsePricingType(game.pricing_type);
  if (pricingType === "free") {
    return { error: "此遊戲為免費，無需結帳", status: 400 };
  }

  if (!game.creator_id) {
    return { error: "創作者資訊不完整", status: 400 };
  }

  const priceResult = resolveGamePriceCents(game, body);
  if (!priceResult.ok) {
    return { error: priceResult.error, status: 400 };
  }

  const tipResult = parsePlatformTipInput(body);
  if (!tipResult.ok) {
    return { error: tipResult.error, status: 400 };
  }

  const { data: creatorProfile, error: profileError } = await supabase
    .from("profiles")
    .select(
      "stripe_connect_account_id, stripe_account_id, payout_status, stripe_customer_id, display_name, stripe_details_submitted"
    )
    .eq("id", game.creator_id)
    .maybeSingle();

  if (profileError) {
    throw new Error(profileError.message);
  }

  if (!creatorProfile) {
    return { error: "找不到創作者資料", status: 400 };
  }

  if (!canCreatorReceivePaidPayments(creatorProfile)) {
    return {
      error: "創作者尚未完成收款設定，暫無法購買",
      status: 503,
    };
  }

  const platformFeePercent = resolveEffectivePlatformFeePercent(
    game.platform_fee_percent
  );
  const platformCommissionRate = platformFeePercent / 100;
  const amounts = computeStripeConnectAmounts({
    gamePriceCents: priceResult.cents,
    platformTipCents: tipResult.cents,
    platformCommissionRate,
  });

  if (amounts.total_amount_cents <= 0) {
    return { error: "結帳金額必須大於 0", status: 400 };
  }

  return {
    game: game as GameRecord,
    creatorProfile,
    platformFeePercent,
    platformCommissionRate,
    gamePriceCents: priceResult.cents,
    amounts,
  };
}

export async function loadGameCheckoutInfo(
  supabase: SupabaseClient,
  gameId: number
) {
  const { data: game, error: gameError } = await supabase
    .from("games")
    .select(
      "id, title, pricing_type, price, min_price, currency, platform_fee_percent, publish_status, creator_id"
    )
    .eq("id", gameId)
    .maybeSingle();

  if (gameError) {
    throw new Error(gameError.message);
  }

  if (!game) {
    return { error: "找不到此遊戲", status: 404 as const };
  }

  const pricingType = parsePricingType(game.pricing_type);
  if (pricingType === "free") {
    return { error: "此遊戲為免費，無需結帳", status: 400 as const };
  }

  if (!game.creator_id) {
    return { error: "創作者資訊不完整", status: 400 as const };
  }

  const { data: creatorProfile, error: profileError } = await supabase
    .from("profiles")
    .select(
      "stripe_connect_account_id, stripe_account_id, payout_status, stripe_details_submitted"
    )
    .eq("id", game.creator_id)
    .maybeSingle();

  if (profileError) {
    throw new Error(profileError.message);
  }

  const platformFeePercent = resolveEffectivePlatformFeePercent(
    game.platform_fee_percent
  );

  return {
    game,
    pricingType,
    platformFeePercent,
    creatorPayoutReady: canCreatorReceivePaidPayments(creatorProfile),
    fixedPriceCents:
      pricingType === "fixed" && typeof game.price === "number"
        ? Math.max(0, Math.trunc(game.price))
        : null,
    minPriceCents:
      typeof game.min_price === "number"
        ? Math.max(0, Math.trunc(game.min_price))
        : 0,
  };
}

function buildCheckoutLineItems(
  gameTitle: string,
  amounts: StripeConnectAmounts,
  currency: string
): Stripe.Checkout.SessionCreateParams.LineItem[] {
  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
    {
      price_data: {
        currency,
        unit_amount: amounts.game_price_cents,
        product_data: {
          name: gameTitle,
        },
      },
      quantity: 1,
    },
  ];

  if (amounts.platform_tip_cents > 0) {
    lineItems.push({
      price_data: {
        currency,
        unit_amount: amounts.platform_tip_cents,
        product_data: {
          name: "支持平台（平台小費）",
        },
      },
      quantity: 1,
    });
  }

  return lineItems;
}

export async function createGameCheckoutSession(params: {
  gameId: number;
  buyerId: string;
  buyerEmail: string;
  buyerDisplayName: string;
  platformTipAmount?: unknown;
  platformTipCents?: unknown;
  gameAmountCents?: unknown;
  gameAmount?: unknown;
  localePath?: string;
  requestOrigin: string;
}) {
  if (!isPaymentsLive()) {
    return { mode: "preview" as const };
  }

  const supabase = createServerSupabase();
  const context = await loadGameCheckoutContext(supabase, params.gameId, params);

  if ("error" in context) {
    return { error: context.error, status: context.status };
  }

  const { game, creatorProfile, amounts, platformFeePercent } = context;

  if (params.buyerId === game.creator_id) {
    return { error: "不能購買自己的遊戲", status: 403 };
  }

  const creatorAccountId =
    creatorProfile.stripe_connect_account_id ??
    creatorProfile.stripe_account_id;

  if (!creatorAccountId) {
    return { error: "創作者尚未連結 Stripe", status: 503 };
  }

  const payerProfile = await supabase
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", params.buyerId)
    .maybeSingle();

  const customerId = await ensurePayerStripeCustomer({
    supabase,
    userId: params.buyerId,
    email: params.buyerEmail,
    displayName: params.buyerDisplayName,
    existingCustomerId: payerProfile.data?.stripe_customer_id ?? null,
  });

  const { data: orderRow, error: insertError } = await supabase
    .from("orders")
    .insert({
      buyer_id: params.buyerId,
      game_id: game.id,
      order_type: "game_purchase",
      game_price_cents: amounts.game_price_cents,
      platform_tip_cents: amounts.platform_tip_cents,
      total_amount_cents: amounts.total_amount_cents,
      status: "pending",
    })
    .select("id")
    .single();

  if (insertError) {
    throw new Error(insertError.message);
  }

  const stripe = getStripeClient();
  const currency = (game.currency ?? "USD").trim().toLowerCase() || "usd";
  const siteUrl = resolveSiteUrl(params.requestOrigin);
  const gamePath = params.localePath ?? `/game/${game.id}`;

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer: customerId,
    line_items: buildCheckoutLineItems(game.title, amounts, currency),
    payment_intent_data: {
      application_fee_amount: amounts.application_fee_amount,
      transfer_data: {
        destination: creatorAccountId,
      },
      metadata: {
        nexusplay_order_id: orderRow.id,
        nexusplay_order_type: "game_purchase",
        nexusplay_game_id: String(game.id),
        nexusplay_buyer_id: params.buyerId,
        nexusplay_creator_id: game.creator_id!,
        game_price_cents: String(amounts.game_price_cents),
        platform_tip_cents: String(amounts.platform_tip_cents),
        standard_commission_cents: String(amounts.standard_commission_cents),
        creator_payout_cents: String(amounts.creator_payout_cents),
        platform_fee_percent: String(platformFeePercent),
      },
    },
    metadata: {
      nexusplay_order_id: orderRow.id,
      order_type: "game_purchase",
      nexusplay_order_type: "game_purchase",
      nexusplay_game_id: String(game.id),
      nexusplay_buyer_id: params.buyerId,
      game_price_cents: String(amounts.game_price_cents),
      platform_tip_cents: String(amounts.platform_tip_cents),
      total_amount_cents: String(amounts.total_amount_cents),
    },
    success_url: `${siteUrl}${gamePath}?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${siteUrl}${gamePath}?checkout=cancelled`,
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
    amounts,
    platformFeePercent,
    creatorPayoutCents: amounts.creator_payout_cents,
  };
}

export async function recordPreviewCheckout(params: {
  gameId: number;
  buyerId: string;
  platformTipAmount?: unknown;
  platformTipCents?: unknown;
  gameAmountCents?: unknown;
  gameAmount?: unknown;
}) {
  const supabase = createServerSupabase();
  const context = await loadGameCheckoutContext(supabase, params.gameId, params);

  if ("error" in context) {
    return { error: context.error, status: context.status };
  }

  const { game, amounts, platformFeePercent } = context;

  if (params.buyerId === game.creator_id) {
    return { error: "不能購買自己的遊戲", status: 403 };
  }

  const { data, error } = await supabase
    .from("orders")
    .insert({
      buyer_id: params.buyerId,
      game_id: game.id,
      order_type: "game_purchase",
      game_price_cents: amounts.game_price_cents,
      platform_tip_cents: amounts.platform_tip_cents,
      total_amount_cents: amounts.total_amount_cents,
      status: "pending",
    })
    .select("id, game_price_cents, platform_tip_cents, total_amount_cents")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return {
    mode: "preview" as const,
    orderId: data.id,
    amounts,
    platformFeePercent,
    creatorPayoutCents: amounts.creator_payout_cents,
    gameTitle: game.title,
  };
}

export function gameRequiresCheckout(pricingType?: GamePricingType | string | null) {
  const normalized = parsePricingType(pricingType);
  return normalized === "fixed" || normalized === "pwyw";
}

export function formatCentsAsUsd(cents: number) {
  return (Math.max(0, cents) / 100).toFixed(2);
}

export { parseDisplayAmountToCents };
