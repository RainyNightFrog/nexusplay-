"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Bell, Loader2 } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { useAuth } from "@/hooks/use-auth";
import {
  NotificationFilterBar,
  type NotificationFilter,
} from "@/components/notifications/notification-filter-bar";
import type { UserNotification, UserNotificationKind } from "@/lib/user-notifications-service";
import { formatRelativeTimeFromIso } from "@/lib/format-relative-time";
import { cn } from "@/lib/utils";

export function NotificationBell() {
  const t = useTranslations("notifications");
  const tcx = useTranslations("common");
  const locale = useLocale();
  const { profile } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<NotificationFilter>("all");
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadByKind, setUnreadByKind] = useState<
    Partial<Record<UserNotificationKind, number>>
  >({});
  const menuRef = useRef<HTMLDivElement>(null);

  const filterLabels = {
    all: t("filterAll"),
    tip: t("kindTip"),
    forum: t("kindForum"),
    newGame: t("kindNewGame"),
  };

  const loadNotifications = useCallback(async () => {
    if (!profile) return;

    setLoading(true);
    try {
      const query =
        filter === "all" ? "" : `?kind=${encodeURIComponent(filter)}`;
      const response = await fetch(`/api/auth/notifications${query}`);
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
  }, [filter, profile]);

  useEffect(() => {
    if (!profile) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    void loadNotifications();
    const interval = window.setInterval(() => {
      void loadNotifications();
    }, 60_000);

    return () => window.clearInterval(interval);
  }, [profile, loadNotifications]);

  useEffect(() => {
    if (open) {
      void loadNotifications();
    }
  }, [filter, open, loadNotifications]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleOpen() {
    const nextOpen = !open;
    setOpen(nextOpen);
    if (nextOpen) {
      await loadNotifications();
    }
  }

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
  }

  async function handleMarkAllRead() {
    const response = await fetch("/api/auth/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markAll: true }),
    });

    if (!response.ok) return;

    setUnreadCount(0);
    setNotifications((current) => current.map((item) => ({ ...item, read: true })));
  }

  if (!profile) return null;

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => void handleOpen()}
        className={cn(
          "relative flex size-9 items-center justify-center rounded-full",
          "border border-white/10 bg-white/5 text-zinc-300",
          "transition-colors hover:border-cyan-400/30 hover:bg-white/10 hover:text-white"
        )}
        aria-label={t("bellLabel")}
      >
        <Bell className="size-4" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex min-w-[18px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className={cn(
            "absolute right-0 top-11 z-50 w-[min(100vw-2rem,22rem)] overflow-hidden rounded-xl",
            "border border-white/10 bg-zinc-900/95 shadow-2xl shadow-black/50 backdrop-blur-xl"
          )}
        >
          <div className="flex items-center justify-between border-b border-white/5 px-4 py-3">
            <p className="text-sm font-semibold text-white">{t("title")}</p>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => void handleMarkAllRead()}
                className="text-xs text-violet-400 hover:underline"
              >
                {t("markAllRead")}
              </button>
            )}
          </div>

          <div className="border-b border-white/5 px-3 py-2">
            <NotificationFilterBar
              value={filter}
              onChange={setFilter}
              unreadByKind={unreadByKind}
              labels={filterLabels}
              size="sm"
            />
          </div>

          <div className="max-h-80 overflow-y-auto">
            {loading && notifications.length === 0 ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="size-5 animate-spin text-zinc-500" />
              </div>
            ) : notifications.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-zinc-500">
                {t("empty")}
              </p>
            ) : (
              notifications.slice(0, 8).map((item) => {
                const content = (
                  <>
                    <div className="flex items-start justify-between gap-2">
                      <p
                        className={cn(
                          "text-sm leading-snug",
                          item.read ? "text-zinc-400" : "font-medium text-white"
                        )}
                      >
                        {item.title}
                      </p>
                      {!item.read && (
                        <span className="mt-1 size-2 shrink-0 rounded-full bg-cyan-400" />
                      )}
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs text-zinc-500">
                      {item.body}
                    </p>
                    <p className="mt-1.5 text-[11px] text-zinc-600">
                      {formatRelativeTimeFromIso(item.createdAt, tcx, locale)}
                    </p>
                  </>
                );

                if (item.href) {
                  return (
                    <Link
                      key={item.id}
                      href={item.href}
                      onClick={() => {
                        if (!item.read) void handleMarkRead(item.id);
                        setOpen(false);
                      }}
                      className="block border-b border-white/5 px-4 py-3 transition hover:bg-white/5"
                    >
                      {content}
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
                    className="block w-full border-b border-white/5 px-4 py-3 text-left transition hover:bg-white/5"
                  >
                    {content}
                  </button>
                );
              })
            )}
          </div>

          <div className="border-t border-white/5 p-2">
            <Link
              href="/notifications"
              onClick={() => setOpen(false)}
              className="block rounded-lg px-3 py-2 text-center text-sm text-violet-400 hover:bg-white/5"
            >
              {t("viewAll")}
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
