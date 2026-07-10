import { NextResponse } from "next/server";
import { maintainAmbientChat } from "@/lib/chat-ambient-maintain";
import { verifyCronSecret } from "@/lib/cron-auth";
import { getPlatformModeStatus } from "@/lib/platform-mode";

export async function GET(request: Request) {
  const authError = verifyCronSecret(request);
  if (authError) return authError;

  try {
    await maintainAmbientChat("creator");
    return NextResponse.json({
      channel: "creator",
      ...getPlatformModeStatus(),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Ambient creator chat failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
