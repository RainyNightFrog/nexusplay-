import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { writeAdminLog } from "@/lib/admin-service";
import { refundAdminTip } from "@/lib/admin-finance-service";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const { id } = await params;
    if (!id?.trim()) {
      return NextResponse.json({ error: "缺少 tipId" }, { status: 400 });
    }

    const result = await refundAdminTip(id.trim(), auth.user!.id);

    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    await writeAdminLog(
      auth.supabase!,
      auth.user!.id,
      "refund_tip",
      `tip=${result.tipId} refund=${result.refundId}`
    );

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "退款失敗";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
