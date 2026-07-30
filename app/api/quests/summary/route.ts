import { NextResponse } from "next/server";
import { getQuestsClaimableCount } from "@/lib/quests-service";
import { createAuthServerClient } from "@/lib/supabase/server-auth";
import { createServerSupabase } from "@/lib/supabase-server";

export async function GET() {
  try {
    const authClient = await createAuthServerClient();
    const {
      data: { user },
    } = await authClient.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "請先登入" }, { status: 401 });
    }

    const claimableCount = await getQuestsClaimableCount(
      user.id,
      createServerSupabase()
    );
    return NextResponse.json({ claimableCount });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "讀取每日任務失敗";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
