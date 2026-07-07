import { NextResponse } from "next/server";
import { cleanupExpiredChatMessages } from "@/lib/chat-service";
import { verifyCronSecret } from "@/lib/cron-auth";
import { getPlatformModeStatus } from "@/lib/platform-mode";

export async function GET(request: Request) {
  const authError = verifyCronSecret(request);
  if (authError) return authError;

  try {
    const result = await cleanupExpiredChatMessages();
    return NextResponse.json({
      ...result,
      ...getPlatformModeStatus(),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Chat cleanup failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
