import { NextResponse } from "next/server";
import { createAuthServerClient } from "@/lib/supabase/server-auth";
import { createServerSupabase } from "@/lib/supabase-server";
import { claimPlaytimeTick } from "@/lib/poker/economy-service";

type Body = { handsInWindow?: number };

export async function POST(request: Request) {
  try {
    const authClient = await createAuthServerClient();
    const {
      data: { user },
    } = await authClient.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "請先登入" }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as Body;
    const handsInWindow = Math.max(0, Number(body.handsInWindow ?? 0));

    const supabase = createServerSupabase();
    const result = await claimPlaytimeTick(supabase, user.id, {
      handsInWindow,
    });
    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "在線獎勵領取失敗";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
