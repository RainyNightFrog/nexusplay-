import { NextResponse } from "next/server";
import { createAuthServerClient } from "@/lib/supabase/server-auth";
import { createServerSupabase } from "@/lib/supabase-server";
import {
  getOrCreatePlayerDmThread,
  listPlayerDmContacts,
} from "@/lib/player-dm-service";

export async function GET() {
  try {
    const authClient = await createAuthServerClient();
    const {
      data: { user },
    } = await authClient.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "請先登入" }, { status: 401 });
    }

    const contacts = await listPlayerDmContacts(
      createServerSupabase(),
      user.id
    );
    return NextResponse.json({ contacts });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "讀取私訊通訊錄失敗";
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

    const body = (await request.json()) as { peerUserId?: string };
    const peerUserId = body.peerUserId?.trim() ?? "";
    if (!peerUserId) {
      return NextResponse.json({ error: "缺少對方玩家" }, { status: 400 });
    }

    const thread = await getOrCreatePlayerDmThread(
      createServerSupabase(),
      user.id,
      peerUserId
    );
    return NextResponse.json({ thread });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "無法開始私訊";
    const status =
      message.includes("無法") ||
      message.includes("不能") ||
      message.includes("找不到") ||
      message.includes("無效") ||
      message.includes("停權") ||
      message.includes("禁言")
        ? 400
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
