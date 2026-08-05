"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "@/i18n/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { usePokerStore } from "@/stores/poker-store";
import { usePokerSocket, forcePokerSettleLeave } from "@/hooks/use-poker-socket";
import { cn } from "@/lib/utils";

type LeaveContextValue = {
  /** 彈出確認；確認後兌現離桌。可選 afterLeave 於成功後執行（例如導頁） */
  requestCashOutLeave: (afterLeave?: () => void) => void;
};

const PokerLeaveContext = createContext<LeaveContextValue | null>(null);

export function usePokerLeaveGuard(): LeaveContextValue {
  const ctx = useContext(PokerLeaveContext);
  if (!ctx) {
    throw new Error("usePokerLeaveGuard 必須在 PokerLeaveConfirm 內使用");
  }
  return ctx;
}

/** 可選：不在 Provider 內時回傳 null（例如僅測牌桌） */
export function usePokerLeaveGuardOptional(): LeaveContextValue | null {
  return useContext(PokerLeaveContext);
}

export function PokerLeaveConfirm({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { leaveTable } = usePokerSocket();
  const status = usePokerStore((s) => s.status);
  const roomId = usePokerStore((s) => s.roomId);
  const seatId = usePokerStore((s) => s.seatId);
  const table = usePokerStore((s) => s.table);
  const inTable = status === "in_table" && Boolean(roomId);

  const you = table?.seats.find((s) => s.seatId === seatId);
  const stack = you?.stack ?? 0;

  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const afterLeaveRef = useRef<(() => void) | null>(null);
  const leavingRef = useRef(false);

  const closeDialog = useCallback(() => {
    if (busy) return;
    setOpen(false);
    afterLeaveRef.current = null;
  }, [busy]);

  const requestCashOutLeave = useCallback(
    (afterLeave?: () => void) => {
      if (!inTable || leavingRef.current) {
        afterLeave?.();
        return;
      }
      afterLeaveRef.current = afterLeave ?? null;
      setOpen(true);
    },
    [inTable],
  );

  const confirmLeave = useCallback(async () => {
    if (leavingRef.current) return;
    leavingRef.current = true;
    setBusy(true);
    try {
      const result = await leaveTable();
      setOpen(false);
      const next = afterLeaveRef.current;
      afterLeaveRef.current = null;
      if (result.ok) {
        next?.();
      }
    } finally {
      setBusy(false);
      leavingRef.current = false;
    }
  }, [leaveTable]);

  /* 關閉分頁／重新整理：先送結算，再顯示瀏覽器原生提示 */
  useEffect(() => {
    if (!inTable) return;
    const flush = () => {
      void forcePokerSettleLeave(2000);
    };
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      flush();
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("pagehide", flush);
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      window.removeEventListener("pagehide", flush);
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, [inTable]);

  /* 攔截站內連結點擊（含遊戲頁返回首頁等） */
  useEffect(() => {
    if (!inTable) return;

    const onClickCapture = (e: MouseEvent) => {
      if (e.defaultPrevented) return;
      if (e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      const el = (e.target as HTMLElement | null)?.closest?.(
        "a[href]",
      ) as HTMLAnchorElement | null;
      if (!el) return;
      if (el.target === "_blank" || el.hasAttribute("download")) return;

      const href = el.getAttribute("href");
      if (!href || href.startsWith("#")) return;

      let url: URL;
      try {
        url = new URL(href, window.location.href);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return;
      if (
        url.pathname === window.location.pathname &&
        url.search === window.location.search
      ) {
        return;
      }

      e.preventDefault();
      e.stopPropagation();
      const path = `${url.pathname}${url.search}${url.hash}`;
      requestCashOutLeave(() => {
        router.push(path);
      });
    };

    document.addEventListener("click", onClickCapture, true);
    return () => document.removeEventListener("click", onClickCapture, true);
  }, [inTable, requestCashOutLeave, router]);

  /* 攔截瀏覽器上一頁 */
  useEffect(() => {
    if (!inTable) return;

    const sentinel = { pokerLeaveGuard: true as const };
    history.pushState(sentinel, "", window.location.href);

    const onPopState = () => {
      if (leavingRef.current) return;
      history.pushState(sentinel, "", window.location.href);
      requestCashOutLeave(() => {
        history.go(-2);
      });
    };

    window.addEventListener("popstate", onPopState);
    return () => {
      window.removeEventListener("popstate", onPopState);
    };
  }, [inTable, requestCashOutLeave]);

  return (
    <PokerLeaveContext.Provider value={{ requestCashOutLeave }}>
      {children}

      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!next) closeDialog();
        }}
      >
        <DialogContent
          showCloseButton={!busy}
          className="border-amber-400/40 bg-gradient-to-b from-amber-950 to-zinc-950 text-amber-50 sm:max-w-md"
          overlayClassName="bg-black/70 supports-backdrop-filter:backdrop-blur-sm"
        >
          <DialogHeader className="text-center sm:text-center">
            <DialogTitle className="text-lg text-yellow-100">
              是否即時結算並離開？
            </DialogTitle>
            <DialogDescription className="text-amber-100/75">
              確認後會立刻把桌上剩餘籌碼兌現回平台積分。關閉遊戲／離開頁面也會自動結算，避免之後誤退積分。
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-xl border border-amber-400/35 bg-black/40 px-4 py-3 text-center">
            <div className="text-[11px] tracking-wide text-amber-200/55">
              目前桌上籌碼（將兌現）
            </div>
            <div className="mt-1 text-2xl font-black tabular-nums text-yellow-200">
              {stack.toLocaleString()}
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-amber-100/55">
              離開＝即時結算。籌碼會加回你的積分，不是「不會變更」。
            </p>
          </div>

          <DialogFooter className="gap-2 border-amber-800/40 bg-transparent sm:justify-center">
            <button
              type="button"
              disabled={busy}
              onClick={closeDialog}
              className={cn(
                "min-h-11 rounded-xl border border-amber-600/45 bg-black/40 px-4 py-2.5 text-sm font-semibold text-amber-100",
                "hover:bg-amber-900/30 disabled:opacity-40",
              )}
            >
              繼續打牌
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void confirmLeave()}
              className={cn(
                "min-h-11 rounded-xl border border-yellow-300/60 bg-gradient-to-r from-yellow-500/40 to-amber-600/45 px-4 py-2.5 text-sm font-bold text-yellow-50",
                "hover:from-yellow-400/50 hover:to-amber-500/55 disabled:opacity-40",
              )}
            >
              {busy ? "結算中…" : "確認兌現離開"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PokerLeaveContext.Provider>
  );
}
