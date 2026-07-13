import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { createServerSupabase } from "@/lib/supabase-server";
import { updateAdminSupportThread } from "@/lib/support-chat-service";
import type { SupportThreadStatus } from "@/lib/support-chat";

const VALID: SupportThreadStatus[] = ["open", "resolved", "closed"];

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  try {
    const { id } = await context.params;
    const body = (await request.json()) as { status?: SupportThreadStatus };
    const status = body.status;

    if (!status || !VALID.includes(status)) {
      return NextResponse.json({ error: "無效的狀態" }, { status: 400 });
    }

    await updateAdminSupportThread(createServerSupabase(), id, { status });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "更新對話失敗";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
