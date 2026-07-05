import type {
  AnalyticsScope,
  DashboardAnalytics,
  DashboardHighlight,
  HighlightTimeRange,
} from "@/lib/dashboard-analytics";
import { ALL_GAMES_SCOPE } from "@/lib/dashboard-analytics";
import type { DashboardAnalyticsPayload } from "@/lib/dashboard-analytics-server";

export async function fetchDashboardAnalytics(
  scope: AnalyticsScope,
  highlightRange: HighlightTimeRange
): Promise<DashboardAnalyticsPayload> {
  const scopeParam = scope === ALL_GAMES_SCOPE ? "all" : String(scope);
  const params = new URLSearchParams({
    scope: scopeParam,
    range: highlightRange,
  });

  const response = await fetch(`/api/dashboard/analytics?${params.toString()}`, {
    credentials: "same-origin",
  });

  const data = (await response.json()) as {
    payload?: DashboardAnalyticsPayload;
    error?: string;
  };

  if (!response.ok || !data.payload) {
    throw new Error(data.error ?? "讀取分析資料失敗");
  }

  return data.payload;
}

export type { DashboardAnalytics, DashboardHighlight };
