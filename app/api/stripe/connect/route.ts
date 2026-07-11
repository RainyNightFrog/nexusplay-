import { NextResponse } from "next/server";
import { resolveUserProfile } from "@/lib/auth-profile";
import {
  readCreatorPayoutRow,
  startConnectOnboarding,
  type ConnectOnboardingReturnTo,
} from "@/lib/creator-payout-service";
import { canCreatorReceivePaidPayments } from "@/lib/creator-stripe-gate";
import { createAuthServerClient } from "@/lib/supabase/server-auth";
import { createServerSupabase } from "@/lib/supabase-server";

function parseReturnTo(value: unknown): ConnectOnboardingReturnTo {
  if (
    value === "dashboard" ||
    value === "upload" ||
    value === "edit" ||
    value === "settings"
  ) {
    return value;
  }
  return "dashboard";
}

export async function GET() {
  try {
    const authClient = await createAuthServerClient();
    const {
      data: { user },
    } = await authClient.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "請先登入" }, { status: 401 });
    }

    const profile = await resolveUserProfile(authClient, user);
    if (profile.role !== "creator" && !profile.is_admin) {
      return NextResponse.json({ error: "需要創作者身分" }, { status: 403 });
    }

    const supabase = createServerSupabase();
    const row = await readCreatorPayoutRow(supabase, user.id);

    return NextResponse.json({
      stripeAccountId: row?.stripe_account_id ?? row?.stripe_connect_account_id ?? null,
      stripeDetailsSubmitted: row?.stripe_details_submitted ?? false,
      canReceivePaidPayments: canCreatorReceivePaidPayments(row),
      payoutStatus: row?.payout_status ?? "none",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "讀取 Stripe 狀態失敗";
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
      return NextResponse.json({ error: "請先登入" }, { status: 401 });
    }

    const profile = await resolveUserProfile(authClient, user);
    if (profile.role !== "creator" && !profile.is_admin) {
      return NextResponse.json({ error: "需要創作者身分" }, { status: 403 });
    }

    const body = (await request.json().catch(() => ({}))) as {
      locale?: string;
      returnTo?: ConnectOnboardingReturnTo;
      gameId?: number;
    };
    const origin = new URL(request.url).origin;

    const result = await startConnectOnboarding({
      userId: user.id,
      email: user.email,
      displayName: profile.display_name,
      origin,
      locale: body.locale,
      returnTo: parseReturnTo(body.returnTo),
      gameId:
        typeof body.gameId === "number" && Number.isFinite(body.gameId)
          ? body.gameId
          : undefined,
    });

    if (result.mode === "preview") {
      return NextResponse.json({
        mode: "preview",
        message: "Stripe 尚未設定，目前為預覽模式",
      });
    }

    return NextResponse.json({ mode: "live", url: result.url });
  } catch (error) {
    const message = error instanceof Error ? error.message : "啟動 Stripe 連結失敗";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
