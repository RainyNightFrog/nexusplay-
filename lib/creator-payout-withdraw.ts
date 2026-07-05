import {
  readCreatorPayoutRow,
  syncConnectAccountStatus,
} from "@/lib/creator-payout-service";
import {
  MIN_PAYOUT_THRESHOLD_USD,
  isPayoutReady,
  normalizePayoutStatus,
  type CreatorPayoutRecord,
} from "@/lib/payout-status";
import {
  createConnectAccountPayout,
  fetchConnectAvailableBalanceUsd,
  isPaymentsLive,
  isStripeConfigured,
} from "@/lib/stripe-connect";
import { createServerSupabase } from "@/lib/supabase-server";

function roundUsd(value: number) {
  return Math.round(value * 100) / 100;
}

export async function listRecentCreatorPayouts(
  creatorId: string,
  limit = 8
): Promise<CreatorPayoutRecord[]> {
  const supabase = createServerSupabase();
  const { data, error } = await supabase
    .from("creator_payouts")
    .select("id, amount_usd, status, mode, created_at, completed_at, failure_reason")
    .eq("creator_id", creatorId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => ({
    ...row,
    amount_usd: roundUsd(Number(row.amount_usd)),
  })) as CreatorPayoutRecord[];
}

function resolveWithdrawalAmount(params: {
  ledgerBalance: number;
  stripeAvailable: number | null;
  live: boolean;
}) {
  if (params.live && params.stripeAvailable != null) {
    return roundUsd(Math.min(params.ledgerBalance, params.stripeAvailable));
  }
  return roundUsd(params.ledgerBalance);
}

export async function requestCreatorWithdrawal(userId: string) {
  const supabase = createServerSupabase();
  let row = await readCreatorPayoutRow(supabase, userId);

  if (!row) {
    return { error: "找不到創作者資料", status: 404 as const };
  }

  if (
    isStripeConfigured() &&
    row.stripe_connect_account_id &&
    row.payout_status !== "active"
  ) {
    try {
      await syncConnectAccountStatus(userId, row.stripe_connect_account_id);
      row = (await readCreatorPayoutRow(supabase, userId)) ?? row;
    } catch {
      // best effort
    }
  }

  if (!isPayoutReady(normalizePayoutStatus(row.payout_status))) {
    return { error: "請先完成 Stripe 收款設定", status: 403 as const };
  }

  const ledgerBalance = roundUsd(
    typeof row.creator_balance_usd === "number"
      ? row.creator_balance_usd
      : Number.parseFloat(String(row.creator_balance_usd ?? 0)) || 0
  );

  const live = isPaymentsLive();
  let stripeAvailable: number | null = null;

  if (live) {
    if (!row.stripe_connect_account_id) {
      return { error: "尚未連結 Stripe 帳戶", status: 403 as const };
    }
    stripeAvailable = await fetchConnectAvailableBalanceUsd(
      row.stripe_connect_account_id
    );
  }

  const amount = resolveWithdrawalAmount({
    ledgerBalance,
    stripeAvailable,
    live,
  });

  if (amount < MIN_PAYOUT_THRESHOLD_USD) {
    return {
      error: `提領金額須達 $${MIN_PAYOUT_THRESHOLD_USD} USD`,
      status: 400 as const,
    };
  }

  const { data: pending } = await supabase
    .from("creator_payouts")
    .select("id")
    .eq("creator_id", userId)
    .in("status", ["pending", "processing"])
    .limit(1);

  if (pending && pending.length > 0) {
    return { error: "已有進行中的提領，請稍後再試", status: 409 as const };
  }

  if (!live) {
    const { data: payoutRow, error: insertError } = await supabase
      .from("creator_payouts")
      .insert({
        creator_id: userId,
        amount_usd: amount,
        status: "preview_paid",
        mode: "preview",
        completed_at: new Date().toISOString(),
      })
      .select("id, amount_usd, status, mode, created_at, completed_at, failure_reason")
      .single();

    if (insertError) throw new Error(insertError.message);

    await supabase
      .from("profiles")
      .update({ creator_balance_usd: roundUsd(ledgerBalance - amount) })
      .eq("id", userId);

    return {
      payout: payoutRow as CreatorPayoutRecord,
      mode: "preview" as const,
      newBalanceUsd: roundUsd(ledgerBalance - amount),
    };
  }

  const { data: payoutRow, error: insertError } = await supabase
    .from("creator_payouts")
    .insert({
      creator_id: userId,
      amount_usd: amount,
      status: "processing",
      mode: "live",
      stripe_connect_account_id: row.stripe_connect_account_id,
    })
    .select("id")
    .single();

  if (insertError || !payoutRow) {
    throw new Error(insertError?.message ?? "建立提領紀錄失敗");
  }

  try {
    const stripePayout = await createConnectAccountPayout({
      accountId: row.stripe_connect_account_id!,
      amountUsd: amount,
      metadata: {
        nexusplay_creator_id: userId,
        nexusplay_payout_id: payoutRow.id,
      },
    });

    const completedAt = new Date().toISOString();

    await supabase
      .from("creator_payouts")
      .update({
        status: stripePayout.status === "paid" ? "paid" : "processing",
        stripe_payout_id: stripePayout.id,
        completed_at: stripePayout.status === "paid" ? completedAt : null,
      })
      .eq("id", payoutRow.id);

    await supabase
      .from("profiles")
      .update({ creator_balance_usd: roundUsd(ledgerBalance - amount) })
      .eq("id", userId);

    const { data: updated } = await supabase
      .from("creator_payouts")
      .select("id, amount_usd, status, mode, created_at, completed_at, failure_reason")
      .eq("id", payoutRow.id)
      .single();

    return {
      payout: updated as CreatorPayoutRecord,
      mode: "live" as const,
      stripePayoutId: stripePayout.id,
      newBalanceUsd: roundUsd(ledgerBalance - amount),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Stripe 提領失敗";

    await supabase
      .from("creator_payouts")
      .update({ status: "failed", failure_reason: message })
      .eq("id", payoutRow.id);

    return { error: message, status: 502 as const };
  }
}

export function computeCanWithdraw(params: {
  payoutStatus: string;
  ledgerBalance: number;
  stripeAvailable: number | null;
  paymentsLive: boolean;
}) {
  if (!isPayoutReady(normalizePayoutStatus(params.payoutStatus))) {
    return false;
  }

  const amount = resolveWithdrawalAmount({
    ledgerBalance: params.ledgerBalance,
    stripeAvailable: params.stripeAvailable,
    live: params.paymentsLive,
  });

  return amount >= MIN_PAYOUT_THRESHOLD_USD;
}
