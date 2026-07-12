import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { writeAdminLog } from "@/lib/admin-service";
import {
  grantManualEntitlement,
  revokeManualEntitlement,
} from "@/lib/admin-orders-service";

export async function POST(request: Request) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const body = (await request.json()) as {
      action?: "grant" | "revoke";
      userId?: string;
      gameId?: number;
    };

    if (!body.action || !body.userId || !body.gameId) {
      return NextResponse.json({ error: "缺少必要參數" }, { status: 400 });
    }

    const result =
      body.action === "grant"
        ? await grantManualEntitlement({
            userId: body.userId,
            gameId: body.gameId,
          })
        : await revokeManualEntitlement({
            userId: body.userId,
            gameId: body.gameId,
          });

    await writeAdminLog(
      auth.supabase!,
      auth.user!.id,
      `${body.action}_entitlement`,
      `user=${body.userId} game=${body.gameId}`
    );

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "授權操作失敗";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
