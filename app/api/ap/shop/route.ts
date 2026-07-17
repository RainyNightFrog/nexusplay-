import { NextResponse } from "next/server";
import { listApShopCatalog } from "@/lib/ap-shop-service";
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

    const catalog = await listApShopCatalog(createServerSupabase(), user.id);
    return NextResponse.json({
      wallet: catalog.wallet,
      items: catalog.items,
      equipped: catalog.equipped,
      fetchedAt: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "讀取 AP 商店失敗";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
