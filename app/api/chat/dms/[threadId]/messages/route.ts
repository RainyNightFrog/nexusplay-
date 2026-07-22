import { NextResponse } from "next/server";
import { createAuthServerClient } from "@/lib/supabase/server-auth";
import { createServerSupabase } from "@/lib/supabase-server";
import {
  listPlayerDmMessages,
  sendPlayerDmMessage,
} from "@/lib/player-dm-service";

type RouteContext = {
  params: Promise<{ threadId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const authClient = await createAuthServerClient();
    const {
      data: { user },
    } = await authClient.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "請先登入" }, { status: 401 });
    }

    const { threadId } = await context.params;
    const payload = await listPlayerDmMessages(
      createServerSupabase(),
      user.id,
      threadId
    );
    return NextResponse.json(payload);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "讀取私訊失敗";
    const status = message.includes("找不到") ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const authClient = await createAuthServerClient();
    const {
      data: { user },
    } = await authClient.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "請先登入" }, { status: 401 });
    }

    const body = (await request.json()) as { content?: string };
    const content = body.content?.trim() ?? "";
    if (!content) {
      return NextResponse.json({ error: "訊息不可為空" }, { status: 400 });
    }

    const { threadId } = await context.params;
    const message = await sendPlayerDmMessage(
      createServerSupabase(),
      user.id,
      threadId,
      content
    );
    return NextResponse.json({ message });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "發送失敗";
    const status =
      message.includes("無法") ||
      message.includes("不能") ||
      message.includes("找不到") ||
      message.includes("長度") ||
      message.includes("停權") ||
      message.includes("禁言")
        ? 400
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
