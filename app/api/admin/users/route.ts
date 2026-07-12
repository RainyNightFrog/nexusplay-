import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { listAdminUsers } from "@/lib/admin-users-service";

export async function GET(request: Request) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q") ?? undefined;
    const limit = Number.parseInt(searchParams.get("limit") ?? "50", 10);

    const users = await listAdminUsers({ query, limit });
    return NextResponse.json({ users });
  } catch (error) {
    const message = error instanceof Error ? error.message : "讀取用戶列表失敗";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
