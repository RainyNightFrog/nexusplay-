import { NextResponse } from "next/server";
import { resolveUserProfile } from "@/lib/auth-profile";
import {
  createSupporterPassCheckoutSession,
  getCheckoutPaymentsState,
  recordPreviewSupporterPass,
} from "@/lib/supporter-pass-service";
import {
  LIFETIME_SUPPORTER_MAX_USD,
  LIFETIME_SUPPORTER_MIN_USD,
  LIFETIME_SUPPORTER_TIER_ID,
  SUPPORTER_PASS_TIERS,
} from "@/lib/supporter-pass";
import { createAuthServerClient } from "@/lib/supabase/server-auth";

/** 正式站禁止免費預覽發放；僅本機／明確預覽模式可測 */
function allowSupporterPreviewGrant() {
  if (process.env.VERCEL_ENV === "production") {
    return false;
  }
  const previewFlag = process.env.PLATFORM_PREVIEW_MODE?.trim().toLowerCase();
  if (previewFlag === "true") return true;
  if (previewFlag === "false") return false;
  return process.env.NODE_ENV !== "production";
}

export async function GET() {
  return NextResponse.json({
    tiers: SUPPORTER_PASS_TIERS.map((tier) => ({
      id: tier.id,
      priceCents: tier.priceCents,
      interval: tier.interval,
      badge: tier.badge,
    })),
    lifetime: {
      id: LIFETIME_SUPPORTER_TIER_ID,
      minUsd: LIFETIME_SUPPORTER_MIN_USD,
      maxUsd: LIFETIME_SUPPORTER_MAX_USD,
      badge: "supporter_v2",
    },
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
      customAmountUsd?: number | string;
      localePath?: string;
    };

    if (!body.tierId?.trim()) {
      return NextResponse.json({ error: "請選擇支持者方案" }, { status: 400 });
    }

    const profile = await resolveUserProfile(authClient, user);
    const payments = getCheckoutPaymentsState();
    const requestOrigin =
      request.headers.get("origin") ?? new URL(request.url).origin;
    const tierId = body.tierId.trim();

    if (!payments.paymentsLive) {
      if (!allowSupporterPreviewGrant()) {
        return NextResponse.json(
          {
            error:
              "金流尚未正式開放，暫時無法購買支持者通行證。請稍後再試或聯絡平台。",
          },
          { status: 503 }
        );
      }

      const result = await recordPreviewSupporterPass({
        userId: user.id,
        tierId,
        customAmountUsd: body.customAmountUsd,
      });

      if ("error" in result) {
        return NextResponse.json(
          { error: result.error },
          { status: result.status }
        );
      }

      return NextResponse.json({
        mode: "preview",
        orderId: result.orderId,
        checkout: result.checkout,
        priceCents: result.priceCents,
      });
    }

    const result = await createSupporterPassCheckoutSession({
      userId: user.id,
      userEmail: user.email,
      displayName: profile.display_name,
      tierId,
      customAmountUsd: body.customAmountUsd,
      localePath: body.localePath,
      requestOrigin,
    });

    if ("error" in result) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status! }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "建立支持者結帳失敗";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
