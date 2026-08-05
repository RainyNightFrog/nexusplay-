"use client";

import { useEffect, useRef } from "react";
import { PokerLobby } from "@/components/poker/PokerLobby";
import { PokerTable } from "@/components/poker/PokerTable";
import { PokerLeaveConfirm } from "@/components/poker/PokerLeaveConfirm";
import { usePokerStore } from "@/stores/poker-store";
import { usePokerSocket } from "@/hooks/use-poker-socket";
import { cn } from "@/lib/utils";

type PokerPageClientProps = {
  /** 嵌入遊戲詳情頁舞台時收緊留白 */
  embedded?: boolean;
};

export function PokerPageClient({ embedded = false }: PokerPageClientProps) {
  /* 頁面級持有 Socket，大廳↔牌桌切換不斷線 */
  usePokerSocket();
  const status = usePokerStore((s) => s.status);
  const roomId = usePokerStore((s) => s.roomId);
  const inTable = status === "in_table" && Boolean(roomId);
  const tableRef = useRef<HTMLDivElement>(null);
  const scrollRootRef = useRef<HTMLDivElement>(null);

  /* 入桌後自動捲到牌桌／切換視圖 */
  useEffect(() => {
    if (!inTable) return;
    const t = window.setTimeout(() => {
      tableRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      scrollRootRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    }, 80);
    return () => window.clearTimeout(t);
  }, [inTable, roomId]);

  return (
    <PokerLeaveConfirm>
      <div
        ref={scrollRootRef}
        className={cn(
          "relative",
          embedded
            ? "flex h-full min-h-0 flex-col overflow-auto px-2 py-3 sm:px-4"
            : "mx-auto flex min-h-[70vh] max-w-5xl flex-col px-3 py-8 sm:px-4"
        )}
      >
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(251,191,36,0.18),transparent_55%),radial-gradient(ellipse_at_80%_60%,rgba(245,158,11,0.1),transparent_45%)]"
          aria-hidden
        />

        <div className="relative z-10 flex w-full flex-1 flex-col items-center">
          {inTable ? (
            <div ref={tableRef} className="w-full max-w-[920px] scroll-mt-2">
              <PokerTable />
            </div>
          ) : (
            <PokerLobby />
          )}
        </div>
      </div>
    </PokerLeaveConfirm>
  );
}
