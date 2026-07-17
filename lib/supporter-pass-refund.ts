import type Stripe from "stripe";
import { revokeSupporterStatus } from "@/lib/supporter-pass-service";
import { createServerSupabase } from "@/lib/supabase-server";

function resolvePaymentIntentId(
  paymentIntent: string | Stripe.PaymentIntent | null | undefined
) {
  if (!paymentIntent) return null;
  return typeof paymentIntent === "string" ? paymentIntent : paymentIntent.id;
}

async function findSupporterOrderByPaymentIntent(paymentIntentId: string) {
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
      .select("id, buyer_id, order_type, total_amount_cents, status")
      .eq("stripe_session_id", session.id)
      .eq("order_type", "supporter_pass")
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (order) return order;
  }

  // fallback：metadata 訂單 id
  const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
  const orderId = paymentIntent.metadata?.nexusplay_order_id?.trim();
  if (!orderId) return null;

  const { data: order, error } = await supabase
    .from("orders")
    .select("id, buyer_id, order_type, total_amount_cents, status")
    .eq("id", orderId)
    .eq("order_type", "supporter_pass")
    .maybeSingle();

  if (error) throw new Error(error.message);
  return order ?? null;
}

/**
 * Stripe 退款／爭議成功時撤銷支持者權益（全額退款才撤）。
 * 避免 Dashboard 退款後用戶仍保留 VIP／永久身分。
 */
export async function handleSupporterPassRefund(charge: Stripe.Charge) {
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

  const order = await findSupporterOrderByPaymentIntent(paymentIntentId);
  if (!order) {
    return { handled: false as const };
  }

  const supabase = createServerSupabase();

  if (order.status === "refunded") {
    return {
      handled: true as const,
      orderId: order.id,
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
      orderId: order.id,
      status: "already_handled" as const,
    };
  }

  await revokeSupporterStatus(order.buyer_id as string, { force: true });

  return {
    handled: true as const,
    orderId: order.id,
    status: "refunded" as const,
    revoked: true as const,
  };
}

export async function handleSupporterPassDisputeLost(dispute: Stripe.Dispute) {
  if (dispute.status !== "lost") {
    return { handled: false as const };
  }

  const paymentIntentId = resolvePaymentIntentId(
    typeof dispute.payment_intent === "string"
      ? dispute.payment_intent
      : dispute.payment_intent?.id
  );
  if (!paymentIntentId) {
    return { handled: false as const };
  }

  // 以全額退款同等處理
  const fakeCharge = {
    payment_intent: paymentIntentId,
    amount: dispute.amount,
    amount_refunded: dispute.amount,
  } as Stripe.Charge;

  return handleSupporterPassRefund(fakeCharge);
}
