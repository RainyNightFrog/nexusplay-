import { NextResponse } from "next/server";
import { createAuthServerClient } from "@/lib/supabase/server-auth";
import { createServerSupabase } from "@/lib/supabase-server";
import { claimBankruptcyRebuy } from "@/lib/poker/economy-service";

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
    const result = await claimBankruptcyRebuy(supabase, user.id);
    const status = result.granted ? 200 : 400;
    return NextResponse.json(result, { status });
  } catch (e) {
    const message = e instanceof Error ? e.message : "破產保護失敗";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
