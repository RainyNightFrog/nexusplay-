"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  Ban,
  Check,
  Copy,
  Loader2,
  MessageSquare,
  MessageSquareOff,
  RefreshCw,
  Search,
  Shield,
  ShieldOff,
  Sparkles,
  User,
  UserCog,
  Volume2,
  VolumeX,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AdminUserDetail, AdminUserRecord } from "@/lib/admin-users-service";
import {
  AdminPanelHeader,
  adminPanelCenteredCardsClass,
} from "@/components/admin/admin-panel-header";
import { AdminLoadingState } from "@/components/admin/admin-loading-state";
import { localeDateMap, type AppLocale } from "@/i18n/routing";
import { cn } from "@/lib/utils";

function resolveDateLocale(locale: string) {
  return localeDateMap[locale as AppLocale] ?? locale;
}

function formatDate(value: string | null | undefined, locale: string) {
  if (!value) return null;
  try {
    return new Intl.DateTimeFormat(resolveDateLocale(locale), {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Asia/Hong_Kong",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function formatDateOrDash(
  value: string | null | undefined,
  locale: string,
  emptyLabel: string
) {
  return formatDate(value, locale) ?? emptyLabel;
}

function InfoRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="min-w-0 rounded-lg border border-white/8 bg-black/20 px-3 py-2">
      <p className="text-[11px] text-zinc-500">{label}</p>
      <div
        className={cn(
          "mt-0.5 break-all text-sm text-zinc-100",
          mono && "font-mono text-xs text-zinc-300"
        )}
      >
        {value}
      </div>
    </div>
  );
}

function accountStatusClass(status: string) {
  switch (status) {
    case "active":
      return "border-emerald-400/30 bg-emerald-500/10 text-emerald-200";
    case "suspended":
      return "border-amber-400/30 bg-amber-500/10 text-amber-200";
    case "banned":
      return "border-rose-400/30 bg-rose-500/10 text-rose-200";
    default:
      return "border-white/10 bg-white/5 text-zinc-300";
  }
}

function accountStatusLabel(
  status: string,
  t: ReturnType<typeof useTranslations<"admin">>
) {
  const key = `usersAccountStatus_${status}` as const;
  return t.has(key) ? t(key) : status;
}

function orderStatusLabel(
  status: string,
  t: ReturnType<typeof useTranslations<"admin">>
) {
  const map: Record<string, string> = {
    succeeded: t("ordersStatusSucceeded"),
    pending: t("ordersStatusPending"),
    refunded: t("ordersStatusRefunded"),
    failed: t("ordersStatusFailed"),
  };
  return map[status] ?? status;
}

function orderTypeLabel(
  orderType: string,
  t: ReturnType<typeof useTranslations<"admin">>
) {
  if (orderType === "game_purchase") return t("ordersType_game_purchase");
  if (orderType === "supporter_pass") return t("ordersType_supporter_pass");
  return orderType;
}

type UserAction =
  | "suspend"
  | "ban"
  | "unban"
  | "mute_chat"
  | "unmute_chat"
  | "disable_forum"
  | "enable_forum"
  | "set_role"
  | "grant_supporter"
  | "revoke_supporter";

type ActionExtras = {
  role?: "player" | "creator";
  supporterBadge?: "supporter_v1" | "supporter_v2";
};

export function AdminUsersPanel() {
  const t = useTranslations("admin");
  const locale = useLocale();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<AdminUserRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<AdminUserDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<UserAction | null>(null);
  const [reason, setReason] = useState("");
  const [copiedId, setCopiedId] = useState(false);

  const neverLabel = t("usersNever");

  async function copyUserId(userId: string) {
    try {
      await navigator.clipboard.writeText(userId);
      setCopiedId(true);
      window.setTimeout(() => setCopiedId(false), 1600);
    } catch {
      /* ignore clipboard errors */
    }
  }

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (query.trim()) params.set("q", query.trim());
      const response = await fetch(`/api/admin/users?${params.toString()}`);
      const data = (await response.json()) as {
        users?: AdminUserRecord[];
        error?: string;
      };
      if (!response.ok) throw new Error(data.error ?? t("usersLoadFailed"));
      setUsers(data.users ?? []);
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : t("usersLoadFailed")
      );
    } finally {
      setLoading(false);
    }
  }, [query, t]);

  const loadDetail = useCallback(
    async (userId: string) => {
      setDetailLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/admin/users/${userId}`);
        const data = (await response.json()) as {
          user?: AdminUserDetail;
          error?: string;
        };
        if (!response.ok) throw new Error(data.error ?? t("usersDetailFailed"));
        setDetail(data.user ?? null);
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : t("usersDetailFailed")
        );
        setDetail(null);
      } finally {
        setDetailLoading(false);
      }
    },
    [t]
  );

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  useEffect(() => {
    if (selectedId) void loadDetail(selectedId);
    else setDetail(null);
  }, [selectedId, loadDetail]);

  function openActionDialog(action: UserAction) {
    setPendingAction(action);
    setReason("");
    setDialogOpen(true);
  }

  async function handleUserAction(
    action: UserAction,
    actionReason?: string,
    extras?: ActionExtras
  ) {
    if (!selectedId) return;

    const loadingKey =
      action === "set_role" && extras?.role
        ? `set_role:${extras.role}`
        : action === "grant_supporter" && extras?.supporterBadge
          ? `grant_supporter:${extras.supporterBadge}`
          : action;

    setActionLoading(loadingKey);
    setError(null);
    try {
      const body: Record<string, string> = { action };
      if (actionReason?.trim()) body.reason = actionReason.trim();
      if (action === "mute_chat") {
        body.chatMutedUntil = new Date(
          Date.now() + 24 * 60 * 60 * 1000
        ).toISOString();
      }
      if (action === "set_role" && extras?.role) {
        body.role = extras.role;
      }
      if (action === "grant_supporter") {
        body.supporterBadge = extras?.supporterBadge ?? "supporter_v1";
      }

      const response = await fetch(`/api/admin/users/${selectedId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await response.json()) as {
        user?: AdminUserDetail;
        error?: string;
      };
      if (!response.ok) throw new Error(data.error ?? t("usersActionFailed"));

      setDetail(data.user ?? null);
      await loadUsers();
      setDialogOpen(false);
      setPendingAction(null);
    } catch (actionError) {
      setError(
        actionError instanceof Error
          ? actionError.message
          : t("usersActionFailed")
      );
    } finally {
      setActionLoading(null);
    }
  }

  function confirmDialogAction() {
    if (!pendingAction) return;
    if (
      (pendingAction === "suspend" || pendingAction === "ban") &&
      !reason.trim()
    ) {
      setError(t("usersReasonRequired"));
      return;
    }
    void handleUserAction(pendingAction, reason);
  }

  function handleSearchSubmit(event: React.FormEvent) {
    event.preventDefault();
    setQuery(search);
  }

  return (
    <div className={cn("space-y-6", adminPanelCenteredCardsClass)}>
      <AdminPanelHeader
        title={t("tabUsers")}
        description={t("usersDesc")}
        actions={
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void loadUsers()}
            disabled={loading}
            className="gap-2 border-white/10"
          >
            <RefreshCw className={cn("size-4", loading && "animate-spin")} />
            {t("refresh")}
          </Button>
        }
      />

      {error && <p className="text-center text-sm text-rose-400">{error}</p>}

      <form onSubmit={handleSearchSubmit} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t("usersSearchPlaceholder")}
            className="border-white/10 bg-zinc-900/60 pl-9 text-white"
          />
        </div>
        <Button type="submit" variant="outline" className="border-white/10">
          {t("usersSearch")}
        </Button>
      </form>

      <Card className="border-white/8 bg-zinc-900/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base text-white">
            <User className="size-4 text-cyan-400" />
            {t("usersListTitle")}
          </CardTitle>
          <CardDescription>{t("usersListDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {loading ? (
            <AdminLoadingState spinnerClassName="text-cyan-400" minHeightClassName="min-h-0" />
          ) : users.length === 0 ? (
            <p className="py-8 text-center text-sm text-zinc-500">
              {t("usersEmpty")}
            </p>
          ) : (
            users.map((user) => {
              const mutedActive =
                Boolean(user.chatMutedUntil) &&
                new Date(user.chatMutedUntil!).getTime() > Date.now();

              return (
              <button
                key={user.id}
                type="button"
                onClick={() =>
                  setSelectedId(selectedId === user.id ? null : user.id)
                }
                className={cn(
                  "flex w-full flex-col gap-2 rounded-xl border px-4 py-3 text-left transition-colors sm:flex-row sm:items-start sm:justify-between",
                  selectedId === user.id
                    ? "border-cyan-400/30 bg-cyan-500/10"
                    : "border-white/8 bg-black/20 hover:border-white/15"
                )}
              >
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-medium text-white">
                      {user.displayName}
                    </p>
                    {user.isAdmin && (
                      <Badge className="border border-cyan-400/30 bg-cyan-500/10 text-cyan-200">
                        <Shield className="mr-1 size-3" />
                        {t("usersAdminBadge")}
                      </Badge>
                    )}
                  </div>
                  <p className="truncate text-xs text-zinc-400">
                    {user.email ?? user.id}
                    {user.username ? ` · @${user.username}` : ""}
                    {user.playerNumber != null
                      ? ` · #${user.playerNumber}`
                      : ""}
                  </p>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-zinc-500">
                    <span>
                      {t("usersJoined")}:{" "}
                      {formatDateOrDash(user.createdAt, locale, neverLabel)}
                    </span>
                    <span>
                      {t("usersLastSignIn")}:{" "}
                      {formatDateOrDash(user.lastSignInAt, locale, neverLabel)}
                    </span>
                    {user.authProviders.length > 0 && (
                      <span>
                        {t("usersAuthProviders")}:{" "}
                        {user.authProviders.join(", ")}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                  <Badge
                    className={cn("border", accountStatusClass(user.accountStatus))}
                  >
                    {accountStatusLabel(user.accountStatus, t)}
                  </Badge>
                  {user.role && (
                    <Badge className="border border-white/10 bg-white/5 text-zinc-300">
                      {user.role === "creator"
                        ? t("usersRoleCreator")
                        : t("usersRolePlayer")}
                    </Badge>
                  )}
                  {user.isSupporter && (
                    <Badge
                      className={cn(
                        "border",
                        user.supporterBadge === "supporter_v2"
                          ? "border-violet-400/30 bg-violet-500/10 text-violet-200"
                          : "border-amber-400/30 bg-amber-500/10 text-amber-200"
                      )}
                    >
                      {user.supporterBadge === "supporter_v2"
                        ? t("usersBadgeSvip")
                        : t("usersBadgeVip")}
                      {user.supporterLifetime ? " · ∞" : ""}
                    </Badge>
                  )}
                  {mutedActive && (
                      <Badge className="border border-violet-400/30 bg-violet-500/10 text-violet-200">
                        {t("usersMuted")}
                      </Badge>
                    )}
                  {user.forumPostingDisabled && (
                    <Badge className="border border-orange-400/30 bg-orange-500/10 text-orange-200">
                      {t("usersForumDisabled")}
                    </Badge>
                  )}
                </div>
              </button>
              );
            })
          )}
        </CardContent>
      </Card>

      {selectedId && (
        <Card className="border-white/8 bg-zinc-900/60">
          <CardHeader>
            <CardTitle className="text-base text-white">
              {t("usersDetailTitle")}
            </CardTitle>
            <CardDescription>{t("usersDetailDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {detailLoading ? (
              <AdminLoadingState spinnerClassName="text-cyan-400" minHeightClassName="min-h-0" />
            ) : detail ? (
              <>
                <div>
                  <h3 className="mb-2 text-sm font-medium text-zinc-300">
                    {t("usersProfileSection")}
                  </h3>
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    <InfoRow label={t("usersDisplayName")} value={detail.displayName} />
                    <InfoRow
                      label="Email"
                      value={detail.email ?? neverLabel}
                    />
                    <InfoRow
                      label={t("usersUsername")}
                      value={detail.username ? `@${detail.username}` : neverLabel}
                    />
                    <InfoRow
                      label={t("usersPlayerNumber")}
                      value={
                        detail.playerNumber != null
                          ? `#${detail.playerNumber}`
                          : neverLabel
                      }
                    />
                    <InfoRow
                      label={t("usersRoleLabel")}
                      value={
                        detail.role === "creator"
                          ? t("usersRoleCreator")
                          : detail.role === "player"
                            ? t("usersRolePlayer")
                            : detail.role ?? neverLabel
                      }
                    />
                    <InfoRow
                      label={t("usersAuthProviders")}
                      value={
                        detail.authProviders.length > 0
                          ? detail.authProviders.join(", ")
                          : neverLabel
                      }
                    />
                    <div className="min-w-0 rounded-lg border border-white/8 bg-black/20 px-3 py-2 sm:col-span-2 lg:col-span-3">
                      <p className="text-[11px] text-zinc-500">
                        {t("usersUserId")}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <code className="break-all font-mono text-xs text-zinc-300">
                          {detail.id}
                        </code>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => void copyUserId(detail.id)}
                          className="h-7 gap-1 border-white/10 px-2 text-xs text-zinc-300"
                        >
                          {copiedId ? (
                            <>
                              <Check className="size-3" />
                              {t("usersCopied")}
                            </>
                          ) : (
                            <>
                              <Copy className="size-3" />
                              {t("usersCopyId")}
                            </>
                          )}
                        </Button>
                        {detail.isAdmin && (
                          <Badge className="border border-cyan-400/30 bg-cyan-500/10 text-cyan-200">
                            {t("usersAdminBadge")}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="mb-2 text-sm font-medium text-zinc-300">
                    {t("usersModerationSection")}
                  </h3>
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    <InfoRow
                      label={t("usersJoined")}
                      value={formatDateOrDash(detail.createdAt, locale, neverLabel)}
                    />
                    <InfoRow
                      label={t("usersLastSignIn")}
                      value={formatDateOrDash(
                        detail.lastSignInAt,
                        locale,
                        neverLabel
                      )}
                    />
                    <InfoRow
                      label={t("usersEmailConfirmed")}
                      value={
                        detail.emailConfirmedAt
                          ? `${t("usersConfirmed")} · ${formatDate(
                              detail.emailConfirmedAt,
                              locale
                            )}`
                          : t("usersNotConfirmed")
                      }
                    />
                    <InfoRow
                      label={t("usersSuspendedUntil")}
                      value={formatDateOrDash(
                        detail.suspendedUntil,
                        locale,
                        neverLabel
                      )}
                    />
                    <InfoRow
                      label={t("usersMutedUntil")}
                      value={formatDateOrDash(
                        detail.chatMutedUntil,
                        locale,
                        neverLabel
                      )}
                    />
                    <InfoRow
                      label={t("usersBanReason")}
                      value={detail.banReason?.trim() || neverLabel}
                    />
                    {detail.isSupporter && (
                      <>
                        <InfoRow
                          label={t("usersSupporterSince")}
                          value={formatDateOrDash(
                            detail.supporterSince,
                            locale,
                            neverLabel
                          )}
                        />
                        <InfoRow
                          label={t("usersLifetimeSupporter")}
                          value={detail.supporterLifetime ? "✓" : "—"}
                        />
                      </>
                    )}
                    {detail.role === "creator" && (
                      <>
                        <InfoRow
                          label={t("usersPayoutStatus")}
                          value={detail.payoutStatus ?? neverLabel}
                        />
                        <InfoRow
                          label={t("usersStripeConnect")}
                          value={detail.stripeConnectAccountId ?? neverLabel}
                          mono
                        />
                      </>
                    )}
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                  <div className="rounded-lg border border-white/8 bg-black/20 px-3 py-2">
                    <p className="text-xs text-zinc-500">{t("usersStatGames")}</p>
                    <p className="text-lg font-semibold text-white">
                      {detail.gamesCount}
                    </p>
                  </div>
                  <div className="rounded-lg border border-white/8 bg-black/20 px-3 py-2">
                    <p className="text-xs text-zinc-500">{t("usersStatTips")}</p>
                    <p className="text-lg font-semibold text-white">
                      {detail.tipsCount}
                    </p>
                  </div>
                  <div className="rounded-lg border border-white/8 bg-black/20 px-3 py-2">
                    <p className="text-xs text-zinc-500">{t("usersStatOrders")}</p>
                    <p className="text-lg font-semibold text-white">
                      {detail.ordersCount}
                    </p>
                  </div>
                  <div className="rounded-lg border border-white/8 bg-black/20 px-3 py-2">
                    <p className="text-xs text-zinc-500">{t("usersStatForum")}</p>
                    <p className="text-lg font-semibold text-white">
                      {detail.forumPostsCount}
                    </p>
                  </div>
                  <div className="rounded-lg border border-white/8 bg-black/20 px-3 py-2">
                    <p className="text-xs text-zinc-500">{t("usersStatBalance")}</p>
                    <p className="text-lg font-semibold text-emerald-200">
                      ${detail.creatorBalanceUsd.toFixed(2)}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={!!actionLoading}
                    onClick={() => openActionDialog("suspend")}
                    className="gap-1.5 border-amber-400/20 text-amber-200"
                  >
                    <ShieldOff className="size-3.5" />
                    {t("usersSuspend")}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={!!actionLoading}
                    onClick={() => openActionDialog("ban")}
                    className="gap-1.5 border-rose-400/20 text-rose-200"
                  >
                    <Ban className="size-3.5" />
                    {t("usersBan")}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={!!actionLoading || detail.accountStatus === "active"}
                    onClick={() => void handleUserAction("unban")}
                    className="border-emerald-400/20 text-emerald-200"
                  >
                    {actionLoading === "unban" ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      t("usersUnban")
                    )}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={!!actionLoading}
                    onClick={() => void handleUserAction("mute_chat")}
                    className="gap-1.5 border-violet-400/20 text-violet-200"
                  >
                    {actionLoading === "mute_chat" ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <>
                        <VolumeX className="size-3.5" />
                        {t("usersMuteChat24h")}
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={
                      !!actionLoading ||
                      !detail.chatMutedUntil ||
                      new Date(detail.chatMutedUntil).getTime() <= Date.now()
                    }
                    onClick={() => void handleUserAction("unmute_chat")}
                    className="gap-1.5 border-emerald-400/20 text-emerald-200"
                  >
                    {actionLoading === "unmute_chat" ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <>
                        <Volume2 className="size-3.5" />
                        {t("usersUnmuteChat")}
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={!!actionLoading || detail.forumPostingDisabled}
                    onClick={() => void handleUserAction("disable_forum")}
                    className="gap-1.5 border-orange-400/20 text-orange-200"
                  >
                    {actionLoading === "disable_forum" ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <>
                        <MessageSquareOff className="size-3.5" />
                        {t("usersDisableForum")}
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={!!actionLoading || !detail.forumPostingDisabled}
                    onClick={() => void handleUserAction("enable_forum")}
                    className="gap-1.5 border-emerald-400/20 text-emerald-200"
                  >
                    {actionLoading === "enable_forum" ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <>
                        <MessageSquare className="size-3.5" />
                        {t("usersEnableForum")}
                      </>
                    )}
                  </Button>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={!!actionLoading || detail.role === "player"}
                    onClick={() =>
                      void handleUserAction("set_role", undefined, {
                        role: "player",
                      })
                    }
                    className="gap-1.5 border-white/10 text-zinc-200"
                  >
                    {actionLoading === "set_role:player" ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <>
                        <User className="size-3.5" />
                        {t("usersSetRolePlayer")}
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={!!actionLoading || detail.role === "creator"}
                    onClick={() =>
                      void handleUserAction("set_role", undefined, {
                        role: "creator",
                      })
                    }
                    className="gap-1.5 border-cyan-400/20 text-cyan-200"
                  >
                    {actionLoading === "set_role:creator" ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <>
                        <UserCog className="size-3.5" />
                        {t("usersSetRoleCreator")}
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={
                      !!actionLoading ||
                      (detail.isSupporter &&
                        detail.supporterBadge === "supporter_v1")
                    }
                    onClick={() =>
                      void handleUserAction("grant_supporter", undefined, {
                        supporterBadge: "supporter_v1",
                      })
                    }
                    className="gap-1.5 border-amber-400/20 text-amber-200"
                  >
                    {actionLoading === "grant_supporter:supporter_v1" ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <>
                        <Sparkles className="size-3.5" />
                        {t("usersGrantVip")}
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={
                      !!actionLoading ||
                      (detail.isSupporter &&
                        detail.supporterBadge === "supporter_v2")
                    }
                    onClick={() =>
                      void handleUserAction("grant_supporter", undefined, {
                        supporterBadge: "supporter_v2",
                      })
                    }
                    className="gap-1.5 border-violet-400/20 text-violet-200"
                  >
                    {actionLoading === "grant_supporter:supporter_v2" ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <>
                        <Sparkles className="size-3.5" />
                        {t("usersGrantSvip")}
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={!!actionLoading || !detail.isSupporter}
                    onClick={() => void handleUserAction("revoke_supporter")}
                    className="gap-1.5 border-rose-400/20 text-rose-200"
                  >
                    {actionLoading === "revoke_supporter" ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      t("usersRevokeSupporter")
                    )}
                  </Button>
                </div>

                <div>
                  <h3 className="mb-2 text-sm font-medium text-zinc-300">
                    {t("usersRecentTips")}
                  </h3>
                  {detail.recentTips.length === 0 ? (
                    <p className="text-sm text-zinc-500">{t("usersRecentEmpty")}</p>
                  ) : (
                    <div className="space-y-2">
                      {detail.recentTips.map((tip) => (
                        <div
                          key={tip.id}
                          className="flex flex-col gap-1 rounded-lg border border-white/8 bg-black/20 px-3 py-2 text-sm sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-zinc-300">{tip.gameTitle}</p>
                            <p className="text-[11px] text-zinc-500">
                              {formatDateOrDash(tip.createdAt, locale, neverLabel)}
                            </p>
                          </div>
                          <span className="shrink-0 font-mono text-fuchsia-200">
                            ${tip.amountUsd.toFixed(2)} · {orderStatusLabel(tip.status, t)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <h3 className="mb-2 text-sm font-medium text-zinc-300">
                    {t("usersRecentOrders")}
                  </h3>
                  {detail.recentOrders.length === 0 ? (
                    <p className="text-sm text-zinc-500">{t("usersRecentEmpty")}</p>
                  ) : (
                    <div className="space-y-2">
                      {detail.recentOrders.map((order) => (
                        <div
                          key={order.id}
                          className="flex flex-col gap-1 rounded-lg border border-white/8 bg-black/20 px-3 py-2 text-sm sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-zinc-300">
                              {order.gameTitle ?? orderTypeLabel(order.orderType, t)}
                            </p>
                            <p className="text-[11px] text-zinc-500">
                              {formatDateOrDash(order.createdAt, locale, neverLabel)}
                            </p>
                          </div>
                          <span className="shrink-0 font-mono text-cyan-200">
                            ${(order.totalAmountCents / 100).toFixed(2)} ·{" "}
                            {orderStatusLabel(order.status, t)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <p className="text-sm text-zinc-500">{t("usersDetailFailed")}</p>
            )}
          </CardContent>
        </Card>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="border-white/10 bg-zinc-900 text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {pendingAction === "suspend"
                ? t("usersSuspend")
                : t("usersBan")}
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              {t("usersReasonDesc")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="user-action-reason">{t("usersReasonLabel")}</Label>
            <Input
              id="user-action-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder={t("usersReasonPlaceholder")}
              className="border-white/10 bg-black/30 text-white"
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDialogOpen(false)}
              className="border-white/10"
            >
              {t("cancel")}
            </Button>
            <Button
              type="button"
              disabled={!!actionLoading}
              onClick={confirmDialogAction}
              className="bg-rose-600 hover:bg-rose-500"
            >
              {actionLoading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                t("usersConfirmAction")
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
