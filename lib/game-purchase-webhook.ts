import type Stripe from "stripe";
import { grantGameEntitlement } from "@/lib/game-entitlement-service";
import {
  markOrderSucceeded,
  type OrderRow,
} from "@/lib/checkout-order-webhook";

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

  const paidCents = session.amount_total ?? 0;
  if (paidCents > 0 && paidCents !== order.total_amount_cents) {
    throw new Error("遊戲購買付款金額不符");
  }

  const metaGamePrice = readMetadataCents(session, "game_price_cents");
  const metaPlatformTip = readMetadataCents(session, "platform_tip_cents");
  const gamePriceCents = metaGamePrice ?? order.game_price_cents;
  const platformTipCents = metaPlatformTip ?? order.platform_tip_cents;
  const totalAmountCents = gamePriceCents + platformTipCents;

  if (totalAmountCents !== order.total_amount_cents && paidCents > 0) {
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

  await grantGameEntitlement({
    userId: order.buyer_id,
    gameId: order.game_id,
    orderId: order.id,
  });

  return true;
}
