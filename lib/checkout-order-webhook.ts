import type Stripe from "stripe";
import type { OrderType } from "@/lib/checkout-order";
import { createServerSupabase } from "@/lib/supabase-server";

export type OrderRow = {
  id: string;
  buyer_id: string;
  game_id: number | null;
  order_type: OrderType;
  game_price_cents: number;
  platform_tip_cents: number;
  total_amount_cents: number;
  stripe_session_id: string | null;
  status: string;
};

export function resolveCheckoutOrderType(
  session: Stripe.Checkout.Session,
  order?: Pick<OrderRow, "order_type"> | null
): OrderType | null {
  const fromMetadata =
    session.metadata?.order_type ??
    session.metadata?.nexusplay_order_type ??
    null;

  if (
    fromMetadata === "game_purchase" ||
    fromMetadata === "supporter_pass"
  ) {
    return fromMetadata;
  }

  if (
    order?.order_type === "game_purchase" ||
    order?.order_type === "supporter_pass"
  ) {
    return order.order_type;
  }

  return null;
}

export async function findOrderByStripeSessionId(sessionId: string) {
  const supabase = createServerSupabase();
  const { data, error } = await supabase
    .from("orders")
    .select(
      "id, buyer_id, game_id, order_type, game_price_cents, platform_tip_cents, total_amount_cents, stripe_session_id, status"
    )
    .eq("stripe_session_id", sessionId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data as OrderRow | null) ?? null;
}

export async function findOrderByMetadataId(orderId: string) {
  const supabase = createServerSupabase();
  const { data, error } = await supabase
    .from("orders")
    .select(
      "id, buyer_id, game_id, order_type, game_price_cents, platform_tip_cents, total_amount_cents, stripe_session_id, status"
    )
    .eq("id", orderId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data as OrderRow | null) ?? null;
}

export function isOrderAlreadyProcessed(order: OrderRow | null) {
  return order?.status === "succeeded";
}

export async function resolveCheckoutOrder(
  session: Stripe.Checkout.Session
): Promise<OrderRow | null> {
  if (session.id) {
    const bySession = await findOrderByStripeSessionId(session.id);
    if (bySession) return bySession;
  }

  const orderId = session.metadata?.nexusplay_order_id;
  if (orderId) {
    return findOrderByMetadataId(orderId);
  }

  return null;
}

export async function markOrderSucceeded(
  orderId: string,
  amounts?: {
    game_price_cents?: number;
    platform_tip_cents?: number;
    total_amount_cents?: number;
  }
) {
  const supabase = createServerSupabase();
  const patch: Record<string, unknown> = { status: "succeeded" };

  if (amounts?.game_price_cents != null) {
    patch.game_price_cents = amounts.game_price_cents;
  }
  if (amounts?.platform_tip_cents != null) {
    patch.platform_tip_cents = amounts.platform_tip_cents;
  }
  if (amounts?.total_amount_cents != null) {
    patch.total_amount_cents = amounts.total_amount_cents;
  }

  const { data, error } = await supabase
    .from("orders")
    .update(patch)
    .eq("id", orderId)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return Boolean(data);
}

export type CheckoutSessionWebhookResult = {
  handled: boolean;
  duplicate: boolean;
  orderType?: OrderType;
};
