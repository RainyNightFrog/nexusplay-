import { NextResponse } from "next/server";
import { createAuthServerClient } from "@/lib/supabase/server-auth";
import { createServerSupabase } from "@/lib/supabase-server";
import { repairStrandedBuyIns } from "@/lib/poker/economy-service";

/** 退回「已扣買入但未兌現」的籌碼 */
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
    const result = await repairStrandedBuyIns(supabase, user.id);
    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "修復失敗";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
