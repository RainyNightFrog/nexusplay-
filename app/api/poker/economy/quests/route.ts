import { NextResponse } from "next/server";
import { createAuthServerClient } from "@/lib/supabase/server-auth";
import { createServerSupabase } from "@/lib/supabase-server";
import {
  listQuestProgress,
  claimQuestReward,
} from "@/lib/poker/economy-service";

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
    const quests = await listQuestProgress(supabase, user.id);
    return NextResponse.json({ quests });
  } catch (e) {
    const message = e instanceof Error ? e.message : "讀取任務失敗";
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

    const body = (await request.json()) as { questId?: string };
    if (!body.questId?.trim()) {
      return NextResponse.json({ error: "請提供任務 ID" }, { status: 400 });
    }

    const supabase = createServerSupabase();
    const result = await claimQuestReward(
      supabase,
      user.id,
      body.questId.trim(),
    );
    const quests = await listQuestProgress(supabase, user.id);
    return NextResponse.json({ ...result, quests });
  } catch (e) {
    const message = e instanceof Error ? e.message : "領取失敗";
    const status =
      message.includes("尚未") ||
      message.includes("找不到") ||
      message.includes("已領取")
        ? 400
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
