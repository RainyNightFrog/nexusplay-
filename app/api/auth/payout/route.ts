import { NextResponse } from "next/server";
import { resolveUserProfile } from "@/lib/auth-profile";
import {
  buildPayoutSnapshot,
  readCreatorPayoutRow,
  syncConnectAccountStatus,
} from "@/lib/creator-payout-service";
import { listRecentCreatorPayouts } from "@/lib/creator-payout-withdraw";
import { createAuthServerClient } from "@/lib/supabase/server-auth";
import { createServerSupabase } from "@/lib/supabase-server";
import {
  fetchConnectAvailableBalanceUsd,
  isPaymentsLive,
  isStripeConfigured,
} from "@/lib/stripe-connect";

export async function GET() {
  try {
    const supabase = await createAuthServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "請先登入" }, { status: 401 });
    }

    const profile = await resolveUserProfile(supabase, user);
    if (profile.role !== "creator" && !profile.is_admin) {
      return NextResponse.json({ error: "需要創作者身分" }, { status: 403 });
    }

    const serverSupabase = createServerSupabase();
    let row = await readCreatorPayoutRow(serverSupabase, user.id);

    if (
      isStripeConfigured() &&
      row?.stripe_connect_account_id &&
      row.payout_status !== "active"
    ) {
      try {
        await syncConnectAccountStatus(user.id, row.stripe_connect_account_id);
        row = await readCreatorPayoutRow(serverSupabase, user.id);
      } catch {
        // Stripe sync is best-effort on status reads
      }
    }

    let stripeAvailableUsd: number | null = null;
    if (
      isPaymentsLive() &&
      row?.stripe_connect_account_id &&
      row.payout_status === "active"
    ) {
      try {
        stripeAvailableUsd = await fetchConnectAvailableBalanceUsd(
          row.stripe_connect_account_id
        );
      } catch {
        stripeAvailableUsd = null;
      }
    }

    const [payout, history] = await Promise.all([
      Promise.resolve(buildPayoutSnapshot(row, { stripeAvailableUsd })),
      listRecentCreatorPayouts(user.id),
    ]);

    return NextResponse.json({ payout, history });
  } catch (error) {
    const message = error instanceof Error ? error.message : "讀取收款狀態失敗";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
