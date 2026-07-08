import type { SupabaseClient } from "@supabase/supabase-js";
import type Stripe from "stripe";
import {
  estimateCreatorNetFromTip,
  resolveEffectivePlatformFeePercent,
} from "@/lib/tip-fee-policy";
import {
  buildTipReceipt,
  loadPayerBillingSnapshot,
  loadTipReceiptForPayer,
  type TipReceipt,
} from "@/lib/tip-receipt";
import { sendTipReceiptEmailSafe } from "@/lib/tip-receipt-email";
import { notifyCreatorOfTip } from "@/lib/creator-tip-notify";
import { recordTipDonationAndCheckBigTipper } from "@/lib/achievement-unlock-service";
import { verifyCustomerPaymentMethod } from "@/lib/stripe-customer-service";
import {
  createStripeCustomer,
  getStripeClient,
  isPaymentsLive,
  isStripeConfigured,
} from "@/lib/stripe-connect";
import { createServerSupabase } from "@/lib/supabase-server";
import type { GameRecord } from "@/lib/supabase";
import { MIN_TIP_USD, MAX_TIP_USD } from "@/lib/tip-limits";

export type { TipReceipt };

export { MIN_TIP_USD, MAX_TIP_USD };

export type TipCheckoutContext = {
  game: GameRecord;
  creatorProfile: {
    stripe_connect_account_id: string | null;
    payout_status: string;
    stripe_customer_id: string | null;
    display_name: string;
  };
  platformFeePercent: number;
  breakdown: ReturnType<typeof estimateCreatorNetFromTip>;
};

export function parseTipAmount(value: unknown): number | null {
  const amount =
    typeof value === "number"
      ? value
      : Number.parseFloat(String(value ?? "").trim());

  if (!Number.isFinite(amount)) return null;
  if (amount < MIN_TIP_USD || amount > MAX_TIP_USD) return null;

  return Math.round(amount * 100) / 100;
}

export async function loadTipCheckoutContext(
  supabase: SupabaseClient,
  gameId: number
): Promise<TipCheckoutContext | { error: string; status: number }> {
  const { data: game, error: gameError } = await supabase
    .from("games")
    .select("*")
    .eq("id", gameId)
    .maybeSingle();

  if (gameError) {
    throw new Error(gameError.message);
  }

  if (!game) {
    return { error: "找不到此遊戲", status: 404 };
  }

  if (!game.tips_enabled) {
    return { error: "此遊戲未開啟打賞", status: 400 };
  }

  if (!game.creator_id) {
    return { error: "創作者資訊不完整", status: 400 };
  }

  const { data: creatorProfile, error: profileError } = await supabase
    .from("profiles")
    .select(
      "stripe_connect_account_id, payout_status, stripe_customer_id, display_name"
    )
    .eq("id", game.creator_id)
    .maybeSingle();

  if (profileError) {
    throw new Error(profileError.message);
  }

  if (!creatorProfile) {
    return { error: "找不到創作者資料", status: 400 };
  }

  const platformFeePercent = resolveEffectivePlatformFeePercent(
    game.platform_fee_percent
  );

  return {
    game: game as GameRecord,
    creatorProfile,
    platformFeePercent,
    breakdown: estimateCreatorNetFromTip(0, platformFeePercent),
  };
}

export function buildTipBreakdown(amountUsd: number, platformFeePercent: number) {
  return estimateCreatorNetFromTip(amountUsd, platformFeePercent);
}

export async function ensurePayerStripeCustomer(params: {
  supabase: SupabaseClient;
  userId: string;
  email: string;
  displayName: string;
  existingCustomerId: string | null;
}) {
  if (params.existingCustomerId) {
    return params.existingCustomerId;
  }

  const customer = await createStripeCustomer({
    userId: params.userId,
    email: params.email,
    displayName: params.displayName,
  });

  await params.supabase
    .from("profiles")
    .update({ stripe_customer_id: customer.id })
    .eq("id", params.userId);

  return customer.id;
}

function buildStripeCustomerAddress(
  snapshot: Awaited<ReturnType<typeof loadPayerBillingSnapshot>>
): Stripe.CustomerUpdateParams["address"] | undefined {
  if (!snapshot?.billing_line1) return undefined;

  return {
    line1: snapshot.billing_line1,
    line2: snapshot.billing_line2 ?? undefined,
    city: snapshot.billing_city ?? undefined,
    state: snapshot.billing_region ?? undefined,
    postal_code: snapshot.billing_postal ?? undefined,
    country: snapshot.billing_country ?? undefined,
  };
}

export async function createTipPaymentIntent(params: {
  gameId: number;
  payerId: string;
  payerEmail: string;
  payerDisplayName: string;
  amountUsd: number;
  paymentMethodId?: string | null;
  publicAnonymous?: boolean;
}) {
  if (!isPaymentsLive()) {
    return { mode: "preview" as const };
  }

  const supabase = createServerSupabase();
  const context = await loadTipCheckoutContext(supabase, params.gameId);

  if ("error" in context) {
    return { error: context.error, status: context.status };
  }

  const { game, creatorProfile, platformFeePercent } = context;

  if (params.payerId === game.creator_id) {
    return { error: "不能打賞自己的遊戲", status: 403 };
  }

  if (creatorProfile.payout_status !== "active") {
    return {
      error: "創作者尚未完成收款設定，暫無法打賞",
      status: 503,
    };
  }

  if (!creatorProfile.stripe_connect_account_id) {
    return { error: "創作者尚未連結 Stripe", status: 503 };
  }

  const breakdown = buildTipBreakdown(params.amountUsd, platformFeePercent);
  const amountCents = Math.round(params.amountUsd * 100);
  const applicationFeeCents = Math.round(breakdown.platformFee * 100);

  const payerProfile = await supabase
    .from("profiles")
    .select("stripe_customer_id, display_name")
    .eq("id", params.payerId)
    .maybeSingle();

  const billingSnapshot = await loadPayerBillingSnapshot(supabase, params.payerId);

  const customerId = await ensurePayerStripeCustomer({
    supabase,
    userId: params.payerId,
    email: params.payerEmail,
    displayName: params.payerDisplayName,
    existingCustomerId: payerProfile.data?.stripe_customer_id ?? null,
  });

  const stripe = getStripeClient();
  const customerAddress = buildStripeCustomerAddress(billingSnapshot);

  if (customerAddress) {
    await stripe.customers.update(customerId, {
      name: billingSnapshot?.billing_name ?? params.payerDisplayName,
      address: customerAddress,
    });
  }

  let paymentMethodId: string | undefined;
  if (params.paymentMethodId?.trim()) {
    const verified = await verifyCustomerPaymentMethod({
      userId: params.payerId,
      paymentMethodId: params.paymentMethodId.trim(),
    });
    if ("error" in verified) {
      return { error: verified.error, status: verified.status };
    }
    paymentMethodId = params.paymentMethodId.trim();
  }

  const paymentIntent = await stripe.paymentIntents.create({
    amount: amountCents,
    currency: "usd",
    customer: customerId,
    receipt_email: params.payerEmail,
    application_fee_amount: applicationFeeCents,
    transfer_data: {
      destination: creatorProfile.stripe_connect_account_id,
    },
    metadata: {
      nexusplay_game_id: String(game.id),
      nexusplay_creator_id: game.creator_id!,
      nexusplay_payer_id: params.payerId,
      platform_fee_percent: String(platformFeePercent),
    },
    ...(paymentMethodId
      ? { payment_method: paymentMethodId }
      : { automatic_payment_methods: { enabled: true } }),
  });

  const { data: tipRow, error: insertError } = await supabase
    .from("game_tips")
    .insert({
      game_id: game.id,
      creator_id: game.creator_id,
      payer_id: params.payerId,
      amount_usd: params.amountUsd,
      platform_fee_usd: breakdown.platformFee,
      creator_net_usd: breakdown.net,
      platform_fee_percent: platformFeePercent,
      stripe_payment_intent_id: paymentIntent.id,
      status: "pending",
      billing_snapshot: billingSnapshot,
      public_anonymous: params.publicAnonymous === true,
    })
    .select("id, game_id, amount_usd, creator_net_usd, platform_fee_usd, status, created_at, billing_snapshot")
    .single();

  if (insertError) {
    throw new Error(insertError.message);
  }

  return {
    mode: "live" as const,
    clientSecret: paymentIntent.client_secret,
    tipId: tipRow.id,
    breakdown,
    publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "",
    receipt: buildTipReceipt({ tip: tipRow, gameTitle: game.title }),
    paymentMethodId: paymentMethodId ?? null,
  };
}

export async function recordPreviewTip(params: {
  gameId: number;
  payerId: string;
  amountUsd: number;
  publicAnonymous?: boolean;
}) {
  const supabase = createServerSupabase();
  const context = await loadTipCheckoutContext(supabase, params.gameId);

  if ("error" in context) {
    return { error: context.error, status: context.status };
  }

  const { game, platformFeePercent } = context;

  if (params.payerId === game.creator_id) {
    return { error: "不能打賞自己的遊戲", status: 403 };
  }

  const breakdown = buildTipBreakdown(params.amountUsd, platformFeePercent);
  const billingSnapshot = await loadPayerBillingSnapshot(supabase, params.payerId);

  const { data, error } = await supabase
    .from("game_tips")
    .insert({
      game_id: game.id,
      creator_id: game.creator_id,
      payer_id: params.payerId,
      amount_usd: params.amountUsd,
      platform_fee_usd: breakdown.platformFee,
      creator_net_usd: breakdown.net,
      platform_fee_percent: platformFeePercent,
      status: "preview",
      billing_snapshot: billingSnapshot,
      public_anonymous: params.publicAnonymous === true,
    })
    .select("id, game_id, amount_usd, creator_net_usd, platform_fee_usd, status, created_at, billing_snapshot")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return {
    mode: "preview" as const,
    tipId: data.id,
    breakdown,
    receipt: buildTipReceipt({ tip: data, gameTitle: game.title }),
  };
}

export { loadTipReceiptForPayer };

function resolveTransferDestination(
  paymentIntent: Stripe.PaymentIntent
): string | null {
  const destination = paymentIntent.transfer_data?.destination;
  if (!destination) return null;
  return typeof destination === "string" ? destination : destination.id;
}

async function validateTipPaymentIntent(
  paymentIntent: Stripe.PaymentIntent,
  tip: {
    amount_usd: number | string;
    payer_id: string;
    creator_id: string;
  },
  creatorConnectAccountId: string | null
) {
  const expectedCents = Math.round(Number(tip.amount_usd) * 100);
  if (paymentIntent.amount !== expectedCents) {
    return false;
  }
  if (paymentIntent.metadata?.nexusplay_payer_id !== tip.payer_id) {
    return false;
  }
  if (paymentIntent.metadata?.nexusplay_creator_id !== tip.creator_id) {
    return false;
  }
  if (
    creatorConnectAccountId &&
    resolveTransferDestination(paymentIntent) !== creatorConnectAccountId
  ) {
    return false;
  }
  return true;
}

export async function finalizeTipPayment(
  paymentIntentId: string,
  options?: { expectedPayerId?: string }
) {
  if (!isStripeConfigured()) {
    return { ok: false, reason: "stripe_not_configured" as const };
  }

  const stripe = getStripeClient();
  const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

  if (paymentIntent.status !== "succeeded") {
    return { ok: false, reason: "not_succeeded" as const };
  }

  const supabase = createServerSupabase();

  const { data: tip, error: tipError } = await supabase
    .from("game_tips")
    .select("*")
    .eq("stripe_payment_intent_id", paymentIntentId)
    .maybeSingle();

  if (tipError) {
    throw new Error(tipError.message);
  }

  if (!tip) {
    return { ok: false, reason: "tip_not_found" as const };
  }

  if (tip.status === "succeeded") {
    const receipt = await loadTipReceiptForPayer(
      supabase,
      tip.id,
      tip.payer_id
    );
    return { ok: true, alreadyProcessed: true, tipId: tip.id, receipt };
  }

  if (
    options?.expectedPayerId &&
    options.expectedPayerId !== tip.payer_id
  ) {
    return { ok: false, reason: "forbidden" as const };
  }

  const { data: creatorProfile } = await supabase
    .from("profiles")
    .select("stripe_connect_account_id, creator_balance_usd")
    .eq("id", tip.creator_id)
    .maybeSingle();

  const valid = await validateTipPaymentIntent(
    paymentIntent,
    tip,
    creatorProfile?.stripe_connect_account_id ?? null
  );
  if (!valid) {
    console.error("[tip] payment intent validation failed", paymentIntentId);
    return { ok: false, reason: "validation_failed" as const };
  }

  const { data: claimed, error: claimError } = await supabase
    .from("game_tips")
    .update({ status: "succeeded" })
    .eq("id", tip.id)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();

  if (claimError) {
    throw new Error(claimError.message);
  }

  if (!claimed) {
    const { data: current } = await supabase
      .from("game_tips")
      .select("status")
      .eq("id", tip.id)
      .maybeSingle();

    if (current?.status === "succeeded") {
      const receipt = await loadTipReceiptForPayer(
        supabase,
        tip.id,
        tip.payer_id
      );
      return { ok: true, alreadyProcessed: true, tipId: tip.id, receipt };
    }

    return { ok: false, reason: "claim_failed" as const };
  }

  const currentBalance =
    typeof creatorProfile?.creator_balance_usd === "number"
      ? creatorProfile.creator_balance_usd
      : Number.parseFloat(String(creatorProfile?.creator_balance_usd ?? 0)) ||
        0;

  const newBalance =
    Math.round((currentBalance + Number(tip.creator_net_usd)) * 100) / 100;

  await supabase
    .from("profiles")
    .update({ creator_balance_usd: newBalance })
    .eq("id", tip.creator_id);

  const receipt = await loadTipReceiptForPayer(supabase, tip.id, tip.payer_id);

  if (receipt) {
    void sendTipReceiptEmailSafe({ payerId: tip.payer_id, receipt });
  }

  const { data: gameRow } = await supabase
    .from("games")
    .select("title")
    .eq("id", tip.game_id)
    .maybeSingle();

  void notifyCreatorOfTip({
    creatorId: tip.creator_id as string,
    gameTitle: gameRow?.title ?? "",
    amountUsd: Number(tip.amount_usd),
    creatorNetUsd: Number(tip.creator_net_usd),
  });

  if (tip.payer_id) {
    try {
      await recordTipDonationAndCheckBigTipper(
        supabase,
        tip.payer_id as string,
        Number(tip.amount_usd)
      );
    } catch (error) {
      console.error("[achievements] big_tipper check failed:", error);
    }
  }

  return {
    ok: true,
    tipId: tip.id,
    creatorNetUsd: tip.creator_net_usd,
    receipt,
  };
}

export function getTipPaymentsState() {
  return {
    stripeConfigured: isStripeConfigured(),
    paymentsLive: isPaymentsLive(),
    publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? null,
  };
}
