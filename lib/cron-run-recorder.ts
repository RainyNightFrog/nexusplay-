import { createServerSupabase } from "@/lib/supabase-server";

export async function recordCronRun(params: {
  jobName: string;
  status: "success" | "error";
  error?: string | null;
  durationMs?: number;
}) {
  try {
    const supabase = createServerSupabase();
    await supabase.from("platform_cron_runs").upsert(
      {
        job_name: params.jobName,
        last_run_at: new Date().toISOString(),
        last_status: params.status,
        last_error: params.error?.trim() || null,
        last_duration_ms: params.durationMs ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "job_name" }
    );
  } catch {
    // Cron 紀錄失敗不應中斷任務本身
  }
}
