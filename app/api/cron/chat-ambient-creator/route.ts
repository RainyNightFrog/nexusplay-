import { NextResponse } from "next/server";
import { postAmbientCreatorChat } from "@/lib/chat-ambient-service";
import { verifyCronSecret } from "@/lib/cron-auth";
import { getPlatformModeStatus } from "@/lib/platform-mode";

export async function GET(request: Request) {
  const authError = verifyCronSecret(request);
  if (authError) return authError;

  try {
    const result = await postAmbientCreatorChat();
    return NextResponse.json({
      ...result,
      ...getPlatformModeStatus(),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Ambient creator chat failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
