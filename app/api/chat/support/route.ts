import { NextResponse } from "next/server";
import { createAuthServerClient } from "@/lib/supabase/server-auth";
import { createServerSupabase } from "@/lib/supabase-server";
import { getCreatorAdminContactSummary } from "@/lib/support-chat-service";

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
    const contact = await getCreatorAdminContactSummary(supabase, user.id);
    return NextResponse.json({ contact });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "讀取管理員對話失敗";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
