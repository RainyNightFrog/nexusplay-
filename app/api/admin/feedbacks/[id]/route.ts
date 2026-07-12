import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import {
  resolveFeedback,
  writeAdminLog,
  type FeedbackCategory,
} from "@/lib/admin-service";

const VALID_CATEGORIES = new Set<FeedbackCategory>([
  "general",
  "bug",
  "suggestion",
  "report",
  "billing",
  "other",
]);

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const { id } = await params;
    const body = (await request.json()) as {
      category?: FeedbackCategory;
      admin_notes?: string | null;
      admin_reply?: string | null;
    };

    const feedback = await resolveFeedback(auth.supabase!, id, {
      category:
        body.category && VALID_CATEGORIES.has(body.category)
          ? body.category
          : undefined,
      admin_notes: body.admin_notes,
      admin_reply: body.admin_reply,
    });

    await writeAdminLog(
      auth.supabase!,
      auth.user!.id,
      "resolve_feedback",
      `反饋「${feedback.subject}」已處理`
    );

    return NextResponse.json({ feedback });
  } catch (error) {
    const message = error instanceof Error ? error.message : "更新反饋狀態失敗";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
