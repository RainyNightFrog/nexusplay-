"use client";

import { PokerLobby } from "@/components/poker/PokerLobby";
import { PokerTable } from "@/components/poker/PokerTable";
import { usePokerStore } from "@/stores/poker-store";

export function PokerPageClient() {
  const status = usePokerStore((s) => s.status);

  return (
    <div className="mx-auto max-w-6xl space-y-10 px-4 py-10">
      <PokerLobby />
      {(status === "in_table" || status === "connected") && <PokerTable />}
    </div>
  );
}
