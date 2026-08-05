import { NextResponse } from "next/server";
import { createAuthServerClient } from "@/lib/supabase/server-auth";
import { createServerSupabase } from "@/lib/supabase-server";
import { claimDailyCheckin } from "@/lib/poker/economy-service";

export async function POST() {
  try {
    const authClient = await createAuthServerClient();
    const {
      data: { user },
    } = await authClient.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "請先登入" }, { status: 401 });
    }

    const supabase = createServerSupabase();
    const result = await claimDailyCheckin(supabase, user.id);
    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "簽到失敗";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
