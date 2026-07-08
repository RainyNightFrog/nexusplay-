import { NextResponse } from "next/server";
import {
  listVirtualDmMessages,
  sendVirtualDmMessage,
} from "@/lib/virtual-dm-service";
import { createAuthServerClient } from "@/lib/supabase/server-auth";
import { createServerSupabase } from "@/lib/supabase-server";

type RouteContext = {
  params: Promise<{ playerId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { playerId } = await context.params;
    const authClient = await createAuthServerClient();
    const {
      data: { user },
    } = await authClient.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "請先登入" }, { status: 401 });
    }

    const messages = await listVirtualDmMessages(
      createServerSupabase(),
      user.id,
      playerId
    );

    return NextResponse.json({ messages });
  } catch (error) {
    const message = error instanceof Error ? error.message : "讀取私訊失敗";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { playerId } = await context.params;
    const authClient = await createAuthServerClient();
    const {
      data: { user },
    } = await authClient.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "請先登入" }, { status: 401 });
    }

    const body = (await request.json()) as { content?: string };
    const messages = await sendVirtualDmMessage(
      createServerSupabase(),
      user.id,
      playerId,
      body.content ?? ""
    );

    return NextResponse.json({ messages });
  } catch (error) {
    const message = error instanceof Error ? error.message : "發送私訊失敗";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
