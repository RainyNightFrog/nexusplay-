import type Stripe from "stripe";
import { computeStripeConnectAmounts } from "@/lib/checkout-order";
import { adjustCreatorBalanceUsd } from "@/lib/creator-balance";
import { revokeGameEntitlement } from "@/lib/game-entitlement-service";
import { resolveEffectivePlatformFeePercent } from "@/lib/tip-fee-policy";
import { createServerSupabase } from "@/lib/supabase-server";

function roundUsd(value: number) {
  return Math.round(value * 100) / 100;
}

function resolvePaymentIntentId(
  paymentIntent: string | Stripe.PaymentIntent | null | undefined
) {
  if (!paymentIntent) return null;
  return typeof paymentIntent === "string" ? paymentIntent : paymentIntent.id;
}

export async function debitCreatorGamePurchasePayout(params: {
  gameId: number;
  gamePriceCents: number;
  platformTipCents: number;
}) {
  const supabase = createServerSupabase();
  const { data: game, error: gameError } = await supabase
    .from("games")
    .select("creator_id, platform_fee_percent")
    .eq("id", params.gameId)
    .maybeSingle();

  if (gameError) throw new Error(gameError.message);
  if (!game?.creator_id) return;

  const platformCommissionRate =
    resolveEffectivePlatformFeePercent(game.platform_fee_percent) / 100;
  const amounts = computeStripeConnectAmounts({
    gamePriceCents: params.gamePriceCents,
    platformTipCents: params.platformTipCents,
    platformCommissionRate,
  });

  const payoutUsd = roundUsd(amounts.creator_payout_cents / 100);
  if (payoutUsd <= 0) return;

  await adjustCreatorBalanceUsd(game.creator_id, -payoutUsd);
}

async function findGamePurchaseOrderByPaymentIntent(paymentIntentId: string) {
  const supabase = createServerSupabase();
  const stripe = (await import("@/lib/stripe-connect")).getStripeClient();

  const sessions = await stripe.checkout.sessions.list({
    payment_intent: paymentIntentId,
    limit: 5,
  });

  for (const session of sessions.data) {
    if (!session.id) continue;
    const { data: order, error } = await supabase
      .from("orders")
      .select(
        "id, buyer_id, game_id, order_type, game_price_cents, platform_tip_cents, total_amount_cents, status"
      )
      .eq("stripe_session_id", session.id)
      .eq("order_type", "game_purchase")
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (order) return order;
  }

  const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
  const orderId = paymentIntent.metadata?.nexusplay_order_id?.trim();
  if (!orderId) return null;

  const { data: order, error } = await supabase
    .from("orders")
    .select(
      "id, buyer_id, game_id, order_type, game_price_cents, platform_tip_cents, total_amount_cents, status"
    )
    .eq("id", orderId)
    .eq("order_type", "game_purchase")
    .maybeSingle();

  if (error) throw new Error(error.message);
  return order ?? null;
}

/**
 * Stripe charge.refunded（Dashboard／客戶退款）：
 * 全額退款時撤銷遊戲權益並扣回創作者帳本。
 * 管理員後台退款已先標 refunded 並自行扣帳，此處會略過。
 */
export async function handleGamePurchaseRefund(charge: Stripe.Charge) {
  const paymentIntentId = resolvePaymentIntentId(charge.payment_intent);
  if (!paymentIntentId) {
    return { handled: false as const };
  }

  if (charge.amount <= 0 || charge.amount_refunded <= 0) {
    return { handled: false as const };
  }

  const fullyRefunded = charge.amount_refunded >= charge.amount;
  if (!fullyRefunded) {
    return { handled: false as const, reason: "partial_refund" as const };
  }

  const order = await findGamePurchaseOrderByPaymentIntent(paymentIntentId);
  if (!order || !order.game_id) {
    return { handled: false as const };
  }

  const supabase = createServerSupabase();

  if (order.status === "refunded") {
    return {
      handled: true as const,
      orderId: order.id as string,
      status: "refunded" as const,
    };
  }

  if (order.status !== "succeeded") {
    return { handled: false as const };
  }

  const { data: updated, error } = await supabase
    .from("orders")
    .update({ status: "refunded" })
    .eq("id", order.id)
    .eq("status", "succeeded")
    .select("id")
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!updated) {
    return {
      handled: true as const,
      orderId: order.id as string,
      status: "already_handled" as const,
    };
  }

  await debitCreatorGamePurchasePayout({
    gameId: order.game_id as number,
    gamePriceCents: order.game_price_cents as number,
    platformTipCents: order.platform_tip_cents as number,
  });

  await revokeGameEntitlement({
    userId: order.buyer_id as string,
    gameId: order.game_id as number,
  });

  return {
    handled: true as const,
    orderId: order.id as string,
    status: "refunded" as const,
    revoked: true as const,
  };
}
