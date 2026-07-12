import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { listAdminCurationGames } from "@/lib/admin-curation-service";

export async function GET() {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const games = await listAdminCurationGames();
    return NextResponse.json({ games });
  } catch (error) {
    const message = error instanceof Error ? error.message : "讀取精選遊戲失敗";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
