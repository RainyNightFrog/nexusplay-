"use client";

import { useTranslations } from "next-intl";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { RevenueTrendPoint } from "@/lib/dashboard-revenue";
import { formatRevenueMoney } from "@/lib/dashboard-revenue";

type ChartTooltipProps = {
  active?: boolean;
  payload?: Array<{
    color?: string;
    name?: string;
    value?: number;
    dataKey?: string;
  }>;
  label?: string;
};

function RevenueTooltip({ active, payload, label }: ChartTooltipProps) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-xl border border-emerald-400/20 bg-zinc-900/95 px-4 py-3 shadow-2xl shadow-emerald-500/10 backdrop-blur-xl">
      <p className="mb-2 text-xs font-medium text-zinc-400">{label}</p>
      <div className="space-y-1.5">
        {payload.map((entry) => (
          <div
            key={entry.name}
            className="flex items-center justify-between gap-6 text-sm"
          >
            <span className="flex items-center gap-2 text-zinc-300">
              <span
                className="size-2 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              {entry.name}
            </span>
            <span className="font-semibold text-white">
              {entry.dataKey === "amount"
                ? formatRevenueMoney(entry.value ?? 0)
                : (entry.value ?? 0).toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

type RevenueChartProps = {
  data: RevenueTrendPoint[];
};

export function RevenueChart({ data }: RevenueChartProps) {
  const t = useTranslations("dashboard");

  return (
    <div className="h-[280px] w-full min-h-[280px]">
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <AreaChart
          data={data}
          margin={{ top: 12, right: 8, left: -8, bottom: 0 }}
        >
          <defs>
            <linearGradient id="revenueAmountGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#34d399" stopOpacity={0.45} />
              <stop offset="100%" stopColor="#34d399" stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="revenueTipsGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f472b6" stopOpacity={0.4} />
              <stop offset="100%" stopColor="#f472b6" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid
            stroke="rgba(255,255,255,0.06)"
            strokeDasharray="4 8"
            vertical={false}
          />
          <XAxis
            dataKey="date"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#71717a", fontSize: 12 }}
            dy={8}
          />
          <YAxis
            yAxisId="amount"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#71717a", fontSize: 11 }}
            width={48}
            tickFormatter={(value: number) => `$${value}`}
          />
          <YAxis
            yAxisId="tips"
            orientation="right"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#71717a", fontSize: 11 }}
            width={32}
          />
          <Tooltip content={<RevenueTooltip />} />
          <Area
            yAxisId="amount"
            type="monotone"
            dataKey="amount"
            name={t("revenueChartAmount")}
            stroke="#34d399"
            strokeWidth={2.5}
            fill="url(#revenueAmountGradient)"
            animationDuration={1400}
          />
          <Area
            yAxisId="tips"
            type="monotone"
            dataKey="tips"
            name={t("revenueChartTips")}
            stroke="#f472b6"
            strokeWidth={2}
            fill="url(#revenueTipsGradient)"
            animationDuration={1600}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
