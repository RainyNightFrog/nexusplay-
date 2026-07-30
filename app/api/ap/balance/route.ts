import { NextResponse } from "next/server";
import { getApBalance } from "@/lib/ap-store-service";
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

    const wallet = await getApBalance(user.id, createServerSupabase());
    return NextResponse.json(wallet);
  } catch (error) {
    const message = error instanceof Error ? error.message : "讀取 AP 餘額失敗";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
