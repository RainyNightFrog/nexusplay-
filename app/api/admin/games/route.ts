import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { getAdminStats, listAdminGames } from "@/lib/admin-service";
import type { GameApprovalStatus } from "@/lib/admin-service";

const VALID_STATUSES = new Set<GameApprovalStatus | "all">([
  "pending",
  "approved",
  "rejected",
  "all",
]);

export async function GET(request: Request) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const { searchParams } = new URL(request.url);
    const statusParam = searchParams.get("status") ?? "pending";
    const status = VALID_STATUSES.has(statusParam as GameApprovalStatus | "all")
      ? (statusParam as GameApprovalStatus | "all")
      : "pending";

    const [games, stats] = await Promise.all([
      listAdminGames(status),
      getAdminStats(),
    ]);

    return NextResponse.json({ games, stats, status });
  } catch (error) {
    const message = error instanceof Error ? error.message : "讀取審批列表失敗";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
