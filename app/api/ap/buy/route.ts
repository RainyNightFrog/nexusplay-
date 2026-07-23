import { NextResponse } from "next/server";
import { purchaseApStoreItem } from "@/lib/ap-store-service";
import {
  checkRateLimit,
  getClientIp,
  rateLimitResponse,
} from "@/lib/rate-limit";
import { createAuthServerClient } from "@/lib/supabase/server-auth";
import { createServerSupabase } from "@/lib/supabase-server";

type BuyBody = {
  itemId?: string;
};

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const limit = checkRateLimit(`ap:buy:${ip}`, 20, 60_000);
    if (!limit.allowed) {
      return rateLimitResponse(limit.retryAfterSec);
    }

    const authClient = await createAuthServerClient();
    const {
      data: { user },
    } = await authClient.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "請先登入" }, { status: 401 });
    }

    const userLimit = checkRateLimit(`ap:buy:user:${user.id}`, 10, 60_000);
    if (!userLimit.allowed) {
      return rateLimitResponse(userLimit.retryAfterSec);
    }

    const body = (await request.json()) as BuyBody;
    const itemId = body.itemId?.trim();
    if (!itemId) {
      return NextResponse.json({ error: "請提供商品 ID" }, { status: 400 });
    }

    // 絕不接受前端傳來的 AP／價格；金額只由 DB RPC 決定
    const { dashboard, result } = await purchaseApStoreItem(
      user.id,
      itemId,
      createServerSupabase()
    );

    return NextResponse.json({
      ...dashboard,
      purchasedKey: result.item_key,
      spentAp: result.cost_ap,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "購買失敗";
    const status =
      message.includes("餘額") ||
      message.includes("已擁有") ||
      message.includes("售罄") ||
      message.includes("找不到")
        ? 400
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
