import { NextResponse } from "next/server";
import { createAuthServerClient } from "@/lib/supabase/server-auth";
import { createServerSupabase } from "@/lib/supabase-server";
import { ensurePokerUser, getBalance } from "@/lib/poker/economy-service";
import { TABLE_TIERS } from "@/lib/poker/types";
import {
  CHECKIN_REWARDS,
  PLAYTIME_REWARD_POINTS,
  PLAYTIME_MAX_TICKS_PER_DAY,
  BANKRUPTCY_THRESHOLD,
  BANKRUPTCY_REBUY_AMOUNT,
  BANKRUPTCY_MAX_REBUYS_PER_DAY,
} from "@/lib/poker/economy";

export async function GET() {
  try {
    const authClient = await createAuthServerClient();
    const {
      data: { user },
    } = await authClient.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "請先登入" }, { status: 401 });
    }

    const supabase = createServerSupabase();
    const profile = await getBalance(supabase, user.id);

    return NextResponse.json({
      pokerUserId: profile.id,
      displayName: profile.display_name,
      avatarUrl: profile.avatar_url,
      pointsBalance: profile.points_balance,
      tiers: TABLE_TIERS,
      economy: {
        checkinRewards: CHECKIN_REWARDS,
        playtimeReward: PLAYTIME_REWARD_POINTS,
        playtimeMaxPerDay: PLAYTIME_MAX_TICKS_PER_DAY,
        bankruptcyThreshold: BANKRUPTCY_THRESHOLD,
        bankruptcyRebuy: BANKRUPTCY_REBUY_AMOUNT,
        bankruptcyMaxPerDay: BANKRUPTCY_MAX_REBUYS_PER_DAY,
      },
      wsUrl:
        process.env.NEXT_PUBLIC_POKER_WS_URL ||
        "http://localhost:3101",
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "讀取失敗";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST() {
  try {
    const authClient = await createAuthServerClient();
    const {
      data: { user },
    } = await authClient.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "請先登入" }, { status: 401 });
    }

    const supabase = createServerSupabase();
    const meta = user.user_metadata as {
      display_name?: string;
      avatar_url?: string;
    };
    const profile = await ensurePokerUser(supabase, user.id, {
      displayName: meta.display_name,
      avatarUrl: meta.avatar_url,
    });

    return NextResponse.json({
      pokerUserId: profile.id,
      pointsBalance: profile.points_balance,
      displayName: profile.display_name,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "開戶失敗";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
