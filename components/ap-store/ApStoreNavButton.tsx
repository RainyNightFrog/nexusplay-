"use client";

import { useCallback, useEffect, useState } from "react";
import { Coins } from "lucide-react";
import { useTranslations } from "next-intl";
import { ApStoreModal } from "@/components/ap-store/ApStoreModal";
import { useAuth } from "@/hooks/use-auth";
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

  useEffect(() => {
    void refreshBalance();
    if (!profile) return;
    const timer = window.setInterval(() => void refreshBalance(), 90_000);
    return () => window.clearInterval(timer);
  }, [profile, refreshBalance]);

  if (!profile) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "relative inline-flex items-center gap-1.5 rounded-full border border-amber-400/35",
          "bg-amber-500/10 px-2.5 py-1.5 text-xs font-semibold text-amber-100",
          "shadow-[0_0_16px_rgba(251,191,36,0.2)] transition hover:border-amber-400/55 hover:bg-amber-500/15",
          "md:px-3 md:text-sm"
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
