import { NextResponse } from "next/server";
import { maintainAmbientChat } from "@/lib/chat-ambient-maintain";
import { verifyCronSecret } from "@/lib/cron-auth";
import { getPlatformModeStatus } from "@/lib/platform-mode";

export async function GET(request: Request) {
  const authError = verifyCronSecret(request);
  if (authError) return authError;

  try {
    await maintainAmbientChat("world");
    return NextResponse.json({
      channel: "world",
      ...getPlatformModeStatus(),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Ambient world chat failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
