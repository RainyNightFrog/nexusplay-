import { NextResponse } from "next/server";
import { isAdminUser } from "@/lib/admin-auth";
import { createAuthServerClient } from "@/lib/supabase/server-auth";
import { createServerSupabase } from "@/lib/supabase-server";

export async function DELETE(request: Request) {
  try {
    const authClient = await createAuthServerClient();
    const {
      data: { user },
    } = await authClient.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "請先登入" }, { status: 401 });
    }

    if (isAdminUser(user)) {
      return NextResponse.json(
        { error: "管理員帳戶無法自行刪除，請聯絡平台營運" },
        { status: 403 }
      );
    }

    const body = (await request.json()) as { confirmation?: string };
    if (body.confirmation !== "DELETE") {
      return NextResponse.json(
        { error: "請輸入 DELETE 以確認刪除帳戶" },
        { status: 400 }
      );
    }

    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceKey) {
      return NextResponse.json(
        { error: "伺服器尚未設定帳戶刪除功能" },
        { status: 503 }
      );
    }

    const supabase = createServerSupabase();

    await supabase.from("game_saves").delete().eq("user_id", user.id);
    await supabase.from("user_activity_stats").delete().eq("user_id", user.id);

    const { data: ownedGames } = await supabase
      .from("games")
      .select("id")
      .eq("creator_id", user.id);

    if (ownedGames && ownedGames.length > 0) {
      return NextResponse.json(
        {
          error:
            "此帳戶仍有已發布的遊戲。請先至創作者後台刪除所有遊戲，再刪除帳戶。",
        },
        { status: 409 }
      );
    }

    await supabase.from("profiles").delete().eq("id", user.id);

    const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id);

    if (deleteError) {
      throw new Error(deleteError.message);
    }

    await authClient.auth.signOut();

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "刪除帳戶失敗";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
