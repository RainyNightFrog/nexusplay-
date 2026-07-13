import { NextResponse } from "next/server";
import { createAuthServerClient } from "@/lib/supabase/server-auth";
import { createServerSupabase } from "@/lib/supabase-server";
import {
  isCreatorAccount,
  listCreatorSupportMessages,
  sendCreatorSupportMessage,
} from "@/lib/support-chat-service";

export async function GET() {
  try {
    const authClient = await createAuthServerClient();
    const {
      data: { user },
    } = await authClient.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "請先登入" }, { status: 401 });
    }

    const supabase = createServerSupabase();
    const isCreator = await isCreatorAccount(supabase, user.id);
    if (!isCreator) {
      return NextResponse.json({ error: "僅創作者可使用" }, { status: 403 });
    }

    const payload = await listCreatorSupportMessages(supabase, user.id);
    return NextResponse.json(payload);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "讀取對話失敗";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
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

    const supabase = createServerSupabase();
    const isCreator = await isCreatorAccount(supabase, user.id);
    if (!isCreator) {
      return NextResponse.json({ error: "僅創作者可使用" }, { status: 403 });
    }

    const message = await sendCreatorSupportMessage(supabase, user.id, content);
    return NextResponse.json({ message });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "發送失敗";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
