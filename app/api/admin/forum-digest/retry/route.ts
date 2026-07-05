import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { processForumDigestRetries } from "@/lib/forum-digest-retry-service";

export async function POST() {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const result = await processForumDigestRetries();
    return NextResponse.json({ result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Digest retry failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
