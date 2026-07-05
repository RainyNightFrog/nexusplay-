import { NextResponse } from "next/server";
import { billingAddressFromRow } from "@/lib/billing-address";
import { resolveUserProfile } from "@/lib/auth-profile";
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

    const profile = await resolveUserProfile(authClient, user);
    const supabase = createServerSupabase();

    const { data: games } = await supabase
      .from("games")
      .select(
        "id, title, category, publish_status, tips_enabled, platform_fee_percent, created_at, plays_count"
      )
      .eq("creator_id", user.id);

    const { data: saves } = await supabase
      .from("game_saves")
      .select("game_id, updated_at")
      .eq("user_id", user.id);

    const { data: tipsAsPayer } = await supabase
      .from("game_tips")
      .select(
        "id, game_id, amount_usd, creator_net_usd, platform_fee_usd, status, created_at, billing_snapshot"
      )
      .eq("payer_id", user.id)
      .order("created_at", { ascending: false });

    const { data: tipsAsCreator } = await supabase
      .from("game_tips")
      .select(
        "id, game_id, payer_id, amount_usd, creator_net_usd, platform_fee_usd, status, created_at"
      )
      .eq("creator_id", user.id)
      .order("created_at", { ascending: false });

    const { data: payouts } = await supabase
      .from("creator_payouts")
      .select(
        "id, amount_usd, status, mode, created_at, completed_at, failure_reason"
      )
      .eq("creator_id", user.id)
      .order("created_at", { ascending: false });

    const { data: billingRow } = await supabase
      .from("profiles")
      .select(
        "billing_name, billing_line1, billing_line2, billing_city, billing_region, billing_postal, billing_country, creator_balance_usd, payout_status"
      )
      .eq("id", user.id)
      .maybeSingle();

    const exportPayload = {
      exported_at: new Date().toISOString(),
      account: {
        id: user.id,
        email: user.email,
        created_at: user.created_at,
        profile,
      },
      billing: billingRow
        ? billingAddressFromRow(billingRow as Record<string, unknown>)
        : null,
      creator_finance: billingRow
        ? {
            creator_balance_usd: billingRow.creator_balance_usd,
            payout_status: billingRow.payout_status,
          }
        : null,
      games: games ?? [],
      game_saves: saves ?? [],
      tips_as_payer: tipsAsPayer ?? [],
      tips_as_creator: tipsAsCreator ?? [],
      creator_payouts: payouts ?? [],
    };

    const filename = `nexusplay-export-${user.id.slice(0, 8)}.json`;

    return new NextResponse(JSON.stringify(exportPayload, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "匯出資料失敗";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
