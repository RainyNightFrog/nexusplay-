import { NextResponse } from "next/server";
import {
  claimAllQuestRewards,
  claimQuestReward,
  getQuestsDashboard,
} from "@/lib/quests-service";
import { createAuthServerClient } from "@/lib/supabase/server-auth";
import { createServerSupabase } from "@/lib/supabase-server";

type ClaimBody = {
  questId?: string;
  claim_all?: boolean;
};

export async function POST(request: Request) {
  try {
    const authClient = await createAuthServerClient();
    const {
      data: { user },
    } = await authClient.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "請先登入" }, { status: 401 });
    }

    const body = (await request.json()) as ClaimBody;
    const supabase = createServerSupabase();

    if (body.claim_all) {
      const result = await claimAllQuestRewards(user.id, supabase);
      return NextResponse.json({
        ...result.dashboard,
        claimedIds: result.claimedIds,
        totalAp: result.totalAp,
      });
    }

    const questId = body.questId?.trim();
    if (!questId) {
      return NextResponse.json({ error: "請提供任務 ID" }, { status: 400 });
    }

    const dashboard = await claimQuestReward(user.id, questId, supabase);
    return NextResponse.json(dashboard);
  } catch (error) {
    const message = error instanceof Error ? error.message : "領取獎勵失敗";
    const status =
      message.includes("尚未") ||
      message.includes("找不到") ||
      message.includes("已領取")
        ? 400
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
