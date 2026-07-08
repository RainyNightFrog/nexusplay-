import { NextResponse } from "next/server";
import { equipTitle } from "@/lib/achievements-service";
import { resolveEquippedTitleForUser } from "@/lib/equipped-title-service";
import { createAuthServerClient } from "@/lib/supabase/server-auth";
import { createServerSupabase } from "@/lib/supabase-server";

type EquipBody = {
  title_id?: string | null;
};

export async function POST(request: Request) {
  try {
    const authClient = await createAuthServerClient();
    const {
      data: { user },
    } = await authClient.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "請先登入" }, { status: 401 });
    }

    const body = (await request.json()) as EquipBody;
    const titleId =
      body.title_id === null || body.title_id === undefined || body.title_id === ""
        ? null
        : String(body.title_id).trim();

    const supabase = createServerSupabase();
    const result = await equipTitle(supabase, user.id, titleId);
    const equippedTitle = titleId
      ? await resolveEquippedTitleForUser(supabase, user.id)
      : null;

    return NextResponse.json({
      equipped_title_id: result.equipped_title_id,
      equipped_title: equippedTitle,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "佩戴稱號失敗";
    const status = message.includes("尚未解鎖") ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
