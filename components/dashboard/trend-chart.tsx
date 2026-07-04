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

const TREND_DATA = [
  { date: "3/21", visitors: 820, plays: 540 },
  { date: "3/22", visitors: 940, plays: 610 },
  { date: "3/23", visitors: 880, plays: 580 },
  { date: "3/24", visitors: 1120, plays: 760 },
  { date: "3/25", visitors: 980, plays: 690 },
  { date: "3/26", visitors: 1340, plays: 910 },
  { date: "3/27", visitors: 1180, plays: 840 },
  { date: "3/28", visitors: 1520, plays: 1020 },
  { date: "3/29", visitors: 1410, plays: 980 },
  { date: "3/30", visitors: 1680, plays: 1140 },
  { date: "3/31", visitors: 1590, plays: 1090 },
  { date: "4/1", visitors: 1820, plays: 1260 },
  { date: "4/2", visitors: 1760, plays: 1210 },
  { date: "4/3", visitors: 1940, plays: 1380 },
];

type ChartTooltipProps = {
  active?: boolean;
  payload?: Array<{
    color?: string;
    name?: string;
    value?: number;
  }>;
  label?: string;
};

function TrendTooltip({ active, payload, label }: ChartTooltipProps) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-xl border border-white/10 bg-zinc-900/95 px-4 py-3 shadow-2xl shadow-black/40 backdrop-blur-xl">
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
              {entry.value?.toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function TrendChart() {
  const t = useTranslations("dashboard");

  return (
    <div className="h-[320px] w-full min-h-[320px]">
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <AreaChart
          data={TREND_DATA}
          margin={{ top: 12, right: 8, left: -12, bottom: 0 }}
        >
          <defs>
            <linearGradient id="visitorsGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.45} />
              <stop offset="100%" stopColor="#22d3ee" stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="playsGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#a78bfa" stopOpacity={0.42} />
              <stop offset="100%" stopColor="#a78bfa" stopOpacity={0.02} />
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
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#71717a", fontSize: 12 }}
            width={42}
          />
          <Tooltip content={<TrendTooltip />} />
          <Area
            type="monotone"
            dataKey="visitors"
            name={t("chartViews")}
            stroke="#22d3ee"
            strokeWidth={2.5}
            fill="url(#visitorsGradient)"
            animationDuration={1400}
            animationEasing="ease-out"
          />
          <Area
            type="monotone"
            dataKey="plays"
            name={t("chartPlays")}
            stroke="#a78bfa"
            strokeWidth={2.5}
            fill="url(#playsGradient)"
            animationDuration={1600}
            animationEasing="ease-out"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
