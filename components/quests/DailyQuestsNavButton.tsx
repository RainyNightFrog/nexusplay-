"use client";

import { useCallback, useState } from "react";
import { Target } from "lucide-react";
import { useTranslations } from "next-intl";
import { DailyQuestsModal } from "@/components/quests/DailyQuestsModal";
import { useAuth } from "@/hooks/use-auth";
import { useVisibleInterval } from "@/hooks/use-visible-interval";
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

  useVisibleInterval(
    () => {
      void refreshBadge();
    },
    profile ? 120_000 : null
  );

  if (!profile) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          void refreshBadge();
        }}
        className={cn(
          "relative inline-flex size-10 items-center justify-center rounded-full border border-cyan-400/30",
          "bg-cyan-500/10 text-cyan-100 touch-manipulation",
          "shadow-[0_0_12px_rgba(34,211,238,0.12)] transition hover:border-cyan-400/50 hover:bg-cyan-500/15",
          "md:size-9 xl:size-auto xl:gap-1.5 xl:px-3 xl:py-1.5 xl:text-sm"
        )}
        aria-label={t("navLabel")}
      >
        <Target className="size-3.5 text-cyan-300" />
        <span className="hidden xl:inline">{t("navLabel")}</span>
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
