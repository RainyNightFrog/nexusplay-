import { NextResponse } from "next/server";
import { finalizeTipPayment } from "@/lib/tip-checkout-service";
import { createAuthServerClient } from "@/lib/supabase/server-auth";

export async function POST(request: Request) {
  try {
    const authClient = await createAuthServerClient();
    const {
      data: { user },
    } = await authClient.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "請先登入" }, { status: 401 });
    }

    const body = (await request.json()) as { paymentIntentId?: string };

    if (!body.paymentIntentId?.trim()) {
      return NextResponse.json({ error: "缺少 paymentIntentId" }, { status: 400 });
    }

    const result = await finalizeTipPayment(body.paymentIntentId.trim(), {
      expectedPayerId: user.id,
    });

    if (!result.ok) {
      if (result.reason === "forbidden") {
        return NextResponse.json({ error: "無權確認此筆打賞" }, { status: 403 });
      }
      return NextResponse.json(
        { error: "付款尚未完成或無法確認" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      ok: true,
      tipId: result.tipId,
      creatorNetUsd: result.creatorNetUsd,
      alreadyProcessed: result.alreadyProcessed ?? false,
      receipt: result.receipt ?? null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "確認打賞失敗";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
