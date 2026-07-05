import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { getForumDigestAdminReport } from "@/lib/forum-digest-admin-service";

export async function GET() {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const report = await getForumDigestAdminReport();
    return NextResponse.json({ report });
  } catch (error) {
    const message = error instanceof Error ? error.message : "讀取摘要報表失敗";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
