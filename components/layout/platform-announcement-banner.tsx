"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Megaphone, X } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { deferClientTask } from "@/lib/defer-client";
import { cn } from "@/lib/utils";

type Announcement = {
  id: string;
  message: string;
  href: string | null;
  severity: "info" | "warning" | "success";
};

const severityClass = {
  info: "border-cyan-400/25 bg-cyan-500/10 text-cyan-100",
  warning: "border-amber-400/25 bg-amber-500/10 text-amber-100",
  success: "border-emerald-400/25 bg-emerald-500/10 text-emerald-100",
} as const;

export function PlatformAnnouncementBanner() {
  const t = useTranslations("announcements");
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    return deferClientTask(() => {
      fetch("/api/announcements/active")
        .then((response) => response.json())
        .then((data: { announcements?: Announcement[] }) => {
          setAnnouncements(data.announcements ?? []);
        })
        .catch(() => setAnnouncements([]));
    });
  }, []);

  const visible = announcements.filter((item) => !dismissed.has(item.id));
  if (visible.length === 0) return null;

  return (
    <div className="border-b border-white/5 bg-zinc-950/80">
      <div className="mx-auto max-w-7xl space-y-2 px-4 py-2 sm:px-6 lg:px-8">
        {visible.map((item) => (
          <div
            key={item.id}
            className={cn(
              "flex items-start justify-between gap-3 rounded-xl border px-3 py-2 text-sm",
              severityClass[item.severity]
            )}
          >
            <div className="flex min-w-0 items-start gap-2">
              <Megaphone className="mt-0.5 size-4 shrink-0" />
              <div className="min-w-0">
                {item.href ? (
                  <Link href={item.href} className="hover:underline">
                    {item.message}
                  </Link>
                ) : (
                  <p>{item.message}</p>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={() =>
                setDismissed((current) => new Set([...current, item.id]))
              }
              className="shrink-0 rounded p-1 opacity-70 hover:opacity-100"
              aria-label={t("dismiss")}
            >
              <X className="size-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
