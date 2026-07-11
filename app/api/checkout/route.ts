import { NextResponse } from "next/server";
import { resolveUserProfile } from "@/lib/auth-profile";
import {
  createGameCheckoutSession,
  getCheckoutPaymentsState,
  loadGameCheckoutInfo,
  recordPreviewCheckout,
} from "@/lib/game-checkout-service";
import { createAuthServerClient } from "@/lib/supabase/server-auth";
import { createServerSupabase } from "@/lib/supabase-server";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const gameId = Number.parseInt(url.searchParams.get("gameId") ?? "", 10);

    if (Number.isNaN(gameId)) {
      return NextResponse.json({ error: "無效的遊戲 ID" }, { status: 400 });
    }

    const supabase = createServerSupabase();
    const info = await loadGameCheckoutInfo(supabase, gameId);

    if ("error" in info) {
      return NextResponse.json({ error: info.error }, { status: info.status });
    }

    return NextResponse.json({
      gameId: info.game.id,
      gameTitle: info.game.title,
      pricingType: info.pricingType,
      gamePriceCents: info.fixedPriceCents,
      minPriceCents: info.minPriceCents,
      platformFeePercent: info.platformFeePercent,
      currency: info.game.currency ?? "USD",
      creatorPayoutReady: info.creatorPayoutReady,
      ...getCheckoutPaymentsState(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "讀取結帳資訊失敗";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const authClient = await createAuthServerClient();
    const {
      data: { user },
    } = await authClient.auth.getUser();

    if (!user?.email) {
      return NextResponse.json({ error: "請先登入才能購買" }, { status: 401 });
    }

    const body = (await request.json()) as {
      gameId?: number | string;
      platformTipAmount?: number | string;
      platformTipCents?: number | string;
      gameAmount?: number | string;
      gameAmountCents?: number | string;
      localePath?: string;
    };

    const gameId = Number.parseInt(String(body.gameId ?? ""), 10);
    if (Number.isNaN(gameId)) {
      return NextResponse.json({ error: "無效的遊戲 ID" }, { status: 400 });
    }

    const profile = await resolveUserProfile(authClient, user);
    const payments = getCheckoutPaymentsState();
    const requestOrigin = request.headers.get("origin") ?? new URL(request.url).origin;

    if (!payments.paymentsLive) {
      const result = await recordPreviewCheckout({
        gameId,
        buyerId: user.id,
        platformTipAmount: body.platformTipAmount,
        platformTipCents: body.platformTipCents,
        gameAmount: body.gameAmount,
        gameAmountCents: body.gameAmountCents,
      });

      if ("error" in result) {
        return NextResponse.json({ error: result.error }, { status: result.status });
      }

      return NextResponse.json({
        mode: "preview",
        orderId: result.orderId,
        amounts: result.amounts,
        platformFeePercent: result.platformFeePercent,
        creatorPayoutCents: result.creatorPayoutCents,
        gameTitle: result.gameTitle,
      });
    }

    const result = await createGameCheckoutSession({
      gameId,
      buyerId: user.id,
      buyerEmail: user.email,
      buyerDisplayName: profile.display_name,
      platformTipAmount: body.platformTipAmount,
      platformTipCents: body.platformTipCents,
      gameAmount: body.gameAmount,
      gameAmountCents: body.gameAmountCents,
      localePath: body.localePath,
      requestOrigin,
    });

    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: result.status! });
    }

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "建立結帳失敗";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
