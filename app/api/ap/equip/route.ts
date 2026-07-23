import { NextResponse } from "next/server";
import { equipApStoreItem } from "@/lib/ap-store-service";
import { createAuthServerClient } from "@/lib/supabase/server-auth";
import { createServerSupabase } from "@/lib/supabase-server";

type EquipBody = {
  itemId?: string;
  equip?: boolean;
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
    const itemId = body.itemId?.trim();
    if (!itemId) {
      return NextResponse.json({ error: "請提供商品 ID" }, { status: 400 });
    }

    const equip = body.equip !== false;
    const { dashboard } = await equipApStoreItem(
      user.id,
      itemId,
      equip,
      createServerSupabase()
    );

    return NextResponse.json(dashboard);
  } catch (error) {
    const message = error instanceof Error ? error.message : "裝備失敗";
    const status =
      message.includes("尚未擁有") || message.includes("找不到") ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
