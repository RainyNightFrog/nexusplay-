"use client";

import { useCallback, useEffect, useState } from "react";
import { Coins } from "lucide-react";
import { useTranslations } from "next-intl";
import { ApStoreModal } from "@/components/ap-store/ApStoreModal";
import { useAuth } from "@/hooks/use-auth";
import { useVisibleInterval } from "@/hooks/use-visible-interval";
import { REFRESH_AP_BALANCE_EVENT } from "@/lib/refresh-ap-balance";
import { cn } from "@/lib/utils";

export function ApStoreNavButton() {
  const t = useTranslations("apStore");
  const { profile } = useAuth();
  const [open, setOpen] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);

  const refreshBalance = useCallback(async () => {
    if (!profile) {
      setBalance(null);
      return;
    }
    try {
      const response = await fetch("/api/ap/store", {
        credentials: "same-origin",
      });
      if (!response.ok) return;
      const data = (await response.json()) as { balance?: number };
      if (typeof data.balance === "number") setBalance(data.balance);
    } catch {
      /* ignore */
    }
  }, [profile]);

  useVisibleInterval(
    () => {
      void refreshBalance();
    },
    profile ? 180_000 : null
  );

  useEffect(() => {
    if (!profile) return;
    function onRefreshRequest() {
      void refreshBalance();
    }
    window.addEventListener(REFRESH_AP_BALANCE_EVENT, onRefreshRequest);
    return () => {
      window.removeEventListener(REFRESH_AP_BALANCE_EVENT, onRefreshRequest);
    };
  }, [profile, refreshBalance]);

  if (!profile) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          void refreshBalance();
        }}
        className={cn(
          "relative inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-amber-400/35",
          "bg-amber-500/10 text-xs font-semibold text-amber-100 touch-manipulation",
          "shadow-[0_0_12px_rgba(251,191,36,0.15)] transition hover:border-amber-400/55 hover:bg-amber-500/15",
          "md:size-auto md:min-h-0 md:gap-1.5 md:px-3 md:py-1.5 md:text-sm md:shadow-[0_0_16px_rgba(251,191,36,0.2)]"
        )}
        aria-label={t("navLabel")}
      >
        <Coins className="size-3.5 text-amber-300" />
        <span className="hidden tabular-nums md:inline">
          {balance == null ? "—" : balance}
          <span className="ml-0.5">AP</span>
        </span>
        <span className="absolute -right-1 -top-1 flex min-w-[18px] items-center justify-center rounded-full bg-amber-400 px-1 text-[10px] font-bold leading-none text-zinc-950 md:hidden">
          {balance == null ? "—" : balance > 99 ? "99+" : balance}
        </span>
      </button>
      <ApStoreModal
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) void refreshBalance();
        }}
      />
    </>
  );
}
