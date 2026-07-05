import { NextResponse } from "next/server";
import { verifyCronSecret } from "@/lib/cron-auth";
import { subscribeDefaultWebSubTopics } from "@/lib/websub-subscribe-service";

export async function GET(request: Request) {
  const authError = verifyCronSecret(request);
  if (authError) return authError;

  try {
    const summary = await subscribeDefaultWebSubTopics();
    return NextResponse.json(summary);
  } catch (error) {
    const message = error instanceof Error ? error.message : "WebSub subscribe failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
