import type Stripe from "stripe";
import { computeStripeConnectAmounts } from "@/lib/checkout-order";
import { adjustCreatorBalanceUsd } from "@/lib/creator-balance";
import { grantGameEntitlement } from "@/lib/game-entitlement-service";
import {
  markOrderSucceeded,
  type OrderRow,
} from "@/lib/checkout-order-webhook";
import { resolveEffectivePlatformFeePercent } from "@/lib/tip-fee-policy";
import { createServerSupabase } from "@/lib/supabase-server";

function roundUsd(value: number) {
  return Math.round(value * 100) / 100;
}

async function creditCreatorGamePurchasePayout(params: {
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

  if (gameError) {
    throw new Error(gameError.message);
  }

  if (!game?.creator_id) {
    return;
  }

  const platformCommissionRate =
    resolveEffectivePlatformFeePercent(game.platform_fee_percent) / 100;
  const amounts = computeStripeConnectAmounts({
    gamePriceCents: params.gamePriceCents,
    platformTipCents: params.platformTipCents,
    platformCommissionRate,
  });

  const payoutUsd = roundUsd(amounts.creator_payout_cents / 100);
  if (payoutUsd <= 0) {
    return;
  }

  await adjustCreatorBalanceUsd(game.creator_id, payoutUsd);
}

function readMetadataCents(
  session: Stripe.Checkout.Session,
  key: string
): number | null {
  const raw = session.metadata?.[key];
  if (raw == null) return null;
  const parsed = Number.parseInt(String(raw), 10);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : null;
}

export async function finalizeGamePurchaseCheckout(
  session: Stripe.Checkout.Session,
  order: OrderRow
) {
  if (order.order_type !== "game_purchase") {
    return false;
  }

  if (!order.game_id) {
    throw new Error("遊戲購買訂單缺少 game_id");
  }

  if (session.payment_status !== "paid") {
    throw new Error(
      `遊戲購買付款尚未完成（payment_status=${session.payment_status ?? "unknown"}）`
    );
  }

  const paidCents = session.amount_total ?? 0;
  if (paidCents <= 0) {
    throw new Error("遊戲購買付款金額無效");
  }
  if (paidCents !== order.total_amount_cents) {
    throw new Error("遊戲購買付款金額不符");
  }

  const metaGamePrice = readMetadataCents(session, "game_price_cents");
  const metaPlatformTip = readMetadataCents(session, "platform_tip_cents");
  const gamePriceCents = metaGamePrice ?? order.game_price_cents;
  const platformTipCents = metaPlatformTip ?? order.platform_tip_cents;
  const totalAmountCents = gamePriceCents + platformTipCents;

  if (totalAmountCents !== order.total_amount_cents) {
    if (paidCents !== totalAmountCents) {
      throw new Error("遊戲購買金額明細不符");
    }
  }

  const updated = await markOrderSucceeded(order.id, {
    game_price_cents: gamePriceCents,
    platform_tip_cents: platformTipCents,
    total_amount_cents: totalAmountCents,
  });

  if (!updated && order.status !== "succeeded") {
    throw new Error("無法更新遊戲購買訂單狀態");
  }

  if (updated) {
    await creditCreatorGamePurchasePayout({
      gameId: order.game_id,
      gamePriceCents,
      platformTipCents,
    });
  }

  await grantGameEntitlement({
    userId: order.buyer_id,
    gameId: order.game_id,
    orderId: order.id,
  });

  return true;
}
