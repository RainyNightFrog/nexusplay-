"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2, Megaphone, Pencil, RotateCcw, Trash2, X } from "lucide-react";
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
  SelectDisplayValue,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { AdminPanelFrame } from "@/components/admin/admin-panel-frame";
import { AdminLoadingState } from "@/components/admin/admin-loading-state";

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

function toDatetimeLocalValue(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function AdminAnnouncementsPanel() {
  const t = useTranslations("admin");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [announcements, setAnnouncements] = useState<AnnouncementRow[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [href, setHref] = useState("");
  const [severity, setSeverity] = useState<"info" | "warning" | "success">(
    "info"
  );
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

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

  function resetForm() {
    setEditingId(null);
    setMessage("");
    setHref("");
    setSeverity("info");
    setStartsAt("");
    setEndsAt("");
  }

  function startEdit(item: AnnouncementRow) {
    setEditingId(item.id);
    setMessage(item.message);
    setHref(item.href ?? "");
    setSeverity(item.severity);
    setStartsAt(toDatetimeLocalValue(item.startsAt));
    setEndsAt(toDatetimeLocalValue(item.endsAt));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!message.trim()) return;

    setSaving(true);
    setError(null);
    try {
      const payload = {
        message: message.trim(),
        href: href.trim() || undefined,
        severity,
        startsAt: startsAt.trim()
          ? new Date(startsAt).toISOString()
          : undefined,
        endsAt: endsAt.trim() ? new Date(endsAt).toISOString() : undefined,
      };

      const response = await fetch("/api/admin/announcements", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          editingId
            ? {
                id: editingId,
                ...payload,
                href: href.trim() || null,
                startsAt: startsAt.trim()
                  ? new Date(startsAt).toISOString()
                  : null,
                endsAt: endsAt.trim() ? new Date(endsAt).toISOString() : null,
              }
            : payload
        ),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(
          data.error ??
            (editingId
              ? t("announcementsUpdateFailed")
              : t("announcementsCreateFailed"))
        );
      }
      resetForm();
      await loadAnnouncements();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : editingId
            ? t("announcementsUpdateFailed")
            : t("announcementsCreateFailed")
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDeactivate(id: string) {
    if (!window.confirm(t("announcementsDeactivateConfirm"))) return;

    setBusyId(id);
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
      if (editingId === id) resetForm();
      await loadAnnouncements();
    } catch (deactivateError) {
      setError(
        deactivateError instanceof Error
          ? deactivateError.message
          : t("announcementsDeactivateFailed")
      );
    } finally {
      setBusyId(null);
    }
  }

  async function handleReactivate(id: string) {
    setBusyId(id);
    setError(null);
    try {
      const response = await fetch("/api/admin/announcements", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action: "reactivate" }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? t("announcementsReactivateFailed"));
      }
      await loadAnnouncements();
    } catch (reactivateError) {
      setError(
        reactivateError instanceof Error
          ? reactivateError.message
          : t("announcementsReactivateFailed")
      );
    } finally {
      setBusyId(null);
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
            {editingId
              ? t("announcementsEditTitle")
              : t("announcementsCreateTitle")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
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
                    <SelectDisplayValue>
                      {severity === "warning"
                        ? t("announcementsSeverityWarning")
                        : severity === "success"
                          ? t("announcementsSeveritySuccess")
                          : t("announcementsSeverityInfo")}
                    </SelectDisplayValue>
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
            <div className="flex flex-wrap gap-2">
              <Button
                type="submit"
                disabled={saving || !message.trim()}
                className="gap-2 bg-cyan-600 hover:bg-cyan-500"
              >
                {saving ? <Loader2 className="size-4 animate-spin" /> : null}
                {editingId ? t("announcementsSave") : t("announcementsCreate")}
              </Button>
              {editingId && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={resetForm}
                  className="gap-1.5 border-white/10"
                >
                  <X className="size-3.5" />
                  {t("announcementsCancelEdit")}
                </Button>
              )}
            </div>
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
            <AdminLoadingState spinnerClassName="text-cyan-400" minHeightClassName="min-h-0" />
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
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={busyId === item.id}
                      onClick={() => startEdit(item)}
                      className="gap-1 border-white/10"
                    >
                      <Pencil className="size-3.5" />
                      {t("announcementsEdit")}
                    </Button>
                    {item.active ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={busyId === item.id}
                        onClick={() => void handleDeactivate(item.id)}
                        className="gap-1 border-white/10 text-rose-200 hover:text-rose-100"
                      >
                        {busyId === item.id ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="size-3.5" />
                        )}
                        {t("announcementsDeactivate")}
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={busyId === item.id}
                        onClick={() => void handleReactivate(item.id)}
                        className="gap-1 border-emerald-400/20 text-emerald-200"
                      >
                        {busyId === item.id ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <RotateCcw className="size-3.5" />
                        )}
                        {t("announcementsReactivate")}
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </AdminPanelFrame>
  );
}
