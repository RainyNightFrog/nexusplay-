import { NextResponse } from "next/server";
import { resolveUserProfile } from "@/lib/auth-profile";
import { requestCreatorWithdrawal } from "@/lib/creator-payout-withdraw";
import { createAuthServerClient } from "@/lib/supabase/server-auth";

export async function POST() {
  try {
    const supabase = await createAuthServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "請先登入" }, { status: 401 });
    }

    const profile = await resolveUserProfile(supabase, user);
    if (profile.role !== "creator" && !profile.is_admin) {
      return NextResponse.json({ error: "需要創作者身分" }, { status: 403 });
    }

    const result = await requestCreatorWithdrawal(user.id);

    if ("error" in result) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status ?? 400 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "提領失敗";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
