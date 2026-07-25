"use client";

import { useCallback, useState } from "react";
import { Coins } from "lucide-react";
import { useTranslations } from "next-intl";
import { ApStoreModal } from "@/components/ap-store/ApStoreModal";
import { useAuth } from "@/hooks/use-auth";
import { useVisibleInterval } from "@/hooks/use-visible-interval";
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
      const response = await fetch("/api/ap/store", { credentials: "same-origin" });
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
          "relative inline-flex items-center gap-1 rounded-full border border-amber-400/35",
          "bg-amber-500/10 px-2 py-1.5 text-xs font-semibold text-amber-100",
          "shadow-[0_0_12px_rgba(251,191,36,0.15)] transition hover:border-amber-400/55 hover:bg-amber-500/15",
          "md:gap-1.5 md:px-3 md:text-sm md:shadow-[0_0_16px_rgba(251,191,36,0.2)]"
        )}
        aria-label={t("navLabel")}
      >
        <Coins className="size-3.5 text-amber-300" />
        <span className="tabular-nums">
          {balance == null ? "—" : balance}
          <span className="ml-0.5 hidden sm:inline">AP</span>
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
