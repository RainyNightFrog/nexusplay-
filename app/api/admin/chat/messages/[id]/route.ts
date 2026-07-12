import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { writeAdminLog } from "@/lib/admin-service";
import {
  deleteAdminChatMessage,
  recallAdminChatMessage,
} from "@/lib/admin-chat-moderation-service";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get("mode") ?? "delete";

    const result =
      mode === "recall"
        ? await recallAdminChatMessage(id)
        : await deleteAdminChatMessage(id);

    await writeAdminLog(
      auth.supabase!,
      auth.user!.id,
      mode === "recall" ? "recall_chat_message" : "delete_chat_message",
      `message=${id}`
    );

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "刪除聊天訊息失敗";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
