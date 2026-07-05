import { NextResponse } from "next/server";
import { verifyCronSecret } from "@/lib/cron-auth";
import { processForumDigestRetries } from "@/lib/forum-digest-retry-service";
import { getPlatformModeStatus } from "@/lib/platform-mode";

export async function GET(request: Request) {
  const authError = verifyCronSecret(request);
  if (authError) return authError;

  try {
    const result = await processForumDigestRetries();
    return NextResponse.json({
      ...result,
      ...getPlatformModeStatus(),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Forum digest retry failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
