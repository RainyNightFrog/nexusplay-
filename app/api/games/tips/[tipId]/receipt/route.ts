import { NextResponse } from "next/server";
import { loadTipReceiptForPayer } from "@/lib/tip-receipt";
import { createAuthServerClient } from "@/lib/supabase/server-auth";
import { createServerSupabase } from "@/lib/supabase-server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ tipId: string }> }
) {
  try {
    const authClient = await createAuthServerClient();
    const {
      data: { user },
    } = await authClient.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "請先登入" }, { status: 401 });
    }

    const { tipId } = await params;
    if (!tipId?.trim()) {
      return NextResponse.json({ error: "缺少 tipId" }, { status: 400 });
    }

    const supabase = createServerSupabase();
    const receipt = await loadTipReceiptForPayer(
      supabase,
      tipId.trim(),
      user.id
    );

    if (!receipt) {
      return NextResponse.json({ error: "找不到收據" }, { status: 404 });
    }

    return NextResponse.json({ receipt });
  } catch (error) {
    const message = error instanceof Error ? error.message : "讀取收據失敗";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
