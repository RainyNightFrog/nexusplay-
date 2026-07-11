"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { GameCard, GameCardSkeleton } from "@/components/home/game-card";
import type { Game } from "@/lib/games";

/** 將 plays_count（Game.players）最高的遊戲排到最前，作為列表首卡 */
export function orderGamesForBento(games: Game[]): Game[] {
  if (games.length <= 1) return games;

  let heroIndex = 0;
  let maxPlayers = games[0]?.players ?? 0;

  for (let index = 1; index < games.length; index += 1) {
    const players = games[index]?.players ?? 0;
    if (players > maxPlayers) {
      maxPlayers = players;
      heroIndex = index;
    }
  }

  const hero = games[heroIndex];
  const rest = games.filter((_, index) => index !== heroIndex);
  return [hero, ...rest];
}

type BentoGameGridProps = {
  games: Game[];
  favoriteCounts: Record<number, number>;
  favoritedIds: Set<number>;
  favoriteBusyId: number | null;
  onFavoriteClick: (gameId: number) => void;
};

export function BentoGameGrid({
  games,
  favoriteCounts,
  favoritedIds,
  favoriteBusyId,
  onFavoriteClick,
}: BentoGameGridProps) {
  const orderedGames = useMemo(() => orderGamesForBento(games), [games]);

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {orderedGames.map((game, index) => (
        <motion.div
          key={game.id}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: index * 0.04 }}
        >
          <GameCard
            game={game}
            index={index}
            hotPick={index === 0}
            favoriteCount={favoriteCounts[game.id]}
            favorited={favoritedIds.has(game.id)}
            favoriteBusy={favoriteBusyId === game.id}
            onFavoriteClick={() => onFavoriteClick(game.id)}
          />
        </motion.div>
      ))}
    </div>
  );
}

export function BentoGameGridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 8 }).map((_, index) => (
        <GameCardSkeleton key={index} />
      ))}
    </div>
  );
}
