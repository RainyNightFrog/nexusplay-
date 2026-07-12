import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { writeAdminLog } from "@/lib/admin-service";
import {
  listAdminCronRuns,
  triggerAdminCronJob,
} from "@/lib/admin-cron-service";

export async function GET() {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const jobs = await listAdminCronRuns();
    return NextResponse.json({ jobs });
  } catch (error) {
    const message = error instanceof Error ? error.message : "讀取 Cron 狀態失敗";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const body = (await request.json()) as { jobName?: string };
    if (!body.jobName?.trim()) {
      return NextResponse.json({ error: "缺少 jobName" }, { status: 400 });
    }

    const result = await triggerAdminCronJob(body.jobName.trim());

    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    await writeAdminLog(
      auth.supabase!,
      auth.user!.id,
      "trigger_cron",
      `job=${body.jobName}`
    );

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Cron 觸發失敗";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
