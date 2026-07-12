import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { adminLogsToCsv, listAdminLogs } from "@/lib/admin-service";

export async function GET(request: Request) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const { searchParams } = new URL(request.url);
    const limit = Number.parseInt(searchParams.get("limit") ?? "50", 10);
    const offset = Number.parseInt(searchParams.get("offset") ?? "0", 10);
    const action = searchParams.get("action");
    const format = searchParams.get("format");

    const logs = await listAdminLogs(auth.supabase!, {
      limit,
      offset,
      action,
    });

    if (format === "csv") {
      const csv = adminLogsToCsv(logs);
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": 'attachment; filename="admin-logs.csv"',
        },
      });
    }

    return NextResponse.json({ logs, action: action ?? "all" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "讀取操作日誌失敗";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
