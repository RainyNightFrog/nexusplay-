import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { listAdminOrders } from "@/lib/admin-orders-service";

export async function GET(request: Request) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") ?? "all";
    const limit = Number.parseInt(searchParams.get("limit") ?? "50", 10);

    const orders = await listAdminOrders({ status, limit });
    return NextResponse.json({ orders, status });
  } catch (error) {
    const message = error instanceof Error ? error.message : "讀取訂單列表失敗";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
