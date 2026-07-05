import { NextResponse } from "next/server";
import { getFeedStats } from "@/lib/feed-stats-service";

export async function GET() {
  try {
    const stats = await getFeedStats();
    return NextResponse.json(stats, {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load feed stats";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
