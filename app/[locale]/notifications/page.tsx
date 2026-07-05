"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowLeft, Bell, Loader2 } from "lucide-react";
import { Link, useRouter } from "@/i18n/navigation";
import { buttonVariants } from "@/components/ui/button";
import { NavActions } from "@/components/layout/nav-actions";
import { SiteHeader } from "@/components/layout/site-header";
import {
  NotificationFilterBar,
  type NotificationFilter,
} from "@/components/notifications/notification-filter-bar";
import type { UserNotification, UserNotificationKind } from "@/lib/user-notifications-service";
import { cn } from "@/lib/utils";

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("zh-HK", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function NotificationsPage() {
  const t = useTranslations("notifications");
  const tNav = useTranslations("nav");
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<NotificationFilter>("all");
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadByKind, setUnreadByKind] = useState<
    Partial<Record<UserNotificationKind, number>>
  >({});

  const filterLabels = useMemo(
    () => ({
      all: t("filterAll"),
      tip: t("kindTip"),
      forum: t("kindForum"),
      newGame: t("kindNewGame"),
    }),
    [t]
  );

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const query =
        filter === "all" ? "" : `?kind=${encodeURIComponent(filter)}`;
      const response = await fetch(`/api/auth/notifications${query}`);
      if (response.status === 401) {
        router.replace("/auth?redirect=/notifications");
        return;
      }
      if (!response.ok) return;

      const data = (await response.json()) as {
        notifications?: UserNotification[];
        unreadCount?: number;
        unreadByKind?: Partial<Record<UserNotificationKind, number>>;
      };

      setNotifications(data.notifications ?? []);
      setUnreadCount(data.unreadCount ?? 0);
      setUnreadByKind(data.unreadByKind ?? {});
    } finally {
      setLoading(false);
    }
  }, [filter, router]);

  useEffect(() => {
    void loadNotifications();
  }, [loadNotifications]);

  async function handleMarkRead(id: string) {
    const response = await fetch("/api/auth/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });

    if (!response.ok) return;

    const data = (await response.json()) as { unreadCount?: number };
    setUnreadCount(data.unreadCount ?? 0);
    setNotifications((current) =>
      current.map((item) => (item.id === id ? { ...item, read: true } : item))
    );
    void loadNotifications();
  }

  async function handleMarkAllRead() {
    const response = await fetch("/api/auth/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        markAll: filter === "all",
        markKind: filter === "all" ? undefined : filter,
      }),
    });

    if (!response.ok) return;

    if (filter === "all") {
      setUnreadCount(0);
      setNotifications((current) => current.map((item) => ({ ...item, read: true })));
    } else {
      void loadNotifications();
    }
  }

  function kindLabel(kind: UserNotificationKind) {
    if (kind === "tip_received") return t("kindTip");
    if (kind === "forum_reply") return t("kindForum");
    return t("kindNewGame");
  }

  const emptyLabel =
    filter === "all"
      ? t("empty")
      : t("emptyFiltered");

  return (
    <div className="dark relative min-h-full text-zinc-100">
      <SiteHeader>
        <Link
          href="/"
          className={cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            "gap-1.5 text-zinc-400 hover:text-white"
          )}
        >
          <ArrowLeft className="size-4" />
          {tNav("backHome")}
        </Link>
        <NavActions className="ml-auto" />
      </SiteHeader>

      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 text-sm text-cyan-400">
              <Bell className="size-4" />
              {t("title")}
            </div>
            <h1 className="text-3xl font-bold text-white">{t("pageTitle")}</h1>
            <p className="mt-2 text-sm text-zinc-500">{t("pageDesc")}</p>
          </div>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={() => void handleMarkAllRead()}
              className="text-sm text-violet-400 hover:underline"
            >
              {filter === "all" ? t("markAllRead") : t("markFilterRead")}
            </button>
          )}
        </div>

        <NotificationFilterBar
          value={filter}
          onChange={setFilter}
          unreadByKind={unreadByKind}
          labels={filterLabels}
          className="mb-6"
        />

        {loading ? (
          <div className="flex min-h-[40vh] items-center justify-center">
            <Loader2 className="size-8 animate-spin text-cyan-400" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-zinc-900/40 py-16 text-center">
            <Bell className="mx-auto size-10 text-zinc-600" />
            <p className="mt-4 text-sm text-zinc-500">{emptyLabel}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((item) => {
              const inner = (
                <div
                  className={cn(
                    "rounded-2xl border px-4 py-4 transition",
                    item.read
                      ? "border-white/5 bg-zinc-900/30"
                      : "border-cyan-400/20 bg-cyan-500/5"
                  )}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="rounded-full bg-white/5 px-2.5 py-0.5 text-[11px] text-zinc-400">
                      {kindLabel(item.kind)}
                    </span>
                    <span className="text-xs text-zinc-600">
                      {formatDateTime(item.createdAt)}
                    </span>
                  </div>
                  <p
                    className={cn(
                      "mt-2 text-base",
                      item.read ? "text-zinc-300" : "font-semibold text-white"
                    )}
                  >
                    {item.title}
                  </p>
                  <p className="mt-1 text-sm text-zinc-500">{item.body}</p>
                </div>
              );

              if (item.href) {
                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    onClick={() => {
                      if (!item.read) void handleMarkRead(item.id);
                    }}
                    className="block"
                  >
                    {inner}
                  </Link>
                );
              }

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    if (!item.read) void handleMarkRead(item.id);
                  }}
                  className="block w-full text-left"
                >
                  {inner}
                </button>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
