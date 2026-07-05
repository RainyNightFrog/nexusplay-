import { NextResponse } from "next/server";
import { listFollowedCreators } from "@/lib/creator-follows-service";
import { createAuthServerClient } from "@/lib/supabase/server-auth";

export async function GET() {
  try {
    const authClient = await createAuthServerClient();
    const {
      data: { user },
    } = await authClient.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "請先登入" }, { status: 401 });
    }

    const creators = await listFollowedCreators(user.id);
    return NextResponse.json({ creators });
  } catch (error) {
    const message = error instanceof Error ? error.message : "讀取追蹤清單失敗";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
