"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { motion } from "framer-motion";
import {
  CheckCircle2,
  ClipboardList,
  Loader2,
  MessageSquare,
  RefreshCw,
  ShieldAlert,
  XCircle,
} from "lucide-react";
import { AdminShell } from "@/components/admin/admin-shell";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import type {
  AdminFeedbackRecord,
  AdminGameRecord,
  AdminLogRecord,
  FeedbackStatus,
  GameApprovalStatus,
} from "@/lib/admin-service";
import { cn } from "@/lib/utils";

type AdminStats = {
  pendingGames: number;
  unreadFeedbacks: number;
};

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

function statusBadgeClass(status: GameApprovalStatus | FeedbackStatus) {
  switch (status) {
    case "pending":
    case "unread":
      return "border-amber-400/30 bg-amber-500/10 text-amber-200";
    case "approved":
    case "resolved":
      return "border-emerald-400/30 bg-emerald-500/10 text-emerald-200";
    case "rejected":
      return "border-rose-400/30 bg-rose-500/10 text-rose-200";
    default:
      return "border-white/10 bg-white/5 text-zinc-300";
  }
}

export default function AdminPage() {
  const t = useTranslations("admin");
  const locale = useLocale();

  const [pageError, setPageError] = useState<string | null>(null);

  const [stats, setStats] = useState<AdminStats>({
    pendingGames: 0,
    unreadFeedbacks: 0,
  });
  const [games, setGames] = useState<AdminGameRecord[]>([]);
  const [feedbacks, setFeedbacks] = useState<AdminFeedbackRecord[]>([]);
  const [logs, setLogs] = useState<AdminLogRecord[]>([]);
  const [gameFilter, setGameFilter] = useState<GameApprovalStatus | "all">(
    "pending"
  );
  const [feedbackFilter, setFeedbackFilter] = useState<FeedbackStatus | "all">(
    "unread"
  );
  const [loadingGames, setLoadingGames] = useState(true);
  const [loadingFeedbacks, setLoadingFeedbacks] = useState(true);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<AdminGameRecord | null>(
    null
  );
  const [rejectReason, setRejectReason] = useState("");

  const loadGames = useCallback(async () => {
    setLoadingGames(true);
    try {
      const response = await fetch(
        `/api/admin/games?status=${encodeURIComponent(gameFilter)}`,
        { credentials: "same-origin" }
      );
      const data = (await response.json()) as {
        games?: AdminGameRecord[];
        stats?: AdminStats;
        error?: string;
      };
      if (!response.ok) throw new Error(data.error ?? t("actionFailed"));
      setGames(data.games ?? []);
      if (data.stats) setStats(data.stats);
      setPageError(null);
    } catch (error) {
      setPageError(error instanceof Error ? error.message : t("actionFailed"));
    } finally {
      setLoadingGames(false);
    }
  }, [gameFilter, t]);

  const loadFeedbacks = useCallback(async () => {
    setLoadingFeedbacks(true);
    try {
      const response = await fetch(
        `/api/admin/feedbacks?status=${encodeURIComponent(feedbackFilter)}`,
        { credentials: "same-origin" }
      );
      const data = (await response.json()) as {
        feedbacks?: AdminFeedbackRecord[];
        error?: string;
      };
      if (!response.ok) throw new Error(data.error ?? t("actionFailed"));
      setFeedbacks(data.feedbacks ?? []);
      setPageError(null);
    } catch (error) {
      setPageError(error instanceof Error ? error.message : t("actionFailed"));
    } finally {
      setLoadingFeedbacks(false);
    }
  }, [feedbackFilter, t]);

  const loadLogs = useCallback(async () => {
    setLoadingLogs(true);
    try {
      const response = await fetch("/api/admin/logs?limit=50", {
        credentials: "same-origin",
      });
      const data = (await response.json()) as {
        logs?: AdminLogRecord[];
        error?: string;
      };
      if (!response.ok) throw new Error(data.error ?? t("actionFailed"));
      setLogs(data.logs ?? []);
      setPageError(null);
    } catch (error) {
      setPageError(error instanceof Error ? error.message : t("actionFailed"));
    } finally {
      setLoadingLogs(false);
    }
  }, [t]);

  useEffect(() => {
    void loadGames();
  }, [loadGames]);

  useEffect(() => {
    void loadFeedbacks();
  }, [loadFeedbacks]);

  useEffect(() => {
    void loadLogs();
  }, [loadLogs]);

  async function handleGameAction(
    game: AdminGameRecord,
    status: "approved" | "rejected",
    details?: string
  ) {
    setActionId(`game-${game.id}`);
    try {
      const response = await fetch(`/api/admin/games/${game.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ status, details }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? t("actionFailed"));
      setRejectTarget(null);
      setRejectReason("");
      await Promise.all([loadGames(), loadLogs()]);
      setPageError(null);
    } catch (error) {
      setPageError(error instanceof Error ? error.message : t("actionFailed"));
    } finally {
      setActionId(null);
    }
  }

  async function handleResolveFeedback(feedback: AdminFeedbackRecord) {
    setActionId(`feedback-${feedback.id}`);
    try {
      const response = await fetch(`/api/admin/feedbacks/${feedback.id}`, {
        method: "PATCH",
        credentials: "same-origin",
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? t("actionFailed"));
      await Promise.all([loadFeedbacks(), loadGames(), loadLogs()]);
      setPageError(null);
    } catch (error) {
      setPageError(error instanceof Error ? error.message : t("actionFailed"));
    } finally {
      setActionId(null);
    }
  }

  const gameStatusLabel = (status: GameApprovalStatus) => {
    if (status === "pending") return t("statusPending");
    if (status === "approved") return t("statusApproved");
    return t("statusRejected");
  };

  const feedbackStatusLabel = (status: FeedbackStatus) =>
    status === "unread" ? t("statusUnread") : t("statusResolved");

  return (
    <AdminShell title={t("title")} description={t("description")}>
      {pageError && (
        <div className="mb-6 rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {pageError}
        </div>
      )}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="border-amber-400/20 bg-zinc-900/60">
          <CardHeader className="pb-2">
            <CardDescription>{t("statPending")}</CardDescription>
            <CardTitle className="text-3xl text-amber-200">
              {stats.pendingGames}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-cyan-400/20 bg-zinc-900/60">
          <CardHeader className="pb-2">
            <CardDescription>{t("statUnread")}</CardDescription>
            <CardTitle className="text-3xl text-cyan-200">
              {stats.unreadFeedbacks}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-violet-400/20 bg-zinc-900/60 sm:col-span-2 lg:col-span-1">
          <CardHeader className="pb-2">
            <CardDescription>{t("tabLogs")}</CardDescription>
            <CardTitle className="text-3xl text-violet-200">{logs.length}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Tabs defaultValue="games">
        <TabsList className="mb-6 border border-white/10 bg-zinc-900/80 p-1">
          <TabsTrigger value="games" className="gap-1.5 px-4">
            <ShieldAlert className="size-4" />
            {t("tabGames")}
          </TabsTrigger>
          <TabsTrigger value="feedbacks" className="gap-1.5 px-4">
            <MessageSquare className="size-4" />
            {t("tabFeedbacks")}
          </TabsTrigger>
          <TabsTrigger value="logs" className="gap-1.5 px-4">
            <ClipboardList className="size-4" />
            {t("tabLogs")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="games">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <Select
              value={gameFilter}
              onValueChange={(value) =>
                setGameFilter(value as GameApprovalStatus | "all")
              }
            >
              <SelectTrigger className="w-44 border-white/10 bg-zinc-900/80">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">{t("filterPending")}</SelectItem>
                <SelectItem value="approved">{t("filterApproved")}</SelectItem>
                <SelectItem value="rejected">{t("filterRejected")}</SelectItem>
                <SelectItem value="all">{t("filterAll")}</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void loadGames()}
              disabled={loadingGames}
              className="border-white/10 bg-white/5"
            >
              <RefreshCw
                className={cn("size-4", loadingGames && "animate-spin")}
              />
              {t("refresh")}
            </Button>
          </div>

          {loadingGames ? (
            <div className="flex h-40 items-center justify-center">
              <Loader2 className="size-8 animate-spin text-amber-400" />
            </div>
          ) : games.length === 0 ? (
            <Card className="border-white/10 bg-zinc-900/40">
              <CardContent className="py-12 text-center text-sm text-zinc-500">
                {t("emptyGames")}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {games.map((game, index) => (
                <motion.div
                  key={game.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.04 }}
                >
                  <Card className="overflow-hidden border-white/10 bg-zinc-900/60">
                    <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start">
                      <div className="relative h-24 w-full shrink-0 overflow-hidden rounded-xl sm:h-20 sm:w-32">
                        <Image
                          src={game.cover_url}
                          alt={game.title}
                          fill
                          className="object-cover"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold text-white">{game.title}</h3>
                          <Badge
                            className={cn(
                              "border",
                              statusBadgeClass(game.status)
                            )}
                          >
                            {gameStatusLabel(game.status)}
                          </Badge>
                          <Badge className="border-white/10 bg-white/5 text-zinc-400">
                            {game.category}
                          </Badge>
                        </div>
                        <p className="mt-2 line-clamp-2 text-sm text-zinc-400">
                          {game.description}
                        </p>
                        <p className="mt-2 text-xs text-zinc-500">
                          {t("gameCreated")} · {formatDate(game.created_at, locale)}
                        </p>
                      </div>
                      {game.status === "pending" && (
                        <div className="flex shrink-0 gap-2 sm:flex-col">
                          <Button
                            size="sm"
                            disabled={actionId === `game-${game.id}`}
                            onClick={() => void handleGameAction(game, "approved")}
                            className="bg-emerald-600 hover:bg-emerald-500"
                          >
                            {actionId === `game-${game.id}` ? (
                              <Loader2 className="size-4 animate-spin" />
                            ) : (
                              <CheckCircle2 className="size-4" />
                            )}
                            {t("approve")}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={actionId === `game-${game.id}`}
                            onClick={() => setRejectTarget(game)}
                            className="border-rose-400/30 text-rose-300 hover:bg-rose-500/10"
                          >
                            <XCircle className="size-4" />
                            {t("reject")}
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="feedbacks">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <Select
              value={feedbackFilter}
              onValueChange={(value) =>
                setFeedbackFilter(value as FeedbackStatus | "all")
              }
            >
              <SelectTrigger className="w-44 border-white/10 bg-zinc-900/80">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unread">{t("filterUnread")}</SelectItem>
                <SelectItem value="resolved">{t("filterResolved")}</SelectItem>
                <SelectItem value="all">{t("filterAll")}</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void loadFeedbacks()}
              disabled={loadingFeedbacks}
              className="border-white/10 bg-white/5"
            >
              <RefreshCw
                className={cn("size-4", loadingFeedbacks && "animate-spin")}
              />
              {t("refresh")}
            </Button>
          </div>

          {loadingFeedbacks ? (
            <div className="flex h-40 items-center justify-center">
              <Loader2 className="size-8 animate-spin text-cyan-400" />
            </div>
          ) : feedbacks.length === 0 ? (
            <Card className="border-white/10 bg-zinc-900/40">
              <CardContent className="py-12 text-center text-sm text-zinc-500">
                {t("emptyFeedbacks")}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {feedbacks.map((feedback) => (
                <Card
                  key={feedback.id}
                  className="border-white/10 bg-zinc-900/60"
                >
                  <CardHeader className="pb-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <CardTitle className="text-base text-white">
                          {feedback.subject}
                        </CardTitle>
                        <CardDescription className="mt-1">
                          {feedback.email || t("feedbackAnonymous")} ·{" "}
                          {formatDate(feedback.created_at, locale)}
                        </CardDescription>
                      </div>
                      <Badge
                        className={cn(
                          "border",
                          statusBadgeClass(feedback.status)
                        )}
                      >
                        {feedbackStatusLabel(feedback.status)}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="whitespace-pre-wrap text-sm text-zinc-300">
                      {feedback.message}
                    </p>
                    {feedback.status === "unread" && (
                      <Button
                        size="sm"
                        disabled={actionId === `feedback-${feedback.id}`}
                        onClick={() => void handleResolveFeedback(feedback)}
                        className="bg-cyan-600 hover:bg-cyan-500"
                      >
                        {actionId === `feedback-${feedback.id}` ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <CheckCircle2 className="size-4" />
                        )}
                        {t("markResolved")}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="logs">
          <div className="mb-4 flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => void loadLogs()}
              disabled={loadingLogs}
              className="border-white/10 bg-white/5"
            >
              <RefreshCw
                className={cn("size-4", loadingLogs && "animate-spin")}
              />
              {t("refresh")}
            </Button>
          </div>

          {loadingLogs ? (
            <div className="flex h-40 items-center justify-center">
              <Loader2 className="size-8 animate-spin text-violet-400" />
            </div>
          ) : logs.length === 0 ? (
            <Card className="border-white/10 bg-zinc-900/40">
              <CardContent className="py-12 text-center text-sm text-zinc-500">
                {t("emptyLogs")}
              </CardContent>
            </Card>
          ) : (
            <Card className="border-white/10 bg-zinc-900/60">
              <CardContent className="divide-y divide-white/5 p-0">
                {logs.map((log) => (
                  <div
                    key={log.id}
                    className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="text-sm font-medium text-white">
                        {log.action}
                      </p>
                      {log.details && (
                        <p className="mt-0.5 text-sm text-zinc-400">
                          {log.details}
                        </p>
                      )}
                    </div>
                    <p className="shrink-0 text-xs text-zinc-500">
                      {formatDate(log.created_at, locale)}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <Dialog
        open={rejectTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setRejectTarget(null);
            setRejectReason("");
          }
        }}
      >
        <DialogContent className="border-white/10 bg-zinc-900">
          <DialogHeader>
            <DialogTitle>{t("reject")}</DialogTitle>
            <DialogDescription>
              {rejectTarget?.title}
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={rejectReason}
            onChange={(event) => setRejectReason(event.target.value)}
            placeholder={t("rejectReason")}
            className="min-h-24 border-white/10 bg-white/5"
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRejectTarget(null);
                setRejectReason("");
              }}
              className="border-white/10"
            >
              {t("cancel")}
            </Button>
            <Button
              disabled={!rejectTarget || actionId === `game-${rejectTarget.id}`}
              onClick={() => {
                if (!rejectTarget) return;
                void handleGameAction(
                  rejectTarget,
                  "rejected",
                  rejectReason.trim() || undefined
                );
              }}
              className="bg-rose-600 hover:bg-rose-500"
            >
              {t("rejectConfirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminShell>
  );
}
