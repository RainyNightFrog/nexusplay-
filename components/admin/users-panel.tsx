"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  Ban,
  Loader2,
  MessageSquareOff,
  RefreshCw,
  Search,
  ShieldOff,
  User,
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
import { cn } from "@/lib/utils";

function formatDate(value: string, locale: string) {
  try {
    return new Intl.DateTimeFormat(locale, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
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

type UserAction =
  | "suspend"
  | "ban"
  | "unban"
  | "mute_chat"
  | "disable_forum";

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

  async function handleUserAction(action: UserAction, actionReason?: string) {
    if (!selectedId) return;

    setActionLoading(action);
    setError(null);
    try {
      const body: Record<string, string> = { action };
      if (actionReason?.trim()) body.reason = actionReason.trim();
      if (action === "mute_chat") {
        body.chatMutedUntil = new Date(
          Date.now() + 24 * 60 * 60 * 1000
        ).toISOString();
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
            <div className="flex justify-center py-10">
              <Loader2 className="size-6 animate-spin text-cyan-400" />
            </div>
          ) : users.length === 0 ? (
            <p className="py-8 text-center text-sm text-zinc-500">
              {t("usersEmpty")}
            </p>
          ) : (
            users.map((user) => (
              <button
                key={user.id}
                type="button"
                onClick={() =>
                  setSelectedId(selectedId === user.id ? null : user.id)
                }
                className={cn(
                  "flex w-full flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition-colors",
                  selectedId === user.id
                    ? "border-cyan-400/30 bg-cyan-500/10"
                    : "border-white/8 bg-black/20 hover:border-white/15"
                )}
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-white">
                    {user.displayName}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-zinc-500">
                    {user.email ?? user.id}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    className={cn("border", accountStatusClass(user.accountStatus))}
                  >
                    {user.accountStatus}
                  </Badge>
                  {user.chatMutedUntil &&
                    new Date(user.chatMutedUntil).getTime() > Date.now() && (
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
            ))
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
              <div className="flex justify-center py-10">
                <Loader2 className="size-6 animate-spin text-cyan-400" />
              </div>
            ) : detail ? (
              <>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
                          className="flex items-center justify-between rounded-lg border border-white/8 bg-black/20 px-3 py-2 text-sm"
                        >
                          <span className="text-zinc-300">{tip.gameTitle}</span>
                          <span className="font-mono text-fuchsia-200">
                            ${tip.amountUsd.toFixed(2)} · {tip.status}
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
                          className="flex items-center justify-between rounded-lg border border-white/8 bg-black/20 px-3 py-2 text-sm"
                        >
                          <span className="text-zinc-300">
                            {order.gameTitle ?? order.orderType}
                          </span>
                          <span className="font-mono text-cyan-200">
                            ${(order.totalAmountCents / 100).toFixed(2)} ·{" "}
                            {order.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {detail.createdAt && (
                  <p className="text-xs text-zinc-500">
                    {t("usersJoined")}: {formatDate(detail.createdAt, locale)}
                  </p>
                )}
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
