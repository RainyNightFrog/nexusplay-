import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { listForumDigestRetryQueue } from "@/lib/forum-digest-retry-service";

export async function GET() {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const queue = await listForumDigestRetryQueue();
    return NextResponse.json({ queue });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load retry queue";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
