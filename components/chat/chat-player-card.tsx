"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import {
  CalendarDays,
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
import { ProfileShowcaseTags } from "@/components/profile/profile-showcase-tags";
import { UserBadge } from "@/components/UserBadge";
import { useChatPlayerProfile } from "@/hooks/use-chat-player-profile";
import type { ChatMessage } from "@/lib/chat";
import type { EquippedTitle } from "@/lib/titles";
import { formatCountryName } from "@/lib/request-geo";
import { normalizeWebsite } from "@/lib/profile-settings";
import {
  formatDonationAmountFromHkd,
  formatDonationTierLabel,
  formatDurationSeconds,
  type PlatformLeaderboardEntry,
} from "@/lib/platform-leaderboard";
import { formatRelativeTimeFromIso } from "@/lib/format-relative-time";
import { formatPlayerIdLabel } from "@/lib/player-id";
import {
  isVirtualLeaderboardUserId,
  VIRTUAL_LEADERBOARD_USER_PREFIX,
} from "@/lib/platform-leaderboard-virtual";
import { Link } from "@/i18n/navigation";
import { FollowCreatorButton } from "@/components/creator/follow-creator-button";
import { SupporterAvatarInsignia } from "@/components/supporter/supporter-avatar-insignia";
import { cn } from "@/lib/utils";
import {
  getSupporterDisplayTier,
  supporterAvatarRingClassByTier,
} from "@/lib/supporter-tier";
import {
  resolveChatAuthorRoleFallback,
  type AdminDisplayRole,
} from "@/lib/admin-display-role";

export type ChatPlayerPreview = {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  equippedTitle: EquippedTitle | null;
  isSupporter?: boolean;
  supporterBadge?: string | null;
  isCreator: boolean;
  adminRole?: AdminDisplayRole;
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
    isSupporter: message.author_is_supporter,
    supporterBadge: message.author_supporter_badge,
    isCreator: message.is_creator,
    adminRole: message.author_admin_role ?? "none",
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
    adminRole: entry.adminRole ?? "none",
    isVirtual: Boolean(virtualPlayerId),
    virtualPlayerId,
    isOwn: entry.isMe ?? false,
    isSupporter: entry.isSupporter,
    supporterBadge: entry.supporterBadge,
  };
}

export function virtualPlayerToPlayerPreview(player: {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  equippedTitle?: EquippedTitle | null;
}): ChatPlayerPreview {
  return {
    userId: "",
    displayName: player.displayName,
    avatarUrl: player.avatarUrl,
    equippedTitle: player.equippedTitle ?? null,
    isCreator: false,
    isVirtual: true,
    virtualPlayerId: player.id,
    isOwn: false,
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

export function creatorToPlayerPreview(
  creatorId: string,
  displayName: string,
  options?: { isOwn?: boolean; avatarUrl?: string | null }
): ChatPlayerPreview {
  return {
    userId: creatorId,
    displayName,
    avatarUrl: options?.avatarUrl ?? null,
    equippedTitle: null,
    isCreator: true,
    isVirtual: false,
    virtualPlayerId: null,
    isOwn: options?.isOwn ?? false,
  };
}

function PlayerCardStatsSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: 8 }).map((_, index) => (
        <div
          key={index}
          className="animate-pulse rounded-lg border border-white/8 bg-white/[0.03] px-3 py-2"
        >
          <div className="mx-auto mb-2 h-3 w-16 rounded bg-white/10" />
          <div className="mx-auto h-5 w-12 rounded bg-white/10" />
        </div>
      ))}
    </div>
  );
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
  onDirectMessage?: (target: {
    userId?: string;
    virtualPlayerId?: string;
  }) => void;
  canDirectMessage?: boolean;
};

export function ChatPlayerCard({
  player,
  open,
  onOpenChange,
  onDirectMessage,
  canDirectMessage = false,
}: ChatPlayerCardProps) {
  const t = useTranslations("chat");
  const tcx = useTranslations("common");
  const locale = useLocale();
  const { profile, loading, error } = useChatPlayerProfile(player, open);

  const formatDuration = (seconds: number) =>
    formatDurationSeconds(seconds, (key, values) => tcx(key, values));

  if (!player) return null;

  const displayName = player.isOwn ? t("you") : player.displayName;
  const detail = profile;
  const avatarUrl = detail?.avatarUrl ?? player.avatarUrl;
  const equippedTitle = player.equippedTitle ?? detail?.equippedTitle ?? null;
  const supporterTier = getSupporterDisplayTier(
    detail?.isSupporter ?? player.isSupporter ?? false,
    detail?.supporterBadge ?? player.supporterBadge ?? null
  );
  const isCreator = detail?.isCreator ?? player.isCreator;
  const adminRole: AdminDisplayRole =
    detail?.adminRole ?? player.adminRole ?? "none";
  const roleFallback = resolveChatAuthorRoleFallback(
    {
      equippedTitle,
      adminRole,
      isCreator,
    },
    {
      superAdmin: t("roleSuperAdmin"),
      admin: t("rolePlatformAdmin"),
      creator: t("roleCreator"),
      player: t("rolePlayer"),
    }
  );
  const isVirtual = detail?.isVirtual ?? player.isVirtual;
  const followableCreatorId = (() => {
    if (!isCreator) return null;
    const candidate = detail?.userId ?? (isVirtual ? null : player.userId);
    if (!candidate || isVirtualLeaderboardUserId(candidate)) return null;
    return candidate;
  })();
  const countryLabel = detail?.countryCode
    ? formatCountryName(detail.countryCode, locale)
    : null;
  const playerIdLabel = (() => {
    if (isVirtual) {
      // 不露出虛擬 ID；用穩定假編號看起來像一般玩家
      const seed =
        detail?.virtualPlayerId ?? player.virtualPlayerId ?? player.displayName;
      let hash = 0;
      for (const char of seed) {
        hash = Math.imul(31, hash) + char.charCodeAt(0);
        hash |= 0;
      }
      return String(10000 + (Math.abs(hash) % 90000));
    }
    return formatPlayerIdLabel(detail?.playerNumber);
  })();

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
          <div className="flex w-full flex-col items-center gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
            <div className="flex flex-col items-center gap-3 sm:flex-row sm:gap-5">
              {/* 手機：VIP 排在頭像上方，避免蓋住標題 */}
              <div
                className={cn(
                  "relative flex shrink-0 flex-col items-center gap-1.5 pt-1 md:hidden",
                  supporterTier === "none" && "pt-1"
                )}
              >
                {supporterTier !== "none" && (
                  <SupporterAvatarInsignia
                    tier={supporterTier}
                    size="md"
                    className="!static !left-auto !top-auto !z-auto !translate-x-0 !translate-y-0"
                  />
                )}
                <div className="relative">
                  <div
                    className={cn(
                      "relative size-20 overflow-hidden rounded-full ring-2",
                      isCreator
                        ? "ring-violet-400/40"
                        : supporterTier !== "none"
                          ? supporterAvatarRingClassByTier[supporterTier]
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
              </div>

              {/* 電腦：還原原本 VIP 浮在頭像上方 */}
              <div className="relative hidden shrink-0 md:block">
                <SupporterAvatarInsignia tier={supporterTier} size="md" />
                <div
                  className={cn(
                    "relative mt-1 size-20 overflow-hidden rounded-full ring-2",
                    isCreator
                      ? "ring-violet-400/40"
                      : supporterTier !== "none"
                        ? supporterAvatarRingClassByTier[supporterTier]
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
                <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 sm:justify-start">
                  <UserBadge
                    username={displayName}
                    title={equippedTitle}
                    fallbackRoleLabel={roleFallback.label}
                    fallbackRoleRainbow={roleFallback.rainbow}
                    isSupporter={detail?.isSupporter}
                    supporterBadge={detail?.supporterBadge}
                    showSupporterBadge={false}
                    animateTitle={false}
                    usernameClassName="text-lg font-semibold text-zinc-100 sm:text-xl"
                    titleClassName="text-xs sm:text-sm"
                  />
                </div>
                {detail?.showcaseTags && detail.showcaseTags.length > 0 && (
                  <ProfileShowcaseTags
                    tags={detail.showcaseTags}
                    className="mt-2"
                  />
                )}
                {countryLabel && (
                  <p className="mt-1.5 text-xs text-zinc-500 sm:text-sm">
                    {t("playerCardRegion")}：{countryLabel}
                  </p>
                )}
                {playerIdLabel && (
                  <p className="mt-1 font-mono text-xs text-zinc-500 sm:text-sm">
                    {t("playerCardPlayerId")}：{playerIdLabel}
                  </p>
                )}
              </div>
            </div>

            {isCreator && (followableCreatorId || detail) && (
              <div className="shrink-0 self-center sm:self-end sm:pb-0.5">
                {followableCreatorId ? (
                  <FollowCreatorButton
                    creatorId={followableCreatorId}
                    compact
                    layout="stacked"
                    align="end"
                    showFollowerCount
                    initialFollowerCount={detail?.followerCount}
                  />
                ) : detail ? (
                  <div
                    className={cn(
                      "flex flex-col items-end gap-1 text-right"
                    )}
                  >
                    <p className="text-xs text-zinc-500">
                      {t("playerCardFollowersOnly")}
                    </p>
                    <p className="text-sm font-semibold text-zinc-200">
                      {detail.followerCount}
                    </p>
                  </div>
                ) : null}
              </div>
            )}
          </div>

          {loading && !detail ? (
            <div className="space-y-3">
              <div className="animate-pulse rounded-lg border border-white/8 bg-white/[0.02] px-3 py-2.5">
                <div className="mx-auto mb-2 h-3 w-20 rounded bg-white/10" />
                <div className="mx-auto h-4 w-3/4 max-w-sm rounded bg-white/10" />
              </div>
              <PlayerCardStatsSkeleton />
              <p className="flex items-center justify-center gap-2 text-xs text-zinc-500">
                <Loader2 className="size-3.5 animate-spin" />
                {t("loading")}
              </p>
            </div>
          ) : error && !detail ? (
            <p className="py-4 text-center text-sm text-rose-300 sm:text-base">{error}</p>
          ) : detail ? (
            <div className={cn("space-y-3", loading && "opacity-80")}>
              {loading && (
                <p className="flex items-center justify-center gap-2 text-[11px] text-zinc-500">
                  <Loader2 className="size-3 animate-spin" />
                  {t("loading")}
                </p>
              )}
              <div className="rounded-lg border border-white/8 bg-white/[0.02] px-3 py-2.5 text-center">
                <p className="mb-1.5 text-xs font-medium text-zinc-400 sm:text-sm">
                  {t("playerCardBio")}
                </p>
                <p
                  className={cn(
                    "whitespace-pre-wrap break-words text-sm leading-relaxed sm:text-base",
                    detail.bio ? "text-zinc-200" : "text-zinc-500"
                  )}
                >
                  {detail.bio || t("playerCardBioEmpty")}
                </p>
              </div>

              {detail.website && (
                <a
                  href={normalizeWebsite(detail.website)}
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
                  value={formatDuration(detail.onlineSeconds)}
                />
                <StatItem
                  icon={<Gamepad2 className="size-3.5 shrink-0" />}
                  label={t("playerCardPlayTime")}
                  value={formatDuration(detail.playSeconds)}
                />
                <StatItem
                  icon={<Clock3 className="size-3.5 shrink-0" />}
                  label={t("playerCardLastActive")}
                  value={formatRelativeTimeFromIso(detail.lastActiveAt, tcx, locale)}
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
                  value={
                    detail.donatedTotal != null
                      ? formatDonationAmountFromHkd(detail.donatedTotal, locale)
                      : detail.donationTier && detail.donationTier !== "none"
                        ? formatDonationTierLabel(detail.donationTier, locale)
                        : "—"
                  }
                />
                <StatItem
                  icon={<Gamepad2 className="size-3.5 shrink-0" />}
                  label={t("playerCardPublishedGames")}
                  value={detail.isCreator ? String(detail.publishedGames) : "—"}
                />
                <StatItem
                  icon={<CalendarDays className="size-3.5 shrink-0" />}
                  label={t("playerCardRegisteredAt")}
                  value={
                    detail.registeredAt
                      ? new Date(detail.registeredAt).toLocaleDateString(locale, {
                          year: "numeric",
                          month: "numeric",
                          day: "numeric",
                        })
                      : "—"
                  }
                />
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
            </div>
          ) : null}

          <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-center">
            {(() => {
              const virtualPlayerId =
                detail?.virtualPlayerId ?? player.virtualPlayerId;
              const realUserId =
                !isVirtual &&
                player.userId &&
                !isVirtualLeaderboardUserId(player.userId)
                  ? player.userId
                  : null;
              const canDm =
                canDirectMessage &&
                onDirectMessage &&
                !player.isOwn &&
                (Boolean(virtualPlayerId) || Boolean(realUserId));

              if (!canDm) return null;

              return (
                <Button
                  type="button"
                  className="h-10 flex-1 gap-2 text-sm bg-gradient-to-r from-cyan-600 to-violet-600 text-white hover:from-cyan-500 hover:to-violet-500 sm:max-w-xs"
                  onClick={() => {
                    onOpenChange(false);
                    if (virtualPlayerId) {
                      onDirectMessage!({ virtualPlayerId });
                    } else if (realUserId) {
                      onDirectMessage!({ userId: realUserId });
                    }
                  }}
                >
                  <MessageCircle className="size-4" />
                  {t("playerCardDm")}
                </Button>
              );
            })()}

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

            {followableCreatorId && !player.isOwn && (
              <Button
                nativeButton={false}
                variant="outline"
                className="h-10 flex-1 gap-2 border-white/10 bg-white/5 text-sm text-zinc-200 hover:bg-white/10 sm:max-w-xs"
                render={<Link href={`/creator/${followableCreatorId}`} />}
                onClick={() => onOpenChange(false)}
              >
                <UserRound className="size-4" />
                {t("playerCardViewCreator")}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
