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

  return <GamePageClient initialGame={initialGame} />;
}
