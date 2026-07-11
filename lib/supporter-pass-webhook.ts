import type Stripe from "stripe";
import { grantSupporterStatus } from "@/lib/supporter-pass-service";
import {
  markOrderSucceeded,
  type OrderRow,
} from "@/lib/checkout-order-webhook";

export async function finalizeSupporterPassCheckout(
  session: Stripe.Checkout.Session,
  order: OrderRow
) {
  if (order.order_type !== "supporter_pass") {
    return false;
  }

  const badge = session.metadata?.supporter_badge ?? "supporter_v1";

  const paidCents = session.amount_total ?? 0;
  if (paidCents > 0 && paidCents !== order.total_amount_cents) {
    throw new Error("支持者通行證付款金額不符");
  }

  const updated = await markOrderSucceeded(order.id, {
    game_price_cents: order.game_price_cents,
    platform_tip_cents: 0,
    total_amount_cents: order.total_amount_cents,
  });

  if (!updated && order.status !== "succeeded") {
    throw new Error("無法更新支持者訂單狀態");
  }

  const userId =
    session.metadata?.nexusplay_user_id ??
    session.client_reference_id ??
    order.buyer_id;

  await grantSupporterStatus({
    userId,
    badge,
  });

  return true;
}
