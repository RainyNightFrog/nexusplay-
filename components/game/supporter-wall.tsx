"use client";

import { useCallback, useEffect, useState } from "react";
import { Heart, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { UserBadge } from "@/components/UserBadge";
import { cn } from "@/lib/utils";
import type { EquippedTitle } from "@/lib/titles";

type Supporter = {
  displayName: string;
  amountUsd: number;
  createdAt: string;
  anonymous?: boolean;
  equippedTitle?: EquippedTitle | null;
};

type SupporterWallProps = {
  gameId: number;
  tipsEnabled?: boolean;
  refreshKey?: number;
  /** 嵌入合併區塊時不渲染外層卡片 */
  embedded?: boolean;
  className?: string;
};

export function SupporterWall({
  gameId,
  tipsEnabled = false,
  refreshKey = 0,
  embedded = false,
  className,
}: SupporterWallProps) {
  const t = useTranslations("game");
  const [supporters, setSupporters] = useState<Supporter[]>([]);
  const [loading, setLoading] = useState(true);

  const loadSupporters = useCallback(() => {
    setLoading(true);
    fetch(`/api/games/${gameId}/supporters`)
      .then((response) => response.json())
      .then((data: { supporters?: Supporter[] }) => {
        setSupporters(data.supporters ?? []);
      })
      .catch(() => setSupporters([]))
      .finally(() => setLoading(false));
  }, [gameId]);

  useEffect(() => {
    if (!tipsEnabled) {
      setLoading(false);
      setSupporters([]);
      return;
    }
    loadSupporters();
  }, [gameId, tipsEnabled, refreshKey, loadSupporters]);

  if (!tipsEnabled) {
    return null;
  }

  if (loading) {
    if (embedded) {
      return (
        <div className={cn("flex justify-center py-4", className)}>
          <Loader2 className="size-4 animate-spin text-fuchsia-400" />
        </div>
      );
    }
    return (
      <div
        className={cn(
          "flex items-center justify-center rounded-2xl border border-white/8 bg-zinc-950/30 p-6",
          className
        )}
      >
        <Loader2 className="size-5 animate-spin text-fuchsia-400" />
      </div>
    );
  }

  const wallHeader = (
    <div className="text-center">
      <div className="flex items-center justify-center gap-2">
        <Heart className="size-4 text-fuchsia-400" />
        <h3
          className={cn(
            "font-semibold text-fuchsia-100",
            embedded ? "text-sm" : "text-sm"
          )}
        >
          {t("supporterWallTitle")}
        </h3>
      </div>
      <p className="mt-1.5 text-xs leading-relaxed text-zinc-500">
        {t("supporterWallDesc")}
      </p>
    </div>
  );

  const wallList =
    supporters.length === 0 ? (
      <p className="mt-4 text-center text-xs text-zinc-600">
        {t("supporterWallEmpty")}
      </p>
    ) : (
      <ul className={cn("space-y-2", embedded ? "mt-4" : "mt-4")}>
        {supporters.map((supporter, index) => (
          <li
            key={`${supporter.createdAt}-${index}`}
            className="flex items-center justify-between rounded-xl border border-white/8 bg-zinc-950/40 px-3 py-2 text-xs"
          >
            <span className="min-w-0 truncate text-zinc-300">
              {supporter.anonymous || supporter.displayName === "__anonymous__" ? (
                t("anonymousSupporter")
              ) : (
                <UserBadge
                  username={supporter.displayName}
                  title={supporter.equippedTitle}
                  layout="compact"
                  animateTitle={false}
                  usernameClassName="text-zinc-300"
                  titleClassName="text-[8px]"
                />
              )}
            </span>
            <span className="font-mono text-fuchsia-200">
              ${supporter.amountUsd.toFixed(2)}
            </span>
          </li>
        ))}
      </ul>
    );

  if (embedded) {
    return (
      <div className={className}>
        {wallHeader}
        {wallList}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-2xl border border-fuchsia-400/15 bg-fuchsia-500/[0.03] p-4",
        className
      )}
    >
      {wallHeader}
      {wallList}
    </div>
  );
}
