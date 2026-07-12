import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import {
  getStripeWebhookStats,
  listAdminStripeWebhookEvents,
} from "@/lib/admin-stripe-service";

export async function GET(request: Request) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") ?? "all";
    const limit = Number.parseInt(searchParams.get("limit") ?? "50", 10);

    const [events, stats] = await Promise.all([
      listAdminStripeWebhookEvents({ status, limit }),
      getStripeWebhookStats(),
    ]);

    return NextResponse.json({ events, stats, status });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "讀取 Stripe Webhook 失敗";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
