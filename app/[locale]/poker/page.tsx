import { redirect } from "next/navigation";

/** 舊獨立分頁入口 → 虛擬遊戲詳情頁 */
export default function PokerPageRedirect() {
  redirect("/game/neon-holdem");
}
