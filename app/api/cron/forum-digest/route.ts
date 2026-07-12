import { NextResponse } from "next/server";
import { verifyCronSecret } from "@/lib/cron-auth";
import { recordCronRun } from "@/lib/cron-run-recorder";
import { dispatchWeeklyForumDigests } from "@/lib/forum-digest-dispatch";
import { getPlatformModeStatus } from "@/lib/platform-mode";

export async function GET(request: Request) {
  const authError = verifyCronSecret(request);
  if (authError) return authError;

  try {
    const started = Date.now();
    const result = await dispatchWeeklyForumDigests();
    await recordCronRun({
      jobName: "forum-digest",
      status: "success",
      durationMs: Date.now() - started,
    });
    return NextResponse.json({
      ...result,
      ...getPlatformModeStatus(),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Forum digest dispatch failed";
    await recordCronRun({
      jobName: "forum-digest",
      status: "error",
      error: message,
    });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
