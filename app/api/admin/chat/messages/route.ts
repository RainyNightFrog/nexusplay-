import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { listAdminChatMessages } from "@/lib/admin-chat-moderation-service";

export async function GET(request: Request) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const { searchParams } = new URL(request.url);
    const channel = searchParams.get("channel") as
      | "world"
      | "creator"
      | "all"
      | null;
    const userId = searchParams.get("userId") ?? undefined;
    const limit = Number.parseInt(searchParams.get("limit") ?? "50", 10);

    const messages = await listAdminChatMessages({
      channel: channel ?? "all",
      userId,
      limit,
    });

    return NextResponse.json({ messages });
  } catch (error) {
    const message = error instanceof Error ? error.message : "讀取聊天訊息失敗";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
