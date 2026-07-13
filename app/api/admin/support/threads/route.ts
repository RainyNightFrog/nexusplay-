import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { createServerSupabase } from "@/lib/supabase-server";
import { listAdminSupportThreads } from "@/lib/support-chat-service";

export async function GET() {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  try {
    const threads = await listAdminSupportThreads(createServerSupabase());
    const unreadCount = threads.filter((thread) => thread.unread_by_admin).length;
    return NextResponse.json({ threads, unreadCount });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "讀取支援收件匣失敗";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
