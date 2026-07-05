import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import {
  getAdminAnalytics,
  type AnalyticsRange,
} from "@/lib/analytics-service";

const VALID_RANGES = new Set<AnalyticsRange>(["today", "week", "month"]);

export async function GET(request: Request) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const { searchParams } = new URL(request.url);
    const rangeParam = searchParams.get("range") ?? "today";
    const range = VALID_RANGES.has(rangeParam as AnalyticsRange)
      ? (rangeParam as AnalyticsRange)
      : "today";

    const analytics = await getAdminAnalytics(range);

    return NextResponse.json({ analytics });
  } catch (error) {
    const message = error instanceof Error ? error.message : "讀取人流統計失敗";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
