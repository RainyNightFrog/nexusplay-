import type Stripe from "stripe";
import { createServerSupabase } from "@/lib/supabase-server";

function roundUsd(value: number) {
  return Math.round(value * 100) / 100;
}

async function findPayoutRow(payout: Stripe.Payout) {
  const supabase = createServerSupabase();

  if (payout.id) {
    const { data: byStripeId } = await supabase
      .from("creator_payouts")
      .select("*")
      .eq("stripe_payout_id", payout.id)
      .maybeSingle();

    if (byStripeId) return byStripeId;
  }

  const nexusplayPayoutId = payout.metadata?.nexusplay_payout_id?.trim();
  if (nexusplayPayoutId) {
    const { data: byMetadata } = await supabase
      .from("creator_payouts")
      .select("*")
      .eq("id", nexusplayPayoutId)
      .maybeSingle();

    if (byMetadata) return byMetadata;
  }

  const creatorId = payout.metadata?.nexusplay_creator_id?.trim();
  if (creatorId) {
    const { data: recent } = await supabase
      .from("creator_payouts")
      .select("*")
      .eq("creator_id", creatorId)
      .eq("mode", "live")
      .in("status", ["processing", "pending"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (recent) return recent;
  }

  return null;
}

async function restoreCreatorBalance(creatorId: string, amountUsd: number) {
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

  const nextBalance = roundUsd(current + amountUsd);

  const { error: updateError } = await supabase
    .from("profiles")
    .update({ creator_balance_usd: nextBalance })
    .eq("id", creatorId);

  if (updateError) {
    throw new Error(updateError.message);
  }
}

export async function syncCreatorPayoutFromStripeEvent(
  payout: Stripe.Payout
) {
  const row = await findPayoutRow(payout);
  if (!row) {
    return { handled: false as const };
  }

  const supabase = createServerSupabase();
  const amountUsd = roundUsd(Number(row.amount_usd));
  const previousStatus = row.status as string;
  const completedAt = new Date().toISOString();

  if (payout.status === "paid") {
    if (previousStatus === "paid") {
      return { handled: true as const, payoutId: row.id, status: "paid" };
    }

    const { error } = await supabase
      .from("creator_payouts")
      .update({
        status: "paid",
        stripe_payout_id: payout.id,
        completed_at: completedAt,
        failure_reason: null,
      })
      .eq("id", row.id);

    if (error) throw new Error(error.message);

    return { handled: true as const, payoutId: row.id, status: "paid" };
  }

  if (payout.status === "failed" || payout.status === "canceled") {
    if (previousStatus === "failed") {
      return { handled: true as const, payoutId: row.id, status: "failed" };
    }

    const failureReason =
      payout.failure_message ??
      payout.failure_code ??
      (payout.status === "canceled" ? "Payout canceled" : "Payout failed");

    const { error } = await supabase
      .from("creator_payouts")
      .update({
        status: "failed",
        stripe_payout_id: payout.id,
        failure_reason: failureReason,
        completed_at: completedAt,
      })
      .eq("id", row.id);

    if (error) throw new Error(error.message);

    if (previousStatus === "processing" || previousStatus === "pending") {
      await restoreCreatorBalance(row.creator_id as string, amountUsd);
    }

    return { handled: true as const, payoutId: row.id, status: "failed" };
  }

  if (payout.status === "pending" || payout.status === "in_transit") {
    if (previousStatus === "processing" || previousStatus === "paid") {
      return { handled: true as const, payoutId: row.id, status: previousStatus };
    }

    const { error } = await supabase
      .from("creator_payouts")
      .update({
        status: "processing",
        stripe_payout_id: payout.id,
      })
      .eq("id", row.id);

    if (error) throw new Error(error.message);

    return { handled: true as const, payoutId: row.id, status: "processing" };
  }

  return { handled: false as const };
}
