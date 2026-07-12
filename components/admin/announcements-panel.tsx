"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2, Megaphone, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { AdminPanelFrame } from "@/components/admin/admin-panel-frame";

type AnnouncementRow = {
  id: string;
  message: string;
  href: string | null;
  severity: "info" | "warning" | "success";
  active: boolean;
  createdAt: string;
  startsAt: string | null;
  endsAt: string | null;
};

const severityClass = {
  info: "border-cyan-400/30 bg-cyan-500/10 text-cyan-200",
  warning: "border-amber-400/30 bg-amber-500/10 text-amber-200",
  success: "border-emerald-400/30 bg-emerald-500/10 text-emerald-200",
} as const;

export function AdminAnnouncementsPanel() {
  const t = useTranslations("admin");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [announcements, setAnnouncements] = useState<AnnouncementRow[]>([]);
  const [message, setMessage] = useState("");
  const [href, setHref] = useState("");
  const [severity, setSeverity] = useState<"info" | "warning" | "success">(
    "info"
  );
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [creating, setCreating] = useState(false);
  const [deactivatingId, setDeactivatingId] = useState<string | null>(null);

  const loadAnnouncements = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/announcements");
      const data = (await response.json()) as {
        announcements?: AnnouncementRow[];
        error?: string;
      };
      if (!response.ok) throw new Error(data.error ?? t("announcementsLoadFailed"));
      setAnnouncements(data.announcements ?? []);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : t("announcementsLoadFailed")
      );
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void loadAnnouncements();
  }, [loadAnnouncements]);

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    if (!message.trim()) return;

    setCreating(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: message.trim(),
          href: href.trim() || undefined,
          severity,
          startsAt: startsAt.trim()
            ? new Date(startsAt).toISOString()
            : undefined,
          endsAt: endsAt.trim() ? new Date(endsAt).toISOString() : undefined,
        }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? t("announcementsCreateFailed"));
      setMessage("");
      setHref("");
      setSeverity("info");
      setStartsAt("");
      setEndsAt("");
      await loadAnnouncements();
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : t("announcementsCreateFailed")
      );
    } finally {
      setCreating(false);
    }
  }

  async function handleDeactivate(id: string) {
    if (!window.confirm(t("announcementsDeactivateConfirm"))) return;

    setDeactivatingId(id);
    setError(null);
    try {
      const response = await fetch(
        `/api/admin/announcements?id=${encodeURIComponent(id)}`,
        { method: "DELETE" }
      );
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? t("announcementsDeactivateFailed"));
      }
      await loadAnnouncements();
    } catch (deactivateError) {
      setError(
        deactivateError instanceof Error
          ? deactivateError.message
          : t("announcementsDeactivateFailed")
      );
    } finally {
      setDeactivatingId(null);
    }
  }

  return (
    <AdminPanelFrame
      title={t("tabAnnouncements")}
      description={t("announcementsDesc")}
      onRefresh={() => void loadAnnouncements()}
      refreshing={loading}
      refreshLabel={t("refresh")}
      error={error}
      centerContent
    >
      <Card className="border-white/10 bg-zinc-900/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Megaphone className="size-5 text-cyan-400" />
            {t("announcementsCreateTitle")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <Label htmlFor="announcement-message">{t("announcementsMessage")}</Label>
              <Input
                id="announcement-message"
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                className="mt-1.5 border-white/10 bg-white/5"
                placeholder={t("announcementsMessagePlaceholder")}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="announcement-href">{t("announcementsHref")}</Label>
                <Input
                  id="announcement-href"
                  value={href}
                  onChange={(event) => setHref(event.target.value)}
                  className="mt-1.5 border-white/10 bg-white/5"
                  placeholder="/legal#privacy"
                />
              </div>
              <div>
                <Label>{t("announcementsSeverity")}</Label>
                <Select
                  value={severity}
                  onValueChange={(value) =>
                    setSeverity(value as "info" | "warning" | "success")
                  }
                >
                  <SelectTrigger className="mt-1.5 border-white/10 bg-white/5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="info">{t("announcementsSeverityInfo")}</SelectItem>
                    <SelectItem value="warning">
                      {t("announcementsSeverityWarning")}
                    </SelectItem>
                    <SelectItem value="success">
                      {t("announcementsSeveritySuccess")}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="announcement-starts">{t("announcementsStartsAt")}</Label>
                <Input
                  id="announcement-starts"
                  type="datetime-local"
                  value={startsAt}
                  onChange={(event) => setStartsAt(event.target.value)}
                  className="mt-1.5 border-white/10 bg-white/5"
                />
              </div>
              <div>
                <Label htmlFor="announcement-ends">{t("announcementsEndsAt")}</Label>
                <Input
                  id="announcement-ends"
                  type="datetime-local"
                  value={endsAt}
                  onChange={(event) => setEndsAt(event.target.value)}
                  className="mt-1.5 border-white/10 bg-white/5"
                />
              </div>
            </div>
            <Button
              type="submit"
              disabled={creating || !message.trim()}
              className="gap-2 bg-cyan-600 hover:bg-cyan-500"
            >
              {creating ? <Loader2 className="size-4 animate-spin" /> : null}
              {t("announcementsCreate")}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="border-white/10 bg-zinc-900/60">
        <CardHeader>
          <CardTitle className="text-white">{t("announcementsListTitle")}</CardTitle>
          <CardDescription>{t("announcementsListDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="size-8 animate-spin text-cyan-400" />
            </div>
          ) : announcements.length === 0 ? (
            <p className="py-8 text-center text-sm text-zinc-500">
              {t("announcementsEmpty")}
            </p>
          ) : (
            <ul className="space-y-3">
              {announcements.map((item) => (
                <li
                  key={item.id}
                  className={cn(
                    "flex flex-wrap items-start justify-between gap-3 rounded-xl border px-4 py-3",
                    severityClass[item.severity]
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm">{item.message}</p>
                    {item.href && (
                      <p className="mt-1 text-xs opacity-80">{item.href}</p>
                    )}
                    {(item.startsAt || item.endsAt) && (
                      <p className="mt-1 text-xs opacity-70">
                        {item.startsAt
                          ? t("announcementsScheduleFrom", {
                              date: new Date(item.startsAt).toLocaleString(),
                            })
                          : null}
                        {item.startsAt && item.endsAt ? " · " : null}
                        {item.endsAt
                          ? t("announcementsScheduleUntil", {
                              date: new Date(item.endsAt).toLocaleString(),
                            })
                          : null}
                      </p>
                    )}
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Badge className="border-0 bg-black/20 text-[10px]">
                        {item.active
                          ? t("announcementsActive")
                          : t("announcementsInactive")}
                      </Badge>
                    </div>
                  </div>
                  {item.active && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={deactivatingId === item.id}
                      onClick={() => void handleDeactivate(item.id)}
                      className="gap-1 border-white/10 text-rose-200 hover:text-rose-100"
                    >
                      {deactivatingId === item.id ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="size-3.5" />
                      )}
                      {t("announcementsDeactivate")}
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </AdminPanelFrame>
  );
}
