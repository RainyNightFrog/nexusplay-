import { NextResponse } from "next/server";
import { cleanupExpiredChatMessages } from "@/lib/chat-service";
import { cleanupExpiredPlayerDmMessages } from "@/lib/player-dm-service";
import {
  cleanupExpiredVirtualDmMessages,
  deliverDueVirtualDmReplies,
} from "@/lib/virtual-dm-service";
import { verifyCronSecret } from "@/lib/cron-auth";
import { recordCronRun } from "@/lib/cron-run-recorder";
import { getPlatformModeStatus } from "@/lib/platform-mode";

export async function GET(request: Request) {
  const authError = verifyCronSecret(request);
  if (authError) return authError;

  try {
    const started = Date.now();
    const [channelChat, virtualDm, playerDm, virtualDmReplies] =
      await Promise.all([
        cleanupExpiredChatMessages(),
        cleanupExpiredVirtualDmMessages(),
        cleanupExpiredPlayerDmMessages(),
        deliverDueVirtualDmReplies(),
      ]);
    await recordCronRun({
      jobName: "chat-cleanup",
      status: "success",
      durationMs: Date.now() - started,
    });
    return NextResponse.json({
      channelChat,
      virtualDm,
      playerDm,
      virtualDmReplies,
      ...getPlatformModeStatus(),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Chat cleanup failed";
    await recordCronRun({
      jobName: "chat-cleanup",
      status: "error",
      error: message,
    });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
