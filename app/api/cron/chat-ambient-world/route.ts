import { NextResponse } from "next/server";
import { postAmbientWorldChat } from "@/lib/chat-ambient-service";
import { verifyCronSecret } from "@/lib/cron-auth";
import { getPlatformModeStatus } from "@/lib/platform-mode";

export async function GET(request: Request) {
  const authError = verifyCronSecret(request);
  if (authError) return authError;

  try {
    const result = await postAmbientWorldChat();
    return NextResponse.json({
      ...result,
      ...getPlatformModeStatus(),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Ambient world chat failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
