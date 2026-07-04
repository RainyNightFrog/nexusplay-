import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { resolveFeedback, writeAdminLog } from "@/lib/admin-service";

export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const { id } = await params;
    const feedback = await resolveFeedback(auth.supabase!, id);

    await writeAdminLog(
      auth.supabase!,
      auth.user!.id,
      "resolve_feedback",
      `反饋「${feedback.subject}」已標記為已處理`
    );

    return NextResponse.json({ feedback });
  } catch (error) {
    const message = error instanceof Error ? error.message : "更新反饋狀態失敗";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
