import { cleanupExpiredChatMessages } from "@/lib/chat-service";
import { recordCronRun } from "@/lib/cron-run-recorder";
import { dispatchWeeklyForumDigests } from "@/lib/forum-digest-dispatch";
import { processForumDigestRetries } from "@/lib/forum-digest-retry-service";
import { createServerSupabase } from "@/lib/supabase-server";
import { cleanupExpiredVirtualDmMessages } from "@/lib/virtual-dm-service";

export type AdminCronJobDefinition = {
  name: string;
  label: string;
  description: string;
};

export const ADMIN_CRON_JOBS: AdminCronJobDefinition[] = [
  {
    name: "chat-cleanup",
    label: "聊天清理",
    description: "清除過期公開聊天與虛擬私訊",
  },
  {
    name: "forum-digest",
    label: "論壇 Email 摘要",
    description: "寄送論壇 digest 郵件",
  },
  {
    name: "forum-digest-retry",
    label: "Digest 重試佇列",
    description: "重試失敗的 digest 寄送",
  },
];

export type AdminCronRunRecord = AdminCronJobDefinition & {
  lastRunAt: string | null;
  lastStatus: string | null;
  lastError: string | null;
  lastDurationMs: number | null;
};

export async function listAdminCronRuns(): Promise<AdminCronRunRecord[]> {
  const supabase = createServerSupabase();
  const { data, error } = await supabase.from("platform_cron_runs").select("*");

  if (error && !error.message.includes("does not exist")) {
    throw new Error(error.message);
  }

  const runMap = new Map(
    (data ?? []).map((row) => [row.job_name as string, row])
  );

  return ADMIN_CRON_JOBS.map((job) => {
    const run = runMap.get(job.name);
    return {
      ...job,
      lastRunAt: (run?.last_run_at as string | null) ?? null,
      lastStatus: (run?.last_status as string | null) ?? null,
      lastError: (run?.last_error as string | null) ?? null,
      lastDurationMs: (run?.last_duration_ms as number | null) ?? null,
    };
  });
}

export async function triggerAdminCronJob(jobName: string) {
  const started = Date.now();

  try {
    switch (jobName) {
      case "chat-cleanup": {
        const [channelChat, virtualDm] = await Promise.all([
          cleanupExpiredChatMessages(),
          cleanupExpiredVirtualDmMessages(),
        ]);
        await recordCronRun({
          jobName,
          status: "success",
          durationMs: Date.now() - started,
        });
        return { jobName, channelChat, virtualDm };
      }
      case "forum-digest": {
        const result = await dispatchWeeklyForumDigests();
        await recordCronRun({
          jobName,
          status: "success",
          durationMs: Date.now() - started,
        });
        return { jobName, result };
      }
      case "forum-digest-retry": {
        const result = await processForumDigestRetries();
        await recordCronRun({
          jobName,
          status: "success",
          durationMs: Date.now() - started,
        });
        return { jobName, result };
      }
      default:
        return { error: "未知的 Cron 任務", status: 400 as const };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Cron 執行失敗";
    await recordCronRun({
      jobName,
      status: "error",
      error: message,
      durationMs: Date.now() - started,
    });
    throw error;
  }
}
