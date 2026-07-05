import { NextResponse } from "next/server";
import { verifyCronSecret } from "@/lib/cron-auth";
import { dispatchWeeklyForumDigests } from "@/lib/forum-digest-dispatch";

export async function GET(request: Request) {
  const authError = verifyCronSecret(request);
  if (authError) return authError;

  try {
    const result = await dispatchWeeklyForumDigests();
    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Forum digest dispatch failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
