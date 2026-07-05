import { NextResponse } from "next/server";
import { resolveUserRole, hasCreatorDashboardAccess } from "@/lib/auth-profile";
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

    const role = await resolveUserRole(authClient, user);
    if (!hasCreatorDashboardAccess(user, role)) {
      return NextResponse.json({ error: "需要創作者身分" }, { status: 403 });
    }

    const supabase = createServerSupabase();
    const { data, error } = await supabase
      .from("games")
      .select("id, title, tips_enabled, platform_fee_percent")
      .eq("creator_id", user.id)
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);

    return NextResponse.json({ games: data ?? [] });
  } catch (error) {
    const message = error instanceof Error ? error.message : "讀取平台費資料失敗";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
