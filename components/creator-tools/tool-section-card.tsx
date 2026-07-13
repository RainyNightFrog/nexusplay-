"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

type ToolSectionCardProps = {
  title: string;
  description?: string;
  icon?: ReactNode;
  badge?: ReactNode;
  children: ReactNode;
  className?: string;
  id?: string;
};

export function ToolSectionCard({
  title,
  description,
  icon,
  badge,
  children,
  className,
  id,
}: ToolSectionCardProps) {
  return (
    <motion.section
      id={id}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className={cn(
        "overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/55 shadow-xl shadow-black/30 backdrop-blur-sm",
        className
      )}
    >
      <div className="border-b border-white/8 bg-gradient-to-r from-cyan-500/5 via-transparent to-violet-500/5 px-5 py-4 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            {icon && (
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-cyan-300">
                {icon}
              </div>
            )}
            <div className="min-w-0 text-left">
              <h2 className="text-base font-semibold text-white sm:text-lg">{title}</h2>
              {description && (
                <p className="mt-1 text-sm leading-relaxed text-zinc-400">{description}</p>
              )}
            </div>
          </div>
          {badge}
        </div>
      </div>
      <div className="p-5 sm:p-6">{children}</div>
    </motion.section>
  );
}

export function ToolMetric({
  label,
  value,
  hint,
  accent = "cyan",
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: "cyan" | "violet" | "emerald" | "amber" | "rose";
}) {
  const accentClass = {
    cyan: "text-cyan-300",
    violet: "text-violet-300",
    emerald: "text-emerald-300",
    amber: "text-amber-300",
    rose: "text-rose-300",
  }[accent];

  return (
    <div className="rounded-xl border border-white/8 bg-zinc-950/50 px-4 py-3 text-center">
      <p className="text-[11px] font-medium tracking-wide text-zinc-500 uppercase">{label}</p>
      <p className={cn("mt-1 text-xl font-bold tabular-nums", accentClass)}>{value}</p>
      {hint && <p className="mt-1 text-xs text-zinc-500">{hint}</p>}
    </div>
  );
}

export function ToolProgressRing({
  percent,
  label,
  size = 88,
}: {
  percent: number;
  label: string;
  size?: number;
}) {
  const stroke = 6;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth={stroke}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="url(#toolProgressGradient)"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-all duration-500"
          />
          <defs>
            <linearGradient id="toolProgressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#22d3ee" />
              <stop offset="100%" stopColor="#a78bfa" />
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-bold text-white tabular-nums">{percent}%</span>
        </div>
      </div>
      <p className="text-xs text-zinc-400">{label}</p>
    </div>
  );
}
