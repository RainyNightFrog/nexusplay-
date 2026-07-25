import { getPublicGameByRouteParam } from "@/lib/games-service";
import ForumPageClient from "./forum-page-client";

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

export default async function GameForumPage({ params }: Props) {
  const { id } = await params;
  let initialGame = null;

  try {
    initialGame = await getPublicGameByRouteParam(id);
  } catch {
    initialGame = null;
  }

  return <ForumPageClient routeId={id} initialGame={initialGame} />;
}
