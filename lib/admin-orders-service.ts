import { revokeGameEntitlement } from "@/lib/game-entitlement-service";
import { revokeSupporterStatus } from "@/lib/supporter-pass-service";
import { createServerSupabase } from "@/lib/supabase-server";

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
  const buyerIds = [...new Set((orders ?? []).map((order) => order.buyer_id as string))];

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

  const { getStripeClient, isStripeConfigured } = await import(
    "@/lib/stripe-connect"
  );

  if (!isStripeConfigured()) {
    return { error: "Stripe 未設定", status: 503 as const };
  }

  const stripe = getStripeClient();
  const session = await stripe.checkout.sessions.retrieve(
    order.stripe_session_id as string,
    { expand: ["payment_intent"] }
  );

  const paymentIntent =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id;

  if (!paymentIntent) {
    return { error: "找不到 Stripe PaymentIntent", status: 400 as const };
  }

  const refund = await stripe.refunds.create({
    payment_intent: paymentIntent,
    metadata: {
      nexusplay_order_id: order.id as string,
      nexusplay_refunded_by: adminId,
    },
  });

  await supabase
    .from("orders")
    .update({ status: "refunded" })
    .eq("id", orderId);

  if (order.order_type === "supporter_pass") {
    await revokeSupporterStatus(order.buyer_id as string);
  }

  if (order.order_type === "game_purchase" && order.game_id) {
    await revokeGameEntitlement({
      userId: order.buyer_id as string,
      gameId: order.game_id as number,
    });
  }

  return {
    ok: true as const,
    refundId: refund.id,
    orderId: order.id as string,
  };
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
