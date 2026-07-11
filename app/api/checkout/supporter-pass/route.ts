import { NextResponse } from "next/server";
import { resolveUserProfile } from "@/lib/auth-profile";
import {
  createSupporterPassCheckoutSession,
  getCheckoutPaymentsState,
  recordPreviewSupporterPass,
} from "@/lib/supporter-pass-service";
import { SUPPORTER_PASS_TIERS } from "@/lib/supporter-pass";
import { createAuthServerClient } from "@/lib/supabase/server-auth";

export async function GET() {
  return NextResponse.json({
    tiers: SUPPORTER_PASS_TIERS.map((tier) => ({
      id: tier.id,
      priceCents: tier.priceCents,
      interval: tier.interval,
      badge: tier.badge,
    })),
    ...getCheckoutPaymentsState(),
  });
}

export async function POST(request: Request) {
  try {
    const authClient = await createAuthServerClient();
    const {
      data: { user },
    } = await authClient.auth.getUser();

    if (!user?.email) {
      return NextResponse.json(
        { error: "請先登入才能購買支持者通行證" },
        { status: 401 }
      );
    }

    const body = (await request.json()) as {
      tierId?: string;
      localePath?: string;
    };

    if (!body.tierId?.trim()) {
      return NextResponse.json({ error: "請選擇支持者方案" }, { status: 400 });
    }

    const profile = await resolveUserProfile(authClient, user);
    const payments = getCheckoutPaymentsState();
    const requestOrigin =
      request.headers.get("origin") ?? new URL(request.url).origin;

    if (!payments.paymentsLive) {
      const result = await recordPreviewSupporterPass({
        userId: user.id,
        tierId: body.tierId.trim(),
      });

      if ("error" in result) {
        return NextResponse.json({ error: result.error }, { status: result.status });
      }

      return NextResponse.json({
        mode: "preview",
        orderId: result.orderId,
        tier: result.tier,
        priceCents: result.priceCents,
      });
    }

    const result = await createSupporterPassCheckoutSession({
      userId: user.id,
      userEmail: user.email,
      displayName: profile.display_name,
      tierId: body.tierId.trim(),
      localePath: body.localePath,
      requestOrigin,
    });

    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: result.status! });
    }

    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "建立支持者結帳失敗";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
