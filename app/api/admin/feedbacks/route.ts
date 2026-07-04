import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { listAdminFeedbacks } from "@/lib/admin-service";
import type { FeedbackStatus } from "@/lib/admin-service";

const VALID_STATUSES = new Set<FeedbackStatus | "all">([
  "unread",
  "resolved",
  "all",
]);

export async function GET(request: Request) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const { searchParams } = new URL(request.url);
    const statusParam = searchParams.get("status") ?? "all";
    const status = VALID_STATUSES.has(statusParam as FeedbackStatus | "all")
      ? (statusParam as FeedbackStatus | "all")
      : "all";

    const feedbacks = await listAdminFeedbacks(auth.supabase!, status);
    return NextResponse.json({ feedbacks, status });
  } catch (error) {
    const message = error instanceof Error ? error.message : "讀取反饋列表失敗";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
