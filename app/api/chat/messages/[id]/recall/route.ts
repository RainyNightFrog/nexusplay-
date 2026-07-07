import { NextResponse } from "next/server";
import { recallChatMessage } from "@/lib/chat-service";
import { createAuthServerClient } from "@/lib/supabase/server-auth";

export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const authClient = await createAuthServerClient();
    const {
      data: { user },
    } = await authClient.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "請先登入" }, { status: 401 });
    }

    const message = await recallChatMessage(id, user.id, authClient);
    return NextResponse.json({ message });
  } catch (error) {
    const message = error instanceof Error ? error.message : "回收訊息失敗";
    const status =
      message.includes("不存在") ? 404 : message.includes("只能") || message.includes("已回收") || message.includes("超過") ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
