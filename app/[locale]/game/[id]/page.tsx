import { getPublicGameByRouteParam } from "@/lib/games-service";
import GamePageClient from "./game-page-client";

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

export default async function GamePage({ params }: Props) {
  const { id } = await params;
  let initialGame = null;

  try {
    initialGame = await getPublicGameByRouteParam(id);
  } catch {
    initialGame = null;
  }

  // key 強制依路由重掛，避免軟導航沿用上一款遊戲的 fullscreen／iframe 狀態
  return <GamePageClient key={id} initialGame={initialGame} />;
}
