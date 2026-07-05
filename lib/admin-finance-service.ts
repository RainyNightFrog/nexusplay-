import {
  fetchConnectAvailableBalanceUsd,
  isPaymentsLive,
} from "@/lib/stripe-connect";
import { createServerSupabase } from "@/lib/supabase-server";

function roundUsd(value: number | string | null | undefined) {
  const numeric =
    typeof value === "number"
      ? value
      : Number.parseFloat(String(value ?? 0)) || 0;
  return Math.round(numeric * 100) / 100;
}

export type FinanceReconcileRow = {
  creatorId: string;
  displayName: string;
  ledgerUsd: number;
  stripeAvailableUsd: number | null;
  diffUsd: number | null;
  payoutStatus: string;
  stripeConnectAccountId: string | null;
};

export type AdminTipRow = {
  id: string;
  gameId: number;
  gameTitle: string;
  amountUsd: number;
  creatorNetUsd: number;
  status: string;
  createdAt: string;
  stripePaymentIntentId: string | null;
  payerEmail: string | null;
  creatorId: string;
};

export async function reconcileCreatorFinance(): Promise<FinanceReconcileRow[]> {
  const supabase = createServerSupabase();
  const paymentsLive = isPaymentsLive();

  const { data: profiles, error } = await supabase
    .from("profiles")
    .select(
      "id, display_name, creator_balance_usd, payout_status, stripe_connect_account_id"
    )
    .or("creator_balance_usd.gt.0,stripe_connect_account_id.not.is.null")
    .order("creator_balance_usd", { ascending: false });

  if (error) throw new Error(error.message);

  const rows: FinanceReconcileRow[] = [];

  for (const profile of profiles ?? []) {
    const ledgerUsd = roundUsd(profile.creator_balance_usd);
    let stripeAvailableUsd: number | null = null;
    let diffUsd: number | null = null;

    if (paymentsLive && profile.stripe_connect_account_id) {
      try {
        stripeAvailableUsd = await fetchConnectAvailableBalanceUsd(
          profile.stripe_connect_account_id
        );
        diffUsd = roundUsd(ledgerUsd - stripeAvailableUsd);
      } catch {
        stripeAvailableUsd = null;
        diffUsd = null;
      }
    }

    rows.push({
      creatorId: profile.id,
      displayName: profile.display_name ?? profile.id.slice(0, 8),
      ledgerUsd,
      stripeAvailableUsd,
      diffUsd,
      payoutStatus: profile.payout_status ?? "none",
      stripeConnectAccountId: profile.stripe_connect_account_id,
    });
  }

  return rows;
}

export async function listAdminTips(limit = 40): Promise<AdminTipRow[]> {
  const supabase = createServerSupabase();

  const { data: tips, error } = await supabase
    .from("game_tips")
    .select(
      "id, game_id, creator_id, payer_id, amount_usd, creator_net_usd, status, created_at, stripe_payment_intent_id"
    )
    .in("status", ["succeeded", "preview", "refunded", "failed", "pending"])
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  if (!tips || tips.length === 0) return [];

  const gameIds = [...new Set(tips.map((tip) => tip.game_id))];
  const { data: games } = await supabase
    .from("games")
    .select("id, title")
    .in("id", gameIds);

  const titleMap = new Map(
    (games ?? []).map((game) => [game.id as number, game.title as string])
  );

  const payerIds = [...new Set(tips.map((tip) => tip.payer_id))];
  const emailMap = new Map<string, string>();

  await Promise.all(
    payerIds.map(async (payerId) => {
      const { data } = await supabase.auth.admin.getUserById(payerId);
      if (data.user?.email) {
        emailMap.set(payerId, data.user.email);
      }
    })
  );

  return tips.map((tip) => ({
    id: tip.id,
    gameId: tip.game_id,
    gameTitle: titleMap.get(tip.game_id) ?? "",
    amountUsd: roundUsd(tip.amount_usd),
    creatorNetUsd: roundUsd(tip.creator_net_usd),
    status: tip.status,
    createdAt: tip.created_at,
    stripePaymentIntentId: tip.stripe_payment_intent_id,
    payerEmail: emailMap.get(tip.payer_id) ?? null,
    creatorId: tip.creator_id,
  }));
}

export async function refundAdminTip(tipId: string, adminId: string) {
  const supabase = createServerSupabase();

  const { data: tip, error: tipError } = await supabase
    .from("game_tips")
    .select("*")
    .eq("id", tipId)
    .maybeSingle();

  if (tipError) throw new Error(tipError.message);
  if (!tip) return { error: "找不到打賞紀錄", status: 404 as const };
  if (tip.status !== "succeeded") {
    return { error: "僅可退款已成功的打賞", status: 400 as const };
  }
  if (!tip.stripe_payment_intent_id) {
    return { error: "此打賞無 Stripe 付款紀錄（可能為預覽）", status: 400 as const };
  }

  const { getStripeClient, isStripeConfigured } = await import(
    "@/lib/stripe-connect"
  );

  if (!isStripeConfigured()) {
    return { error: "Stripe 未設定", status: 503 as const };
  }

  const stripe = getStripeClient();
  const refund = await stripe.refunds.create({
    payment_intent: tip.stripe_payment_intent_id,
    metadata: {
      nexusplay_tip_id: tip.id,
      nexusplay_refunded_by: adminId,
    },
  });

  const { handleTipRefund } = await import("@/lib/tip-payment-webhook");
  const paymentIntent = await stripe.paymentIntents.retrieve(
    tip.stripe_payment_intent_id,
    { expand: ["latest_charge"] }
  );
  const charge =
    typeof paymentIntent.latest_charge === "string"
      ? await stripe.charges.retrieve(paymentIntent.latest_charge)
      : paymentIntent.latest_charge;

  if (charge && typeof charge !== "string") {
    await handleTipRefund(charge);
  }

  return {
    ok: true as const,
    refundId: refund.id,
    tipId: tip.id,
  };
}
