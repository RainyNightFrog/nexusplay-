import { NextResponse } from "next/server";
import { CHAT_LIMITS, isValidChatChannel } from "@/lib/chat";
import { createChatMessage, listChatMessages } from "@/lib/chat-service";
import { sanitizePlainText } from "@/lib/sanitize-plain";
import { createAuthServerClient } from "@/lib/supabase/server-auth";

export async function GET(request: Request) {
  try {
    const authClient = await createAuthServerClient();
    const {
      data: { user },
    } = await authClient.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "請先登入" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const channel = searchParams.get("channel") ?? "world";
    const before = searchParams.get("before") ?? undefined;

    if (!isValidChatChannel(channel)) {
      return NextResponse.json({ error: "無效的聊天頻道" }, { status: 400 });
    }

    const messages = await listChatMessages(channel, user.id, { before });
    return NextResponse.json({ messages });
  } catch (error) {
    const message = error instanceof Error ? error.message : "讀取聊天記錄失敗";
    return NextResponse.json({ error: message, messages: [] }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const authClient = await createAuthServerClient();
    const {
      data: { user },
    } = await authClient.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "請先登入才能聊天" }, { status: 401 });
    }

    const body = (await request.json()) as {
      channel?: string;
      content?: string;
    };

    const channel = body.channel ?? "world";
    if (!isValidChatChannel(channel)) {
      return NextResponse.json({ error: "無效的聊天頻道" }, { status: 400 });
    }

    const content = sanitizePlainText(body.content ?? "", CHAT_LIMITS.content);
    if (!content) {
      return NextResponse.json({ error: "請輸入訊息內容" }, { status: 400 });
    }

    const message = await createChatMessage(
      { channel, userId: user.id, content },
      authClient
    );

    return NextResponse.json({ message }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "發送訊息失敗";
    const status = message.includes("過快") || message.includes("頻繁") || message.includes("重複")
      ? 429
      : message.includes("創作者")
        ? 403
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
