import { NextResponse } from "next/server";
import { getTitleWardrobe } from "@/lib/achievements-service";
import { syncSupporterTitlesIfNeeded } from "@/lib/supporter-title-service";
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

    const supabase = createServerSupabase();
    await syncSupporterTitlesIfNeeded({
      supabase,
      userId: user.id,
    });
    const wardrobe = await getTitleWardrobe(supabase, user.id);

    return NextResponse.json({
      ...wardrobe,
      fetchedAt: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "讀取稱號衣櫥失敗";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
