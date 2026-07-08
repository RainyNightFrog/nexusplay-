import type { AnalyticsScope } from "@/lib/dashboard-analytics";
import { ALL_GAMES_SCOPE } from "@/lib/dashboard-analytics";
import type { RevenueTrendDays } from "@/lib/dashboard-revenue-server";
import type { DashboardRevenueAnalytics } from "@/lib/dashboard-revenue-types";

export async function fetchDashboardRevenue(
  scope: AnalyticsScope,
  trendDays: RevenueTrendDays = 14
): Promise<DashboardRevenueAnalytics> {
  const scopeParam =
    scope === ALL_GAMES_SCOPE ? "all" : String(scope);

  const response = await fetch(
    `/api/dashboard/revenue?scope=${encodeURIComponent(scopeParam)}&trendDays=${trendDays}`,
    { credentials: "same-origin" }
  );

  const payload = (await response.json()) as {
    revenue?: DashboardRevenueAnalytics;
    error?: string;
  };

  if (!response.ok || !payload.revenue) {
    throw new Error(payload.error ?? "讀取收益資料失敗");
  }

  return payload.revenue;
}
