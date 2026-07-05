import { NextResponse } from "next/server";
import { checkFeedHealth } from "@/lib/feed-health-service";

export async function GET() {
  try {
    const report = await checkFeedHealth();
    return NextResponse.json(report, {
      status: report.healthy ? 200 : 503,
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Feed health check failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
