"use client";

import { useCallback, useEffect, useState } from "react";
import { Crown, Loader2, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { UserBadge } from "@/components/UserBadge";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import type { EquippedTitle } from "@/lib/titles";

type Supporter = {
  payerId?: string | null;
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

const RANK_STYLES = [
  {
    mark: "I",
    row: "border-amber-400/40 bg-gradient-to-b from-amber-500/18 to-amber-500/[0.04]",
    amount: "border-amber-400/45 bg-amber-500/20 text-amber-100",
  },
  {
    mark: "II",
    row: "border-zinc-300/30 bg-gradient-to-b from-zinc-100/12 to-zinc-100/[0.03]",
    amount: "border-zinc-300/40 bg-zinc-100/10 text-zinc-100",
  },
  {
    mark: "III",
    row: "border-orange-400/35 bg-gradient-to-b from-orange-500/14 to-orange-500/[0.04]",
    amount: "border-orange-400/40 bg-orange-500/15 text-orange-100",
  },
] as const;

function RankMark({ index }: { index: number }) {
  if (index === 0) {
    return (
      <span
        className="flex size-7 items-center justify-center rounded-full border border-amber-400/45 bg-amber-500/20 text-amber-200 shadow-[0_0_16px_rgba(251,191,36,0.22)]"
        aria-hidden
      >
        <Crown className="size-3.5" />
      </span>
    );
  }

  const style = RANK_STYLES[index];
  if (!style) {
    return (
      <span
        className="flex size-7 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] font-serif text-[11px] tracking-wide text-zinc-500"
        aria-hidden
      >
        {index + 1}
      </span>
    );
  }

  return (
    <span
      className={cn(
        "flex size-7 items-center justify-center rounded-full border font-serif text-[10px] tracking-[0.12em]",
        style.amount
      )}
      aria-hidden
    >
      {style.mark}
    </span>
  );
}

export function SupporterWall({
  gameId,
  tipsEnabled = false,
  refreshKey = 0,
  embedded = false,
  className,
}: SupporterWallProps) {
  const t = useTranslations("game");
  const tChat = useTranslations("chat");
  const { profile } = useAuth();
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
          <Loader2 className="size-4 animate-spin text-amber-300/80" />
        </div>
      );
    }
    return (
      <div
        className={cn(
          "flex items-center justify-center rounded-2xl border border-amber-400/15 bg-zinc-950/40 p-6",
          className
        )}
      >
        <Loader2 className="size-5 animate-spin text-amber-300/80" />
      </div>
    );
  }

  const wallHeader = (
    <div className="text-center">
      <div className="mx-auto mb-2 flex h-px w-16 items-center justify-center bg-gradient-to-r from-transparent via-amber-300/70 to-transparent">
        <Sparkles className="size-3.5 shrink-0 text-amber-300/90" />
      </div>
      <div className="flex items-center justify-center gap-2">
        <Crown className="size-3.5 text-amber-300" />
        <h3 className="font-serif text-sm tracking-[0.18em] text-amber-50">
          {t("supporterWallTitle")}
        </h3>
      </div>
      <p className="mx-auto mt-2 max-w-sm text-[11px] leading-relaxed text-zinc-500">
        {t("supporterWallDesc")}
      </p>
    </div>
  );

  const wallList =
    supporters.length === 0 ? (
      <p className="mt-5 text-center text-xs text-zinc-600">
        {t("supporterWallEmpty")}
      </p>
    ) : (
      <ul className="mx-auto mt-5 flex max-w-sm flex-col items-stretch gap-2">
        {supporters.map((supporter, index) => {
          const rank = RANK_STYLES[index];
          const isAnonymous =
            supporter.anonymous || supporter.displayName === "__anonymous__";
          const isMe =
            Boolean(profile?.id) &&
            Boolean(supporter.payerId) &&
            profile?.id === supporter.payerId;
          const displayName = isAnonymous
            ? t("anonymousSupporter")
            : isMe && profile?.display_name?.trim()
              ? profile.display_name.trim()
              : supporter.displayName;

          return (
            <li
              key={`${supporter.createdAt}-${index}`}
              className={cn(
                "flex flex-col items-center gap-1.5 rounded-xl border px-4 py-3 text-center",
                rank?.row ??
                  "border-white/[0.06] bg-white/[0.02] hover:border-amber-400/20 hover:bg-amber-500/[0.04]",
                isMe && "ring-1 ring-amber-300/35"
              )}
            >
              <RankMark index={index} />

              <div className="flex max-w-full flex-col items-center gap-1">
                {isAnonymous ? (
                  <span className="text-[13px] text-zinc-400">{displayName}</span>
                ) : (
                  <UserBadge
                    username={displayName}
                    title={supporter.equippedTitle}
                    layout="stacked"
                    animateTitle={false}
                    className="items-center"
                    usernameClassName={cn(
                      "max-w-[14rem] truncate text-center text-[14px] font-medium tracking-wide",
                      index === 0 || isMe ? "text-amber-50" : "text-zinc-100"
                    )}
                    titleClassName="text-[9px] text-amber-200/75"
                  />
                )}
                {isMe && (
                  <span className="rounded-full border border-amber-400/35 bg-amber-500/15 px-2 py-px text-[10px] tracking-wide text-amber-100">
                    {tChat("you")}
                  </span>
                )}
              </div>

              <span
                className={cn(
                  "rounded-md border px-2.5 py-0.5 font-serif text-[13px] tracking-wide tabular-nums",
                  rank?.amount ??
                    "border-white/10 bg-white/[0.03] text-zinc-300"
                )}
              >
                ${supporter.amountUsd.toFixed(2)}
              </span>
            </li>
          );
        })}
      </ul>
    );

  if (embedded) {
    return (
      <div className={cn("text-center", className)}>
        {wallHeader}
        {wallList}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-2xl border border-amber-400/20 bg-gradient-to-b from-amber-500/[0.06] to-zinc-950/40 p-4 text-center shadow-[inset_0_1px_0_rgba(251,191,36,0.12)]",
        className
      )}
    >
      {wallHeader}
      {wallList}
    </div>
  );
}
