import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { writeAdminLog } from "@/lib/admin-service";
import {
  getAdminUserDetail,
  updateAdminUserAccount,
} from "@/lib/admin-users-service";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const { id } = await params;
    const user = await getAdminUserDetail(id);
    return NextResponse.json({ user });
  } catch (error) {
    const message = error instanceof Error ? error.message : "讀取用戶詳情失敗";
    return NextResponse.json({ error: message }, { status: 404 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const { id } = await params;
    const body = (await request.json()) as {
      action?: string;
      reason?: string;
      suspendedUntil?: string;
      chatMutedUntil?: string;
      role?: "player" | "creator";
      supporterBadge?: "supporter_v1" | "supporter_v2";
    };

    if (!body.action) {
      return NextResponse.json({ error: "缺少 action" }, { status: 400 });
    }

    const user = await updateAdminUserAccount({
      userId: id,
      action: body.action as Parameters<
        typeof updateAdminUserAccount
      >[0]["action"],
      reason: body.reason,
      suspendedUntil: body.suspendedUntil,
      chatMutedUntil: body.chatMutedUntil,
      role: body.role,
      supporterBadge: body.supporterBadge,
    });

    await writeAdminLog(
      auth.supabase!,
      auth.user!.id,
      body.action,
      `user=${id}${body.reason ? ` reason=${body.reason}` : ""}${
        body.role ? ` role=${body.role}` : ""
      }${body.supporterBadge ? ` badge=${body.supporterBadge}` : ""}`
    );

    return NextResponse.json({ user });
  } catch (error) {
    const message = error instanceof Error ? error.message : "更新用戶失敗";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
