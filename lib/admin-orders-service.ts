import { revokeGameEntitlement } from "@/lib/game-entitlement-service";
import { revokeSupporterStatus } from "@/lib/supporter-pass-service";
import { createServerSupabase } from "@/lib/supabase-server";
import type Stripe from "stripe";

export type AdminOrderRecord = {
  id: string;
  buyerId: string;
  buyerEmail: string | null;
  buyerName: string;
  gameId: number | null;
  gameTitle: string | null;
  orderType: string;
  status: string;
  totalAmountCents: number;
  stripeSessionId: string | null;
  createdAt: string;
};

export async function listAdminOrders(params: {
  status?: string;
  limit?: number;
}): Promise<AdminOrderRecord[]> {
  const supabase = createServerSupabase();
  const limit = Math.min(Math.max(params.limit ?? 50, 1), 100);

  let query = supabase
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (params.status && params.status !== "all") {
    query = query.eq("status", params.status);
  }

  const { data: orders, error } = await query;
  if (error) throw new Error(error.message);

  const gameIds = [
    ...new Set(
      (orders ?? [])
        .map((order) => order.game_id as number | null)
        .filter(Boolean) as number[]
    ),
  ];
  const buyerIds = [
    ...new Set((orders ?? []).map((order) => order.buyer_id as string)),
  ];

  const [{ data: games }, { data: profiles }] = await Promise.all([
    gameIds.length
      ? supabase.from("games").select("id, title").in("id", gameIds)
      : Promise.resolve({ data: [] }),
    buyerIds.length
      ? supabase.from("profiles").select("id, display_name").in("id", buyerIds)
      : Promise.resolve({ data: [] }),
  ]);

  const gameMap = new Map(
    (games ?? []).map((game) => [game.id as number, game.title as string])
  );
  const profileMap = new Map(
    (profiles ?? []).map((profile) => [
      profile.id as string,
      (profile.display_name as string) ?? "",
    ])
  );

  const rows: AdminOrderRecord[] = [];
  for (const order of orders ?? []) {
    const { data: authUser } = await supabase.auth.admin.getUserById(
      order.buyer_id as string
    );
    rows.push({
      id: order.id as string,
      buyerId: order.buyer_id as string,
      buyerEmail: authUser.user?.email ?? null,
      buyerName:
        profileMap.get(order.buyer_id as string) ??
        (order.buyer_id as string).slice(0, 8),
      gameId: (order.game_id as number | null) ?? null,
      gameTitle: order.game_id
        ? (gameMap.get(order.game_id as number) ?? null)
        : null,
      orderType: order.order_type as string,
      status: order.status as string,
      totalAmountCents: order.total_amount_cents as number,
      stripeSessionId: (order.stripe_session_id as string | null) ?? null,
      createdAt: order.created_at as string,
    });
  }

  return rows;
}

function isAlreadyRefundedError(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const err = error as { code?: string; message?: string };
  return (
    err.code === "charge_already_refunded" ||
    Boolean(err.message?.toLowerCase().includes("already been refunded"))
  );
}

async function cancelSupporterSubscriptionIfAny(
  stripe: Stripe,
  session: Stripe.Checkout.Session
) {
  const subscriptionId =
    typeof session.subscription === "string"
      ? session.subscription
      : session.subscription?.id;

  if (!subscriptionId) return { cancelled: false as const };

  try {
    await stripe.subscriptions.cancel(subscriptionId);
    return { cancelled: true as const, subscriptionId };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    // 已取消／不存在可視為成功
    if (
      message.includes("No such subscription") ||
      message.includes("canceled") ||
      message.includes("cancelled")
    ) {
      return { cancelled: true as const, subscriptionId };
    }
    throw error;
  }
}

export async function refundAdminOrder(orderId: string, adminId: string) {
  const supabase = createServerSupabase();
  const { data: order, error } = await supabase
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!order) return { error: "找不到訂單", status: 404 as const };
  if (order.status !== "succeeded") {
    return { error: "僅可退款已成功的訂單", status: 400 as const };
  }
  if (!order.stripe_session_id) {
    return { error: "此訂單無 Stripe 紀錄（可能為預覽）", status: 400 as const };
  }

  // CAS：先搶鎖標記退款，避免並發雙重退款
  const { data: claimed, error: claimError } = await supabase
    .from("orders")
    .update({ status: "refunded" })
    .eq("id", orderId)
    .eq("status", "succeeded")
    .select("id")
    .maybeSingle();

  if (claimError) throw new Error(claimError.message);
  if (!claimed) {
    return { error: "訂單狀態已變更，請重新整理", status: 409 as const };
  }

  const { getStripeClient, isStripeConfigured } = await import(
    "@/lib/stripe-connect"
  );

  if (!isStripeConfigured()) {
    await supabase
      .from("orders")
      .update({ status: "succeeded" })
      .eq("id", orderId)
      .eq("status", "refunded");
    return { error: "Stripe 未設定", status: 503 as const };
  }

  const stripe = getStripeClient();

  try {
    const session = await stripe.checkout.sessions.retrieve(
      order.stripe_session_id as string,
      { expand: ["payment_intent", "subscription"] }
    );

    const paymentIntent =
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : session.payment_intent?.id;

    if (!paymentIntent) {
      await supabase
        .from("orders")
        .update({ status: "succeeded" })
        .eq("id", orderId)
        .eq("status", "refunded");
      return { error: "找不到 Stripe PaymentIntent", status: 400 as const };
    }

    let refundId: string | null = null;
    try {
      const refund = await stripe.refunds.create({
        payment_intent: paymentIntent,
        metadata: {
          nexusplay_order_id: order.id as string,
          nexusplay_refunded_by: adminId,
        },
      });
      refundId = refund.id;
    } catch (refundError) {
      if (!isAlreadyRefundedError(refundError)) {
        throw refundError;
      }
    }

    let subscriptionCancelled = false;
    if (order.order_type === "supporter_pass") {
      const cancelResult = await cancelSupporterSubscriptionIfAny(
        stripe,
        session
      );
      subscriptionCancelled = cancelResult.cancelled;
      await revokeSupporterStatus(order.buyer_id as string, { force: true });
    }

    if (order.order_type === "game_purchase" && order.game_id) {
      await revokeGameEntitlement({
        userId: order.buyer_id as string,
        gameId: order.game_id as number,
      });
    }

    return {
      ok: true as const,
      refundId,
      orderId: order.id as string,
      subscriptionCancelled,
    };
  } catch (error) {
    // Stripe 退款失敗：還原訂單狀態，避免「已標退款但沒退到錢」
    await supabase
      .from("orders")
      .update({ status: "succeeded" })
      .eq("id", orderId)
      .eq("status", "refunded");
    throw error;
  }
}

export async function grantManualEntitlement(params: {
  userId: string;
  gameId: number;
}) {
  const { grantManualGameEntitlement } = await import(
    "@/lib/game-entitlement-service"
  );
  await grantManualGameEntitlement(params);
  return params;
}

export async function revokeManualEntitlement(params: {
  userId: string;
  gameId: number;
}) {
  await revokeGameEntitlement(params);
  return params;
}
