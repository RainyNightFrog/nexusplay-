"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Heart, Loader2 } from "lucide-react";
import { Link, useRouter } from "@/i18n/navigation";
import { AccountSettingsPageHeader } from "@/components/settings/account-settings-layout";
import { accountCardClassName } from "@/components/settings/account-shell";
import { Badge } from "@/components/ui/badge";
import type { Game } from "@/lib/games";
import { cn } from "@/lib/utils";

export default function FavoritesSettingsPage() {
  const t = useTranslations("accountSettings");
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [games, setGames] = useState<Game[]>([]);

  useEffect(() => {
    fetch("/api/auth/favorites")
      .then(async (response) => {
        if (response.status === 401) {
          router.replace("/auth?redirect=/settings/favorites");
          return null;
        }
        return response.json();
      })
      .then((data: { games?: Game[] } | null) => {
        if (data) setGames(data.games ?? []);
      })
      .finally(() => setLoading(false));
  }, [router]);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-rose-400" />
      </div>
    );
  }

  return (
    <>
      <AccountSettingsPageHeader
        title={t("favoritesTitle")}
        description={t("favoritesDesc")}
      />

      <div className={accountCardClassName}>
        {games.length === 0 ? (
          <div className="py-12 text-center">
            <Heart className="mx-auto size-10 text-zinc-600" />
            <p className="mt-4 text-sm text-zinc-500">{t("favoritesEmpty")}</p>
            <Link
              href="/"
              className="mt-4 inline-block text-sm text-violet-400 hover:underline"
            >
              {t("favoritesBrowse")}
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {games.map((game) => (
              <Link
                key={game.id}
                href={`/game/${game.id}`}
                className={cn(
                  "overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/40",
                  "transition hover:border-rose-400/30 hover:shadow-lg hover:shadow-rose-500/10"
                )}
              >
                <div className="relative aspect-video">
                  <Image
                    src={game.image}
                    alt={game.title}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 50vw"
                  />
                </div>
                <div className="p-4 text-left">
                  <h3 className="font-semibold text-white">{game.title}</h3>
                  <p className="mt-1 line-clamp-2 text-xs text-zinc-500">
                    {game.description}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge className="border-0 bg-white/10 text-zinc-300">
                      {game.genre}
                    </Badge>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
