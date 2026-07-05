"use client";

import { useEffect, useState } from "react";
import { Heart } from "lucide-react";
import { useTranslations } from "next-intl";

type Supporter = {
  displayName: string;
  amountUsd: number;
  createdAt: string;
  anonymous?: boolean;
};

type SupporterWallProps = {
  gameId: number;
  className?: string;
};

export function SupporterWall({ gameId, className }: SupporterWallProps) {
  const t = useTranslations("game");
  const [supporters, setSupporters] = useState<Supporter[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/games/${gameId}/supporters`)
      .then((response) => response.json())
      .then((data: { supporters?: Supporter[] }) => {
        setSupporters(data.supporters ?? []);
      })
      .finally(() => setLoading(false));
  }, [gameId]);

  if (loading || supporters.length === 0) {
    return null;
  }

  return (
    <div className={className}>
      <div className="mb-3 flex items-center gap-2">
        <Heart className="size-4 text-fuchsia-400" />
        <h3 className="text-sm font-semibold text-fuchsia-100">
          {t("supporterWallTitle")}
        </h3>
      </div>
      <ul className="space-y-2">
        {supporters.map((supporter, index) => (
          <li
            key={`${supporter.createdAt}-${index}`}
            className="flex items-center justify-between rounded-xl border border-white/8 bg-zinc-950/40 px-3 py-2 text-xs"
          >
            <span className="truncate text-zinc-300">
              {supporter.anonymous || supporter.displayName === "__anonymous__"
                ? t("anonymousSupporter")
                : supporter.displayName}
            </span>
            <span className="font-mono text-fuchsia-200">
              ${supporter.amountUsd.toFixed(2)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
