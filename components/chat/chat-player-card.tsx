"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import {
  Clock3,
  ExternalLink,
  Gamepad2,
  Globe,
  Loader2,
  MessageCircle,
  Trophy,
  UserRound,
  Wallet,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { UserBadge } from "@/components/UserBadge";
import { useChatPlayerProfile } from "@/hooks/use-chat-player-profile";
import type { ChatMessage } from "@/lib/chat";
import type { EquippedTitle } from "@/lib/titles";
import { getVirtualPlayerById } from "@/lib/virtual-players";
import {
  formatDonationAmount,
  formatDurationSeconds,
  type PlatformLeaderboardEntry,
} from "@/lib/platform-leaderboard";
import {
  isVirtualLeaderboardUserId,
  VIRTUAL_LEADERBOARD_USER_PREFIX,
} from "@/lib/platform-leaderboard-virtual";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

export type ChatPlayerPreview = {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  equippedTitle: EquippedTitle | null;
  isCreator: boolean;
  isVirtual: boolean;
  virtualPlayerId: string | null;
  isOwn: boolean;
};

export function chatMessageToPlayerPreview(
  message: ChatMessage
): ChatPlayerPreview {
  return {
    userId: message.user_id,
    displayName: message.author_name,
    avatarUrl: message.author_avatar_url,
    equippedTitle: message.author_equipped_title,
    isCreator: message.is_creator,
    isVirtual: message.is_virtual,
    virtualPlayerId: message.virtual_player_id,
    isOwn: message.is_own,
  };
}

export function parseVirtualLeaderboardUserId(userId: string): string | null {
  if (!isVirtualLeaderboardUserId(userId)) return null;
  const playerId = userId.slice(VIRTUAL_LEADERBOARD_USER_PREFIX.length);
  return playerId || null;
}

export function leaderboardEntryToPlayerPreview(
  entry: PlatformLeaderboardEntry
): ChatPlayerPreview {
  const virtualPlayerId = parseVirtualLeaderboardUserId(entry.userId);

  return {
    userId: entry.userId,
    displayName: entry.displayName,
    avatarUrl: entry.avatarUrl,
    equippedTitle: entry.equippedTitle,
    isCreator: false,
    isVirtual: Boolean(virtualPlayerId),
    virtualPlayerId,
    isOwn: entry.isMe ?? false,
  };
}

export function forumAuthorToPlayerPreview(
  name: string,
  userId: string,
  equippedTitle: EquippedTitle | null | undefined,
  options?: { isOwn?: boolean }
): ChatPlayerPreview {
  return {
    userId,
    displayName: name,
    avatarUrl: null,
    equippedTitle: equippedTitle ?? null,
    isCreator: false,
    isVirtual: false,
    virtualPlayerId: null,
    isOwn: options?.isOwn ?? false,
  };
}

const LOCALE_LABELS: Record<string, string> = {
  "zh-HK": "繁體粵語",
  "zh-CN": "簡體中文",
  en: "English",
};

function formatLastActive(value: string | null, locale: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) {
    return locale.startsWith("zh") ? "剛剛" : "Just now";
  }
  if (minutes < 60) {
    return locale.startsWith("zh") ? `${minutes} 分鐘前` : `${minutes}m ago`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return locale.startsWith("zh") ? `${hours} 小時前` : `${hours}h ago`;
  }

  const days = Math.floor(hours / 24);
  if (days < 7) {
    return locale.startsWith("zh") ? `${days} 天前` : `${days}d ago`;
  }

  return date.toLocaleString(locale, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function StatItem({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-white/8 bg-white/[0.03] px-3 py-2 text-center">
      <div className="mb-1 flex items-center justify-center gap-1.5 text-[11px] text-zinc-400 sm:text-xs">
        {icon}
        <span className="line-clamp-1">{label}</span>
      </div>
      <p className="text-sm font-semibold text-zinc-100 sm:text-base">{value}</p>
    </div>
  );
}

type ChatPlayerCardProps = {
  player: ChatPlayerPreview | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDirectMessage?: (virtualPlayerId: string) => void;
};

export function ChatPlayerCard({
  player,
  open,
  onOpenChange,
  onDirectMessage,
}: ChatPlayerCardProps) {
  const t = useTranslations("chat");
  const locale = useLocale();
  const { profile, loading, error } = useChatPlayerProfile(player, open);

  if (!player) return null;

  const displayName = player.isOwn ? t("you") : player.displayName;
  const virtualPlayer = player.virtualPlayerId
    ? getVirtualPlayerById(player.virtualPlayerId)
    : null;
  const detail = profile;
  const avatarUrl = detail?.avatarUrl ?? player.avatarUrl;
  const equippedTitle = player.equippedTitle ?? detail?.equippedTitle ?? null;
  const isCreator = detail?.isCreator ?? player.isCreator;
  const isVirtual = detail?.isVirtual ?? player.isVirtual;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        overlayClassName="z-[70]"
        className={cn(
          "z-[71] max-h-[min(82vh,720px)] w-[min(calc(100vw-1rem),40rem)] max-w-[calc(100vw-1rem)] overflow-y-auto",
          "border-white/10 bg-zinc-950 p-4 text-center text-base text-zinc-100 sm:max-w-2xl sm:p-5"
        )}
      >
        <DialogHeader className="items-center gap-1 text-center sm:pb-0">
          <DialogTitle className="text-lg font-bold sm:text-xl">
            {t("playerCardTitle")}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {displayName}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 sm:gap-4">
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center sm:gap-5">
            <div className="relative shrink-0">
              <div
                className={cn(
                  "relative size-20 overflow-hidden rounded-full ring-2",
                  isCreator
                    ? "ring-violet-400/40"
                    : isVirtual
                      ? "ring-cyan-400/30"
                      : "ring-white/10"
                )}
              >
                {avatarUrl ? (
                  <Image
                    src={avatarUrl}
                    alt={displayName}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="flex size-full items-center justify-center bg-white/8 text-2xl font-semibold text-zinc-300">
                    {displayName.slice(0, 1)}
                  </div>
                )}
              </div>
              {detail?.isOnline && (
                <span className="absolute bottom-0.5 right-0.5 size-3.5 rounded-full border-2 border-zinc-950 bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
              )}
            </div>

            <div className="flex min-w-0 flex-col items-center sm:items-start sm:text-left">
              <UserBadge
                username={displayName}
                title={equippedTitle}
                layout="stacked"
                className="sm:items-start"
                usernameClassName="text-lg font-semibold text-zinc-100 sm:text-xl"
                titleClassName="text-sm"
              />
              <div className="mt-2 flex flex-wrap items-center justify-center gap-1.5 sm:justify-start">
                {isCreator && (
                  <span className="rounded-full bg-violet-500/15 px-2 py-0.5 text-xs text-violet-300">
                    {t("creatorBadge")}
                  </span>
                )}
                {isVirtual ? (
                  <span className="rounded-full bg-cyan-500/15 px-2 py-0.5 text-xs text-cyan-300">
                    {t("playerCardVirtual")}
                  </span>
                ) : (
                  <span className="rounded-full bg-white/8 px-2 py-0.5 text-xs text-zinc-400">
                    {t("playerCardReal")}
                  </span>
                )}
              </div>
              {virtualPlayer && (
                <p className="mt-1.5 text-xs text-zinc-500 sm:text-sm">
                  {t("playerCardLocale")}：
                  {LOCALE_LABELS[virtualPlayer.locale] ?? virtualPlayer.locale}
                </p>
              )}
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-6 text-sm text-zinc-500">
              <Loader2 className="mr-2 size-4 animate-spin" />
              {t("loading")}
            </div>
          ) : error ? (
            <p className="py-4 text-center text-sm text-rose-300 sm:text-base">{error}</p>
          ) : detail ? (
            <>
              {detail.website && (
                <a
                  href={detail.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 rounded-lg border border-cyan-500/20 bg-cyan-500/10 px-3 py-2 text-sm text-cyan-200 transition-colors hover:bg-cyan-500/15 sm:text-base"
                >
                  <Globe className="size-4 shrink-0" />
                  <span className="truncate">{detail.website}</span>
                  <ExternalLink className="size-3.5 shrink-0 opacity-70" />
                </a>
              )}

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                <StatItem
                  icon={<Clock3 className="size-3.5 shrink-0" />}
                  label={t("playerCardOnlineTime")}
                  value={formatDurationSeconds(detail.onlineSeconds, locale)}
                />
                <StatItem
                  icon={<Gamepad2 className="size-3.5 shrink-0" />}
                  label={t("playerCardPlayTime")}
                  value={formatDurationSeconds(detail.playSeconds, locale)}
                />
                <StatItem
                  icon={<Clock3 className="size-3.5 shrink-0" />}
                  label={t("playerCardLastActive")}
                  value={formatLastActive(detail.lastActiveAt, locale)}
                />
                <StatItem
                  icon={<Trophy className="size-3.5 shrink-0" />}
                  label={t("playerCardAchievements")}
                  value={t("playerCardAchievementCount", {
                    count: detail.achievementCount,
                  })}
                />
                <StatItem
                  icon={<MessageCircle className="size-3.5 shrink-0" />}
                  label={t("playerCardForumPosts")}
                  value={String(detail.forumPostCount)}
                />
                <StatItem
                  icon={<Wallet className="size-3.5 shrink-0" />}
                  label={t("playerCardDonated")}
                  value={formatDonationAmount(detail.donatedTotal, locale)}
                />
                {detail.isCreator && (
                  <StatItem
                    icon={<Wallet className="size-3.5 shrink-0" />}
                    label={t("playerCardTipsReceived")}
                    value={String(detail.tipsReceivedCount)}
                  />
                )}
                {detail.isCreator && (
                  <StatItem
                    icon={<Gamepad2 className="size-3.5 shrink-0" />}
                    label={t("playerCardPublishedGames")}
                    value={String(detail.publishedGames)}
                  />
                )}
              </div>

              {detail.achievementHighlights.length > 0 && (
                <div className="rounded-lg border border-white/8 bg-white/[0.02] px-3 py-2.5 text-center">
                  <p className="mb-2 text-xs font-medium text-zinc-400 sm:text-sm">
                    {t("playerCardRecentAchievements")}
                  </p>
                  <div className="flex flex-wrap justify-center gap-1.5">
                    {detail.achievementHighlights.map((item) => (
                      <span
                        key={item.id}
                        className="inline-flex items-center gap-1 rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-xs text-amber-100 sm:text-sm"
                      >
                        <span>{item.badge_icon}</span>
                        <span>{item.title}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : null}

          <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-center">
            {isVirtual && player.virtualPlayerId && onDirectMessage && (
              <Button
                type="button"
                className="h-10 flex-1 gap-2 text-sm bg-gradient-to-r from-cyan-600 to-violet-600 text-white hover:from-cyan-500 hover:to-violet-500 sm:max-w-xs"
                onClick={() => {
                  onOpenChange(false);
                  onDirectMessage(player.virtualPlayerId!);
                }}
              >
                <MessageCircle className="size-4" />
                {t("playerCardDm")}
              </Button>
            )}

            {player.isOwn && (
              <Button
                nativeButton={false}
                variant="outline"
                className="h-10 flex-1 gap-2 border-white/10 bg-white/5 text-sm text-zinc-200 hover:bg-white/10 sm:max-w-xs"
                render={<Link href="/profile" />}
                onClick={() => onOpenChange(false)}
              >
                <UserRound className="size-4" />
                {t("playerCardViewProfile")}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
