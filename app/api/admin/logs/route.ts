import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { listAdminLogs } from "@/lib/admin-service";

export async function GET(request: Request) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const { searchParams } = new URL(request.url);
    const limit = Math.min(
      Math.max(Number.parseInt(searchParams.get("limit") ?? "50", 10) || 50, 1),
      200
    );

    const logs = await listAdminLogs(auth.supabase!, limit);
    return NextResponse.json({ logs });
  } catch (error) {
    const message = error instanceof Error ? error.message : "讀取操作日誌失敗";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
