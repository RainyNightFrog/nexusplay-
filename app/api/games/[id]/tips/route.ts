import { NextResponse } from "next/server";
import { resolveUserProfile } from "@/lib/auth-profile";
import {
  createTipPaymentIntent,
  getTipPaymentsState,
  loadTipCheckoutContext,
  parseTipAmount,
  recordPreviewTip,
} from "@/lib/tip-checkout-service";
import { createAuthServerClient } from "@/lib/supabase/server-auth";
import { createServerSupabase } from "@/lib/supabase-server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const gameId = Number.parseInt(id, 10);

    if (Number.isNaN(gameId)) {
      return NextResponse.json({ error: "無效的遊戲 ID" }, { status: 400 });
    }

    const supabase = createServerSupabase();
    const { data: game, error: gameError } = await supabase
      .from("games")
      .select("tips_enabled, suggested_tip_amount, platform_fee_percent, creator_id")
      .eq("id", gameId)
      .maybeSingle();

    if (gameError) {
      throw new Error(gameError.message);
    }

    if (!game) {
      return NextResponse.json({ error: "找不到此遊戲" }, { status: 404 });
    }

    const payments = getTipPaymentsState();

    if (!game.tips_enabled) {
      return NextResponse.json({
        tipsEnabled: false,
        suggestedTipAmount: null,
        platformFeePercent: 0,
        creatorPayoutReady: false,
        ...payments,
      });
    }

    const context = await loadTipCheckoutContext(supabase, gameId);

    if ("error" in context) {
      return NextResponse.json({ error: context.error }, { status: context.status });
    }

    return NextResponse.json({
      tipsEnabled: true,
      suggestedTipAmount: context.game.suggested_tip_amount,
      platformFeePercent: context.platformFeePercent,
      creatorPayoutReady: context.creatorProfile.payout_status === "active",
      ...payments,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "讀取打賞資訊失敗";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authClient = await createAuthServerClient();
    const {
      data: { user },
    } = await authClient.auth.getUser();

    if (!user?.email) {
      return NextResponse.json({ error: "請先登入才能打賞" }, { status: 401 });
    }

    const { id } = await params;
    const gameId = Number.parseInt(id, 10);

    if (Number.isNaN(gameId)) {
      return NextResponse.json({ error: "無效的遊戲 ID" }, { status: 400 });
    }

    const body = (await request.json()) as {
      amountUsd?: number;
      paymentMethodId?: string;
      publicAnonymous?: boolean;
    };
    const amountUsd = parseTipAmount(body.amountUsd);

    if (amountUsd == null) {
      return NextResponse.json(
        { error: "打賞金額需在 $1 – $500 之間" },
        { status: 400 }
      );
    }

    const profile = await resolveUserProfile(authClient, user);
    const payments = getTipPaymentsState();

    if (!payments.paymentsLive) {
      const result = await recordPreviewTip({
        gameId,
        payerId: user.id,
        amountUsd,
        publicAnonymous: body.publicAnonymous === true,
      });

      if ("error" in result) {
        return NextResponse.json({ error: result.error }, { status: result.status });
      }

      return NextResponse.json({
        mode: "preview",
        tipId: result.tipId,
        breakdown: result.breakdown,
        receipt: result.receipt,
      });
    }

    const result = await createTipPaymentIntent({
      gameId,
      payerId: user.id,
      payerEmail: user.email,
      payerDisplayName: profile.display_name,
      amountUsd,
      paymentMethodId: body.paymentMethodId?.trim() || null,
      publicAnonymous: body.publicAnonymous === true,
    });

    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: result.status! });
    }

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "建立打賞失敗";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
