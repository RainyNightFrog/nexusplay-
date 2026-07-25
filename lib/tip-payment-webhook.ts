import type Stripe from "stripe";
import { adjustCreatorBalanceUsd } from "@/lib/creator-balance";
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

export async function markTipPaymentFailed(paymentIntentId: string) {
  const supabase = createServerSupabase();

  const { data: tip } = await supabase
    .from("game_tips")
    .select("id, status")
    .eq("stripe_payment_intent_id", paymentIntentId)
    .maybeSingle();

  if (!tip) {
    return { handled: false as const };
  }

  if (
    tip.status === "failed" ||
    tip.status === "succeeded" ||
    tip.status === "refunded"
  ) {
    return { handled: true as const, tipId: tip.id, status: tip.status };
  }

  const { data: updated, error } = await supabase
    .from("game_tips")
    .update({ status: "failed" })
    .eq("id", tip.id)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!updated) {
    return { handled: true as const, tipId: tip.id, status: tip.status };
  }

  return { handled: true as const, tipId: tip.id, status: "failed" };
}

export async function handleTipRefund(charge: Stripe.Charge) {
  const paymentIntentId = resolvePaymentIntentId(charge.payment_intent);
  if (!paymentIntentId) {
    return { handled: false as const };
  }

  const supabase = createServerSupabase();
  const { data: tip, error: tipError } = await supabase
    .from("game_tips")
    .select("id, creator_id, creator_net_usd, creator_refunded_usd, status")
    .eq("stripe_payment_intent_id", paymentIntentId)
    .maybeSingle();

  if (tipError) {
    throw new Error(tipError.message);
  }

  if (!tip) {
    return { handled: false as const };
  }

  if (tip.status === "refunded") {
    return { handled: true as const, tipId: tip.id, status: "refunded" };
  }

  if (tip.status !== "succeeded") {
    return { handled: false as const };
  }

  const chargeTotal = charge.amount;
  const totalRefunded = charge.amount_refunded;
  if (chargeTotal <= 0 || totalRefunded <= 0) {
    return { handled: false as const };
  }

  const netUsd = roundUsd(Number(tip.creator_net_usd));
  const targetRefundNet = roundUsd(netUsd * (totalRefunded / chargeTotal));
  const alreadyRefunded = roundUsd(Number(tip.creator_refunded_usd ?? 0));
  const delta = roundUsd(targetRefundNet - alreadyRefunded);

  if (delta > 0) {
    await adjustCreatorBalanceUsd(tip.creator_id as string, -delta);
  }

  const fullyRefunded = totalRefunded >= chargeTotal;
  const { error: updateError } = await supabase
    .from("game_tips")
    .update({
      creator_refunded_usd: targetRefundNet,
      status: fullyRefunded ? "refunded" : "succeeded",
    })
    .eq("id", tip.id);

  if (updateError) {
    throw new Error(updateError.message);
  }

  return {
    handled: true as const,
    tipId: tip.id,
    status: fullyRefunded ? "refunded" : "succeeded",
  };
}

export async function handleTipDisputeCreated(dispute: Stripe.Dispute) {
  const paymentIntentId = resolvePaymentIntentId(
    typeof dispute.payment_intent === "string"
      ? dispute.payment_intent
      : dispute.payment_intent?.id
  );

  if (!paymentIntentId) {
    return { handled: false as const };
  }

  const supabase = createServerSupabase();
  const { data: tip } = await supabase
    .from("game_tips")
    .select("id, status, creator_id, creator_net_usd, creator_refunded_usd")
    .eq("stripe_payment_intent_id", paymentIntentId)
    .maybeSingle();

  if (!tip || tip.status !== "succeeded") {
    return { handled: false as const };
  }

  const netUsd = roundUsd(Number(tip.creator_net_usd));
  const alreadyRefunded = roundUsd(Number(tip.creator_refunded_usd ?? 0));
  const delta = roundUsd(netUsd - alreadyRefunded);

  if (delta > 0) {
    await adjustCreatorBalanceUsd(tip.creator_id as string, -delta);
    await supabase
      .from("game_tips")
      .update({
        status: "failed",
        creator_refunded_usd: netUsd,
      })
      .eq("id", tip.id)
      .eq("status", "succeeded");
  }

  return { handled: true as const, tipId: tip.id };
}

export async function handleTipDisputeClosed(dispute: Stripe.Dispute) {
  if (dispute.status !== "won") {
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

  const supabase = createServerSupabase();
  const { data: tip } = await supabase
    .from("game_tips")
    .select("id, status, creator_id, creator_net_usd, creator_refunded_usd")
    .eq("stripe_payment_intent_id", paymentIntentId)
    .maybeSingle();

  if (!tip || tip.status !== "failed") {
    return { handled: false as const };
  }

  // 爭議建立時已把 creator_refunded_usd 設為 netUsd；勝訴應還原已扣回的金額
  const restoreUsd = roundUsd(Number(tip.creator_refunded_usd ?? 0));

  if (restoreUsd > 0) {
    await adjustCreatorBalanceUsd(tip.creator_id as string, restoreUsd);
  }

  await supabase
    .from("game_tips")
    .update({
      status: "succeeded",
      creator_refunded_usd: 0,
    })
    .eq("id", tip.id)
    .eq("status", "failed");

  return { handled: true as const, tipId: tip.id };
}
