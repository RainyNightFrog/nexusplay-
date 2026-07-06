import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import {
  buildLaunchChecklistReport,
  isManualLaunchItemId,
  readManualLaunchState,
  saveManualLaunchState,
} from "@/lib/launch-checklist-service";

export async function GET() {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const manualState = await readManualLaunchState(auth.supabase!);
    const report = await buildLaunchChecklistReport(manualState);
    return NextResponse.json(report);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "讀取上線清單失敗";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const body = (await request.json()) as {
      itemId?: string;
      completed?: boolean;
    };

    if (!body.itemId || !isManualLaunchItemId(body.itemId)) {
      return NextResponse.json({ error: "無效的清單項目" }, { status: 400 });
    }

    const current = await readManualLaunchState(auth.supabase!);
    const nextState = {
      ...current,
      [body.itemId]: body.completed === true,
    };

    await saveManualLaunchState(auth.supabase!, auth.user!.id, nextState);
    const report = await buildLaunchChecklistReport(nextState);
    return NextResponse.json(report);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "更新上線清單失敗";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
