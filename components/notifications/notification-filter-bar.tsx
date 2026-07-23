"use client";

import type { UserNotificationKind } from "@/lib/user-notifications-service";
import { cn } from "@/lib/utils";

export type NotificationFilter = "all" | UserNotificationKind;

type NotificationFilterBarProps = {
  value: NotificationFilter;
  onChange: (value: NotificationFilter) => void;
  unreadByKind?: Partial<Record<UserNotificationKind, number>>;
  labels: {
    all: string;
    tip: string;
    forum: string;
    newGame: string;
    wishlistDevlog: string;
  };
  className?: string;
  size?: "sm" | "md";
};

const FILTERS: NotificationFilter[] = [
  "all",
  "tip_received",
  "forum_reply",
  "followed_new_game",
  "wishlist_devlog",
];

export function NotificationFilterBar({
  value,
  onChange,
  unreadByKind,
  labels,
  className,
  size = "md",
}: NotificationFilterBarProps) {
  function labelFor(filter: NotificationFilter) {
    if (filter === "all") return labels.all;
    if (filter === "tip_received") return labels.tip;
    if (filter === "forum_reply") return labels.forum;
    if (filter === "wishlist_devlog") return labels.wishlistDevlog;
    return labels.newGame;
  }

  function unreadFor(filter: NotificationFilter) {
    if (filter === "all") return 0;
    return unreadByKind?.[filter] ?? 0;
  }

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {FILTERS.map((filter) => {
        const active = value === filter;
        const unread = unreadFor(filter);

        return (
          <button
            key={filter}
            type="button"
            onClick={() => onChange(filter)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border transition",
              size === "sm" ? "px-2.5 py-1 text-[11px]" : "px-3 py-1.5 text-xs",
              active
                ? "border-cyan-400/40 bg-cyan-500/15 text-cyan-100"
                : "border-white/10 bg-white/5 text-zinc-400 hover:border-white/20 hover:text-zinc-200"
            )}
          >
            {labelFor(filter)}
            {unread > 0 && (
              <span className="rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                {unread > 99 ? "99+" : unread}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
