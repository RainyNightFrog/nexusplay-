import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import {
  listAdminTips,
  reconcileCreatorFinance,
} from "@/lib/admin-finance-service";

export async function GET() {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const [reconcile, tips] = await Promise.all([
      reconcileCreatorFinance(),
      listAdminTips(40),
    ]);

    return NextResponse.json({ reconcile, tips });
  } catch (error) {
    const message = error instanceof Error ? error.message : "讀取金流資料失敗";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
