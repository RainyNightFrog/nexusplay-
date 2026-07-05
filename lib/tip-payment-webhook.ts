import type Stripe from "stripe";
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

  if (tip.status === "failed" || tip.status === "succeeded" || tip.status === "refunded") {
    return { handled: true as const, tipId: tip.id, status: tip.status };
  }

  const { error } = await supabase
    .from("game_tips")
    .update({ status: "failed" })
    .eq("id", tip.id)
    .eq("status", "pending");

  if (error) {
    throw new Error(error.message);
  }

  return { handled: true as const, tipId: tip.id, status: "failed" };
}

async function adjustCreatorBalance(creatorId: string, deltaUsd: number) {
  const supabase = createServerSupabase();
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("creator_balance_usd")
    .eq("id", creatorId)
    .maybeSingle();

  if (profileError) {
    throw new Error(profileError.message);
  }

  const current =
    typeof profile?.creator_balance_usd === "number"
      ? profile.creator_balance_usd
      : Number.parseFloat(String(profile?.creator_balance_usd ?? 0)) || 0;

  const nextBalance = roundUsd(Math.max(0, current + deltaUsd));

  const { error: updateError } = await supabase
    .from("profiles")
    .update({ creator_balance_usd: nextBalance })
    .eq("id", creatorId);

  if (updateError) {
    throw new Error(updateError.message);
  }
}

export async function handleTipRefund(charge: Stripe.Charge) {
  const paymentIntentId = resolvePaymentIntentId(charge.payment_intent);
  if (!paymentIntentId) {
    return { handled: false as const };
  }

  const supabase = createServerSupabase();
  const { data: tip, error: tipError } = await supabase
    .from("game_tips")
    .select("id, creator_id, creator_net_usd, status")
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

  if (tip.status === "succeeded") {
    const netUsd = roundUsd(Number(tip.creator_net_usd));
    await adjustCreatorBalance(tip.creator_id as string, -netUsd);
  }

  const { error: updateError } = await supabase
    .from("game_tips")
    .update({ status: "refunded" })
    .eq("id", tip.id);

  if (updateError) {
    throw new Error(updateError.message);
  }

  return { handled: true as const, tipId: tip.id, status: "refunded" };
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
    .select("id, status, creator_id, creator_net_usd")
    .eq("stripe_payment_intent_id", paymentIntentId)
    .maybeSingle();

  if (!tip || tip.status !== "succeeded") {
    return { handled: false as const };
  }

  await supabase
    .from("game_tips")
    .update({ status: "failed" })
    .eq("id", tip.id);

  const netUsd = roundUsd(Number(tip.creator_net_usd));
  await adjustCreatorBalance(tip.creator_id as string, -netUsd);

  return { handled: true as const, tipId: tip.id };
}
