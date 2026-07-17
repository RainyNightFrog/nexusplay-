import { NextResponse } from "next/server";
import {
  listApShopCatalog,
  purchaseApShopItem,
} from "@/lib/ap-shop-service";
import { createAuthServerClient } from "@/lib/supabase/server-auth";
import { createServerSupabase } from "@/lib/supabase-server";

type PurchaseBody = {
  item_code?: string;
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

    const body = (await request.json()) as PurchaseBody;
    const itemCode = body.item_code?.trim();
    if (!itemCode) {
      return NextResponse.json({ error: "缺少商品代碼" }, { status: 400 });
    }

    const supabase = createServerSupabase();
    const result = await purchaseApShopItem(supabase, user.id, itemCode);

    if (!result.ok) {
      const message =
        result.error === "insufficient_balance"
          ? "AP 不足"
          : result.error === "already_owned"
            ? "已擁有此商品"
            : result.error === "item_not_found"
              ? "找不到此商品"
              : result.error === "ap_shop_unavailable"
                ? "AP 商店尚未初始化"
                : "購買失敗";
      return NextResponse.json(
        {
          error: message,
          code: result.error,
          balance: result.balance,
          price: result.price,
        },
        { status: 400 }
      );
    }

    const catalog = await listApShopCatalog(supabase, user.id);
    return NextResponse.json({
      ok: true,
      purchase: result,
      wallet: catalog.wallet,
      items: catalog.items,
      equipped: catalog.equipped,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "購買失敗";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
