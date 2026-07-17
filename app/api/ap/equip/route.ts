import { NextResponse } from "next/server";
import type { ApShopItemKind } from "@/lib/ap-shop";
import { equipApCosmetic, listApShopCatalog } from "@/lib/ap-shop-service";
import { createAuthServerClient } from "@/lib/supabase/server-auth";
import { createServerSupabase } from "@/lib/supabase-server";

type EquipBody = {
  kind?: ApShopItemKind;
  item_code?: string | null;
};

const COSMETIC_KINDS = new Set(["avatar_frame", "name_color", "chat_bubble"]);

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
    const kind = body.kind;
    if (!kind || !COSMETIC_KINDS.has(kind)) {
      return NextResponse.json({ error: "無效的外觀類型" }, { status: 400 });
    }

    const itemCode =
      body.item_code === null || body.item_code === undefined
        ? null
        : body.item_code.trim() || null;

    const supabase = createServerSupabase();
    await equipApCosmetic(
      supabase,
      user.id,
      kind as Exclude<ApShopItemKind, "title">,
      itemCode
    );

    const catalog = await listApShopCatalog(supabase, user.id);
    return NextResponse.json({
      ok: true,
      wallet: catalog.wallet,
      items: catalog.items,
      equipped: catalog.equipped,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "裝備外觀失敗";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
