import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { createServerSupabase } from "@/lib/supabase-server";
import {
  listAdminSupportMessages,
  sendAdminSupportMessage,
} from "@/lib/support-chat-service";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  try {
    const { id } = await context.params;
    const messages = await listAdminSupportMessages(
      createServerSupabase(),
      id,
      auth.user!.id
    );
    return NextResponse.json({ messages });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "讀取訊息失敗";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  try {
    const { id } = await context.params;
    const body = (await request.json()) as { content?: string };
    const content = body.content?.trim() ?? "";
    if (!content) {
      return NextResponse.json({ error: "訊息不可為空" }, { status: 400 });
    }

    const message = await sendAdminSupportMessage(
      createServerSupabase(),
      id,
      auth.user!.id,
      content
    );
    return NextResponse.json({ message });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "發送失敗";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
