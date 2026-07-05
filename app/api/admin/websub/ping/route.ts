import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { pingDefaultWebSubFeeds } from "@/lib/websub-service";

export async function POST() {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const summary = await pingDefaultWebSubFeeds();
    return NextResponse.json({ summary });
  } catch (error) {
    const message = error instanceof Error ? error.message : "WebSub ping failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
