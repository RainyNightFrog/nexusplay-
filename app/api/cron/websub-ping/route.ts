import { NextResponse } from "next/server";
import { verifyCronSecret } from "@/lib/cron-auth";
import { pingDefaultWebSubFeeds } from "@/lib/websub-service";

export async function GET(request: Request) {
  const authError = verifyCronSecret(request);
  if (authError) return authError;

  try {
    const summary = await pingDefaultWebSubFeeds();
    return NextResponse.json(summary);
  } catch (error) {
    const message = error instanceof Error ? error.message : "WebSub ping failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
