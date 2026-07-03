import { NextResponse } from "next/server";
import { resolveUserProfile } from "@/lib/auth-profile";
import { createAuthServerClient } from "@/lib/supabase/server-auth";

export async function GET() {
  try {
    const supabase = await createAuthServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ profile: null });
    }

    const profile = await resolveUserProfile(supabase, user);
    return NextResponse.json({ profile });
  } catch (error) {
    const message = error instanceof Error ? error.message : "讀取個人資料失敗";
    return NextResponse.json({ error: message, profile: null }, { status: 500 });
  }
}
