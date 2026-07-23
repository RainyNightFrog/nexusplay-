import type Stripe from "stripe";
import {
  LIFETIME_SUPPORTER_MIN_CENTS,
  LIFETIME_SUPPORTER_TIER_ID,
  parseSupporterPassTierId,
  resolveSupporterPassCheckout,
  type ResolvedSupporterPassCheckout,
} from "@/lib/supporter-pass";
import { creditSupporterPassBonusForCheckout } from "@/lib/supporter-ap-bonus";
import { grantSupporterStatus } from "@/lib/supporter-pass-service";
import {
  markOrderSucceeded,
  type OrderRow,
} from "@/lib/checkout-order-webhook";

function resolveCheckoutForBonus(
  session: Stripe.Checkout.Session,
  order: OrderRow,
  lifetime: boolean
): ResolvedSupporterPassCheckout {
  const tierId =
    session.metadata?.supporter_tier_id?.trim() ||
    (lifetime ? LIFETIME_SUPPORTER_TIER_ID : "");

  const customAmountUsd = lifetime
    ? order.total_amount_cents / 100
    : undefined;

  const resolved = resolveSupporterPassCheckout({
    tierId: tierId || LIFETIME_SUPPORTER_TIER_ID,
    customAmountUsd,
  });

  if (resolved.ok) {
    return resolved.checkout;
  }

  const tier = parseSupporterPassTierId(tierId);
  if (tier) {
    return {
      tierId: tier.id,
      priceCents: order.total_amount_cents,
      badge: tier.badge,
      interval: tier.interval,
      lifetime: false,
      bonusAp: tier.bonusAp,
    };
  }

  // 後備：無法辨識方案時不發 AP
  return {
    tierId: tierId || "unknown",
    priceCents: order.total_amount_cents,
    badge: session.metadata?.supporter_badge ?? "supporter_v1",
    interval: lifetime ? "lifetime" : "month",
    lifetime,
    bonusAp: 0,
  };
}

function resolveLifetimeFlag(
  session: Stripe.Checkout.Session,
  order: OrderRow,
  paidCents: number
) {
  const metaLifetime =
    session.metadata?.supporter_lifetime === "1" ||
    session.metadata?.supporter_tier_id === LIFETIME_SUPPORTER_TIER_ID ||
    session.metadata?.billing_interval === "lifetime";

  // 永久身分必須實際付款達最低額，避免 metadata  alone 誤授
  if (metaLifetime && paidCents >= LIFETIME_SUPPORTER_MIN_CENTS) {
    return true;
  }

  // 訂單金額達標且標記為 lifetime tier 也可（雙重保險）
  if (
    order.total_amount_cents >= LIFETIME_SUPPORTER_MIN_CENTS &&
    (session.metadata?.supporter_tier_id === LIFETIME_SUPPORTER_TIER_ID ||
      session.metadata?.supporter_lifetime === "1")
  ) {
    return true;
  }

  return false;
}

export async function finalizeSupporterPassCheckout(
  session: Stripe.Checkout.Session,
  order: OrderRow
) {
  if (order.order_type !== "supporter_pass") {
    return false;
  }

  // 未完成付款不發放（延遲付款／銀行轉帳等）
  if (session.payment_status !== "paid") {
    throw new Error(
      `支持者付款尚未完成（payment_status=${session.payment_status ?? "unknown"}）`
    );
  }

  const paidCents = session.amount_total;
  if (
    typeof paidCents !== "number" ||
    !Number.isFinite(paidCents) ||
    paidCents <= 0
  ) {
    throw new Error("支持者通行證付款金額無效");
  }

  if (paidCents !== order.total_amount_cents) {
    throw new Error("支持者通行證付款金額不符");
  }

  const lifetime = resolveLifetimeFlag(session, order, paidCents);
  if (
    (session.metadata?.supporter_lifetime === "1" ||
      session.metadata?.supporter_tier_id === LIFETIME_SUPPORTER_TIER_ID) &&
    !lifetime
  ) {
    throw new Error("永久支持金額未達最低門檻，拒絕授予");
  }

  const badge =
    session.metadata?.supporter_badge ??
    (lifetime ? "supporter_v2" : "supporter_v1");

  const updated = await markOrderSucceeded(order.id, {
    game_price_cents: order.game_price_cents,
    platform_tip_cents: 0,
    total_amount_cents: order.total_amount_cents,
  });

  if (!updated && order.status !== "succeeded") {
    throw new Error("無法更新支持者訂單狀態");
  }

  // 一律以訂單買家為準，避免 metadata 被竄改時授錯人
  const userId = order.buyer_id;

  await grantSupporterStatus({
    userId,
    badge,
    lifetime,
  });

  const checkout = resolveCheckoutForBonus(session, order, lifetime);
  try {
    await creditSupporterPassBonusForCheckout({
      userId,
      orderId: order.id,
      checkout,
    });
  } catch (error) {
    // 身分已授予；AP 發放失敗應讓 webhook 重試（冪等）
    throw error;
  }

  return true;
}
