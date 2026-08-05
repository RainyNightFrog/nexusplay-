import type { Metadata } from "next";
import { Link } from "@/i18n/navigation";
import { SiteHeader } from "@/components/layout/site-header";
import { PokerPageClient } from "@/components/poker/PokerPageClient";

export const metadata: Metadata = {
  title: "Neon Hold'em",
  description: "虛擬積分德州撲克 — 24/7 混人機牌桌",
};

export default function PokerPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <SiteHeader>
        <nav className="flex items-center gap-3 text-sm">
          <Link href="/" className="text-slate-400 hover:text-cyan-200">
            首頁
          </Link>
          <span className="text-cyan-300">Neon Hold&apos;em</span>
        </nav>
      </SiteHeader>
      <PokerPageClient />
    </div>
  );
}
