import type { SupabaseClient } from "@supabase/supabase-js";
import { getPlatformModeStatus } from "@/lib/platform-mode";
import { PRODUCTION_SITE_URL } from "@/lib/auth-redirect-urls";
import { getSiteUrl } from "@/lib/site-url";
import { createServerSupabase } from "@/lib/supabase-server";

export type LaunchChecklistPhase = "soft" | "payments" | "optional";

export type LaunchChecklistItemStatus =
  | "pass"
  | "fail"
  | "warn"
  | "manual"
  | "skipped";

export type LaunchChecklistItem = {
  id: string;
  phase: LaunchChecklistPhase;
  required: boolean;
  status: LaunchChecklistItemStatus;
  detail?: string;
  actionUrl?: string;
};

export type LaunchChecklistAlert = {
  id: string;
  severity: "critical" | "warning" | "info";
  message: string;
  actionUrl?: string;
};

export type LaunchChecklistReport = {
  generatedAt: string;
  siteUrl: string;
  isProduction: boolean;
  summary: {
    softRequiredTotal: number;
    softRequiredPass: number;
    paymentsRequiredTotal: number;
    paymentsRequiredPass: number;
    manualPending: number;
    readyForSoftLaunch: boolean;
    readyForPayments: boolean;
  };
  items: LaunchChecklistItem[];
  alerts: LaunchChecklistAlert[];
  manualState: Record<string, boolean>;
};

const MANUAL_STATE_ACTION = "launch_checklist_state";

const MANUAL_ITEM_IDS = [
  "manual_google_login",
  "manual_smoke_test",
  "manual_supabase_auth_urls",
  "manual_legal_review",
  "manual_hk_company",
  "manual_stripe_live_test",
  "manual_resend_receipt",
] as const;

export type ManualLaunchItemId = (typeof MANUAL_ITEM_IDS)[number];

export function isManualLaunchItemId(value: string): value is ManualLaunchItemId {
  return (MANUAL_ITEM_IDS as readonly string[]).includes(value);
}

function envSet(name: string) {
  return Boolean(process.env[name]?.trim());
}

function isProductionRuntime() {
  return process.env.NODE_ENV === "production" || Boolean(process.env.VERCEL);
}

async function probeUrl(url: string) {
  try {
    const response = await fetch(url, {
      method: "GET",
      redirect: "follow",
      cache: "no-store",
      signal: AbortSignal.timeout(12_000),
    });
    return { ok: response.ok, status: response.status };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      error: error instanceof Error ? error.message : "request failed",
    };
  }
}

async function checkDatabase() {
  try {
    const supabase = createServerSupabase();
    const { error } = await supabase.from("games").select("id").limit(1);
    if (error) {
      return { ok: false, detail: error.message };
    }
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      detail: error instanceof Error ? error.message : "database error",
    };
  }
}

export async function readManualLaunchState(
  supabase: SupabaseClient
): Promise<Record<string, boolean>> {
  const { data, error } = await supabase
    .from("admin_logs")
    .select("details")
    .eq("action", MANUAL_STATE_ACTION)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data?.details) {
    return {};
  }

  try {
    const parsed = JSON.parse(data.details) as Record<string, boolean>;
    return parsed ?? {};
  } catch {
    return {};
  }
}

export async function saveManualLaunchState(
  supabase: SupabaseClient,
  adminId: string,
  state: Record<string, boolean>
) {
  const { error } = await supabase.from("admin_logs").insert({
    admin_id: adminId,
    action: MANUAL_STATE_ACTION,
    details: JSON.stringify(state),
  });

  if (error) {
    throw new Error(error.message);
  }
}

function resolveItemStatus(
  automated: LaunchChecklistItemStatus,
  manualCompleted: boolean
): LaunchChecklistItemStatus {
  if (automated === "manual") {
    return manualCompleted ? "pass" : "manual";
  }
  return automated;
}

export async function buildLaunchChecklistReport(
  manualState: Record<string, boolean> = {}
): Promise<LaunchChecklistReport> {
  const siteUrl = getSiteUrl().replace(/\/$/, "");
  const platform = getPlatformModeStatus();
  const isProduction = isProductionRuntime();
  const db = await checkDatabase();
  const [homeProbe, gameApiProbe, gamePageProbe] = await Promise.all([
    probeUrl(`${siteUrl}/`),
    probeUrl(`${siteUrl}/api/games/1`),
    probeUrl(`${siteUrl}/game/1`),
  ]);

  const siteUrlLooksProduction =
    siteUrl.startsWith("https://") && !siteUrl.includes("localhost");

  const oauthSetupExposed =
    process.env.ENABLE_OAUTH_SETUP?.trim().toLowerCase() === "true";

  const automated: Array<
    Omit<LaunchChecklistItem, "status"> & { automatedStatus: LaunchChecklistItemStatus }
  > = [
    {
      id: "env_supabase_public",
      phase: "soft",
      required: true,
      automatedStatus: envSet("NEXT_PUBLIC_SUPABASE_URL") ? "pass" : "fail",
      detail: envSet("NEXT_PUBLIC_SUPABASE_URL") ? undefined : "缺少 NEXT_PUBLIC_SUPABASE_URL",
    },
    {
      id: "env_supabase_anon",
      phase: "soft",
      required: true,
      automatedStatus: envSet("NEXT_PUBLIC_SUPABASE_ANON_KEY") ? "pass" : "fail",
      detail: envSet("NEXT_PUBLIC_SUPABASE_ANON_KEY")
        ? undefined
        : "缺少 NEXT_PUBLIC_SUPABASE_ANON_KEY",
    },
    {
      id: "env_service_role",
      phase: "soft",
      required: true,
      automatedStatus: envSet("SUPABASE_SERVICE_ROLE_KEY") ? "pass" : "fail",
      detail: envSet("SUPABASE_SERVICE_ROLE_KEY")
        ? undefined
        : "缺少 SUPABASE_SERVICE_ROLE_KEY",
    },
    {
      id: "env_site_url",
      phase: "soft",
      required: true,
      automatedStatus:
        envSet("NEXT_PUBLIC_SITE_URL") && siteUrlLooksProduction ? "pass" : "warn",
      detail: !envSet("NEXT_PUBLIC_SITE_URL")
        ? "建議設定 NEXT_PUBLIC_SITE_URL 為正式網域"
        : !siteUrlLooksProduction
          ? `目前為 ${siteUrl}`
          : siteUrl,
      actionUrl: "https://vercel.com/docs/projects/environment-variables",
    },
    {
      id: "db_games_readable",
      phase: "soft",
      required: true,
      automatedStatus: db.ok ? "pass" : "fail",
      detail: db.ok ? undefined : db.detail,
    },
    {
      id: "probe_homepage",
      phase: "soft",
      required: true,
      automatedStatus: homeProbe.ok ? "pass" : "fail",
      detail: homeProbe.ok ? undefined : `HTTP ${homeProbe.status}`,
      actionUrl: `${siteUrl}/`,
    },
    {
      id: "probe_game_api",
      phase: "soft",
      required: true,
      automatedStatus: gameApiProbe.ok ? "pass" : "fail",
      detail: gameApiProbe.ok ? undefined : `HTTP ${gameApiProbe.status}`,
      actionUrl: `${siteUrl}/api/games/1`,
    },
    {
      id: "probe_game_page",
      phase: "soft",
      required: true,
      automatedStatus: gamePageProbe.ok ? "pass" : "fail",
      detail: gamePageProbe.ok ? undefined : `HTTP ${gamePageProbe.status}`,
      actionUrl: `${siteUrl}/game/1`,
    },
    {
      id: "security_oauth_setup",
      phase: "soft",
      required: true,
      automatedStatus: oauthSetupExposed ? "fail" : "pass",
      detail: oauthSetupExposed
        ? "ENABLE_OAUTH_SETUP=true 不應在正式站長期開啟"
        : "OAuth 設定端點已關閉",
    },
    {
      id: "env_cron_secret",
      phase: "soft",
      required: false,
      automatedStatus: envSet("CRON_SECRET") ? "pass" : "warn",
      detail: envSet("CRON_SECRET") ? undefined : "排程寄信／內部 API 建議設定 CRON_SECRET",
    },
    {
      id: "manual_google_login",
      phase: "soft",
      required: true,
      automatedStatus: "manual",
      actionUrl: `${siteUrl}/auth`,
    },
    {
      id: "manual_smoke_test",
      phase: "soft",
      required: true,
      automatedStatus: "manual",
      actionUrl: `${siteUrl}/`,
    },
    {
      id: "manual_supabase_auth_urls",
      phase: "soft",
      required: true,
      automatedStatus: "manual",
      actionUrl: `${siteUrl}/auth/setup-google`,
      detail: `Site URL 應為 ${PRODUCTION_SITE_URL}，Redirect 含 /auth/callback`,
    },
    {
      id: "manual_legal_review",
      phase: "soft",
      required: false,
      automatedStatus: "manual",
      actionUrl: `${siteUrl}/legal`,
    },
    {
      id: "payments_preview_mode",
      phase: "payments",
      required: true,
      automatedStatus: platform.previewMode ? "warn" : "pass",
      detail: platform.previewMode
        ? "PLATFORM_PREVIEW_MODE 仍為預覽（軟上線可接受）"
        : "已關閉預覽模式",
    },
    {
      id: "payments_stripe_keys",
      phase: "payments",
      required: true,
      automatedStatus: platform.stripeConfigured ? "pass" : "fail",
      detail: platform.stripeConfigured ? undefined : "缺少 Stripe 金鑰",
    },
    {
      id: "payments_stripe_live",
      phase: "payments",
      required: true,
      automatedStatus: platform.paymentsLive ? "pass" : "fail",
      detail: platform.paymentsLive
        ? undefined
        : "STRIPE_PAYMENTS_LIVE 未設為 true",
    },
    {
      id: "payments_stripe_webhook",
      phase: "payments",
      required: true,
      automatedStatus: envSet("STRIPE_WEBHOOK_SECRET") ? "pass" : "fail",
      detail: envSet("STRIPE_WEBHOOK_SECRET")
        ? undefined
        : "缺少 STRIPE_WEBHOOK_SECRET",
      actionUrl: "https://dashboard.stripe.com/webhooks",
    },
    {
      id: "payments_email_receipts",
      phase: "payments",
      required: false,
      automatedStatus: platform.emailConfigured ? "pass" : "warn",
      detail: platform.emailConfigured ? undefined : "未設定 Resend 收據郵件",
    },
    {
      id: "manual_hk_company",
      phase: "payments",
      required: true,
      automatedStatus: "manual",
    },
    {
      id: "manual_stripe_live_test",
      phase: "payments",
      required: true,
      automatedStatus: "manual",
      actionUrl: `${siteUrl}/settings/payout`,
    },
    {
      id: "manual_resend_receipt",
      phase: "payments",
      required: false,
      automatedStatus: "manual",
    },
    {
      id: "optional_rss_feeds",
      phase: "optional",
      required: false,
      automatedStatus: "skipped",
      actionUrl: `${siteUrl}/feeds`,
    },
    {
      id: "optional_websub",
      phase: "optional",
      required: false,
      automatedStatus: platform.websubConfigured ? "pass" : "skipped",
      detail: platform.websubConfigured ? "WebSub 已設定" : "可上線後再設定",
    },
    {
      id: "optional_web_push",
      phase: "optional",
      required: false,
      automatedStatus: platform.webPushConfigured ? "pass" : "skipped",
      detail: platform.webPushConfigured ? "推播已設定" : "可上線後再設定",
    },
  ];

  const items: LaunchChecklistItem[] = automated.map((entry) => {
    const manualCompleted = manualState[entry.id] === true;
    return {
      id: entry.id,
      phase: entry.phase,
      required: entry.required,
      status: resolveItemStatus(entry.automatedStatus, manualCompleted),
      detail: entry.detail,
      actionUrl: entry.actionUrl,
    };
  });

  const isDone = (item: LaunchChecklistItem) =>
    item.status === "pass" || item.status === "skipped";

  const softRequired = items.filter((item) => item.phase === "soft" && item.required);
  const paymentsRequired = items.filter(
    (item) => item.phase === "payments" && item.required
  );
  const manualPending = items.filter((item) => item.status === "manual").length;

  const alerts: LaunchChecklistAlert[] = [];

  if (oauthSetupExposed) {
    alerts.push({
      id: "oauth-setup",
      severity: "critical",
      message: "正式站仍開啟 ENABLE_OAUTH_SETUP，請在 Vercel 關閉或刪除此變數。",
      actionUrl: `${siteUrl}/auth/setup-google`,
    });
  }

  if (!platform.previewMode && !platform.paymentsLive) {
    alerts.push({
      id: "preview-off-payments-off",
      severity: "warning",
      message: "已關閉預覽模式但 Stripe 尚未 live，打賞可能異常。",
    });
  }

  if (manualPending > 0) {
    alerts.push({
      id: "manual-pending",
      severity: "info",
      message: `尚有 ${manualPending} 項需你手動確認並勾選完成。`,
    });
  }

  const softRequiredPass = softRequired.filter(isDone).length;
  const paymentsRequiredPass = paymentsRequired.filter(isDone).length;

  if (softRequiredPass < softRequired.length) {
    alerts.unshift({
      id: "soft-not-ready",
      severity: "critical",
      message: `軟上線必要項目：${softRequiredPass}/${softRequired.length} 已完成。`,
    });
  }

  return {
    generatedAt: new Date().toISOString(),
    siteUrl,
    isProduction,
    summary: {
      softRequiredTotal: softRequired.length,
      softRequiredPass,
      paymentsRequiredTotal: paymentsRequired.length,
      paymentsRequiredPass,
      manualPending,
      readyForSoftLaunch: softRequired.every(isDone),
      readyForPayments:
        softRequired.every(isDone) && paymentsRequired.every(isDone),
    },
    items,
    alerts,
    manualState,
  };
}
