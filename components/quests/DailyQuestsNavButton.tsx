"use client";

import { useCallback, useEffect, useState } from "react";
import { Target } from "lucide-react";
import { useTranslations } from "next-intl";
import { DailyQuestsModal } from "@/components/quests/DailyQuestsModal";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

export function DailyQuestsNavButton() {
  const t = useTranslations("quests");
  const { profile } = useAuth();
  const [open, setOpen] = useState(false);
  const [claimableCount, setClaimableCount] = useState(0);

  const refreshBadge = useCallback(async () => {
    if (!profile) {
      setClaimableCount(0);
      return;
    }
    try {
      const response = await fetch("/api/quests", { credentials: "same-origin" });
      if (!response.ok) return;
      const data = (await response.json()) as { claimableCount?: number };
      setClaimableCount(data.claimableCount ?? 0);
    } catch {
      /* ignore badge errors */
    }
  }, [profile]);

  useEffect(() => {
    void refreshBadge();
    if (!profile) return;
    const timer = window.setInterval(() => void refreshBadge(), 60_000);
    return () => window.clearInterval(timer);
  }, [profile, refreshBadge]);

  if (!profile) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "relative inline-flex items-center gap-1.5 rounded-full border border-cyan-400/30",
          "bg-cyan-500/10 px-2.5 py-1.5 text-xs font-medium text-cyan-100",
          "shadow-[0_0_16px_rgba(34,211,238,0.15)] transition hover:border-cyan-400/50 hover:bg-cyan-500/15",
          "md:px-3 md:text-sm"
        )}
        aria-label={t("navLabel")}
      >
        <Target className="size-3.5 text-cyan-300" />
        <span className="hidden sm:inline">{t("navLabel")}</span>
        <span className="sm:hidden">🎯</span>
        {claimableCount > 0 && (
          <span className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white">
            {claimableCount > 9 ? "9+" : claimableCount}
          </span>
        )}
      </button>
      <DailyQuestsModal
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) void refreshBadge();
        }}
      />
    </>
  );
}
