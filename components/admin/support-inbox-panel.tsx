"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Loader2, MessageCircle, RefreshCw, Shield } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectDisplayValue,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { ChatInput } from "@/components/chat/chat-input";
import type { AdminSupportThread, SupportThreadStatus } from "@/lib/support-chat";
import { SUPPORT_CHAT_LIMITS } from "@/lib/support-chat";
import {
  AdminPanelHeader,
  adminPanelCenteredCardsClass,
} from "@/components/admin/admin-panel-header";
import { AdminLoadingState } from "@/components/admin/admin-loading-state";
import { cn } from "@/lib/utils";

function supportStatusLabel(
  status: string,
  t: ReturnType<typeof useTranslations<"admin">>
) {
  if (status === "all") return t("supportFilterAll");
  if (status === "open") return t("supportStatusOpen");
  if (status === "resolved") return t("supportStatusResolved");
  if (status === "closed") return t("supportStatusClosed");
  return status;
}

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

export function AdminSupportInboxPanel() {
  const t = useTranslations("admin");
  const locale = useLocale();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [threads, setThreads] = useState<AdminSupportThread[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<
    Array<{
      id: string;
      sender_type: string;
      sender_display_name: string;
      content: string;
      created_at: string;
      is_own: boolean;
    }>
  >([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"all" | SupportThreadStatus>(
    "all"
  );

  const loadThreads = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/support/threads", {
        cache: "no-store",
      });
      const data = (await response.json()) as {
        threads?: AdminSupportThread[];
        error?: string;
      };
      if (!response.ok) {
        throw new Error(data.error ?? t("supportLoadFailed"));
      }
      setThreads(data.threads ?? []);
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : t("supportLoadFailed")
      );
    } finally {
      setLoading(false);
    }
  }, [t]);

  const loadMessages = useCallback(
    async (threadId: string) => {
      setMessagesLoading(true);
      try {
        const response = await fetch(
          `/api/admin/support/threads/${encodeURIComponent(threadId)}/messages`,
          { cache: "no-store" }
        );
        const data = (await response.json()) as {
          messages?: typeof messages;
          error?: string;
        };
        if (!response.ok) {
          throw new Error(data.error ?? t("supportMessagesLoadFailed"));
        }
        setMessages(data.messages ?? []);
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : t("supportMessagesLoadFailed")
        );
      } finally {
        setMessagesLoading(false);
      }
    },
    [t]
  );

  useEffect(() => {
    void loadThreads();
    const timer = window.setInterval(() => {
      void loadThreads();
      if (selectedId) void loadMessages(selectedId);
    }, 10000);
    return () => window.clearInterval(timer);
  }, [loadThreads, loadMessages, selectedId]);

  useEffect(() => {
    if (!selectedId) {
      setMessages([]);
      return;
    }
    void loadMessages(selectedId);
  }, [selectedId, loadMessages]);

  const selectedThread = threads.find((thread) => thread.id === selectedId) ?? null;

  const filteredThreads = threads.filter((thread) =>
    statusFilter === "all" ? true : thread.status === statusFilter
  );

  async function handleSend(content: string) {
    if (!selectedId || !content.trim()) return false;
    setSending(true);
    try {
      const response = await fetch(
        `/api/admin/support/threads/${encodeURIComponent(selectedId)}/messages`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: content.trim() }),
        }
      );
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? t("supportSendFailed"));
      }
      await loadMessages(selectedId);
      await loadThreads();
      return true;
    } catch (sendError) {
      setError(
        sendError instanceof Error ? sendError.message : t("supportSendFailed")
      );
      return false;
    } finally {
      setSending(false);
    }
  }

  async function handleStatusChange(status: SupportThreadStatus) {
    if (!selectedId) return;
    try {
      const response = await fetch(
        `/api/admin/support/threads/${encodeURIComponent(selectedId)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        }
      );
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? t("supportStatusFailed"));
      }
      await loadThreads();
    } catch (statusError) {
      setError(
        statusError instanceof Error
          ? statusError.message
          : t("supportStatusFailed")
      );
    }
  }

  return (
    <div className={adminPanelCenteredCardsClass}>
      <AdminPanelHeader
        title={t("supportTitle")}
        description={t("supportDesc")}
        actions={
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void loadThreads()}
            className="gap-2 border-white/10 bg-white/5"
          >
            <RefreshCw className="size-4" />
            {t("supportRefresh")}
          </Button>
        }
      />

      {loading ? (
        <AdminLoadingState />
      ) : error ? (
        <p className="py-10 text-center text-sm text-rose-300">{error}</p>
      ) : (
        <div className="grid min-h-[520px] gap-4 lg:grid-cols-[minmax(0,320px)_1fr]">
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/50">
            <div className="border-b border-white/8 p-3">
              <Select
                value={statusFilter}
                onValueChange={(value) =>
                  setStatusFilter(value as typeof statusFilter)
                }
              >
                <SelectTrigger className="border-white/10 bg-zinc-950/60">
                  <SelectDisplayValue>
                    {supportStatusLabel(statusFilter, t)}
                  </SelectDisplayValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("supportFilterAll")}</SelectItem>
                  <SelectItem value="open">{t("supportStatusOpen")}</SelectItem>
                  <SelectItem value="resolved">
                    {t("supportStatusResolved")}
                  </SelectItem>
                  <SelectItem value="closed">{t("supportStatusClosed")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="max-h-[480px] overflow-y-auto p-2">
              {filteredThreads.length === 0 ? (
                <p className="px-3 py-10 text-center text-sm text-zinc-500">
                  {t("supportEmpty")}
                </p>
              ) : (
                filteredThreads.map((thread) => (
                  <button
                    key={thread.id}
                    type="button"
                    onClick={() => setSelectedId(thread.id)}
                    className={cn(
                      "mb-1 flex w-full flex-col gap-1 rounded-xl px-3 py-2.5 text-left transition-colors",
                      selectedId === thread.id
                        ? "bg-cyan-500/15"
                        : "hover:bg-white/5"
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-medium text-zinc-100">
                        {thread.creator_display_name}
                      </span>
                      {thread.unread_by_admin && (
                        <Badge className="border-cyan-400/30 bg-cyan-500/15 text-cyan-200">
                          {t("supportUnread")}
                        </Badge>
                      )}
                    </div>
                    <p className="truncate text-xs text-zinc-500">
                      {thread.last_message_preview || t("supportNoPreview")}
                    </p>
                    <p className="text-[10px] text-zinc-600">
                      {formatDate(thread.last_message_at, locale)}
                    </p>
                  </button>
                ))
              )}
            </div>
          </div>

          <div className="flex min-h-[520px] flex-col overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/50">
            {selectedThread ? (
              <>
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/8 px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold text-white">
                      {selectedThread.creator_display_name}
                    </p>
                    <p className="text-xs text-zinc-500">
                      {t("supportCreatorRole", {
                        role:
                          selectedThread.creator_role === "creator"
                            ? t("usersRoleCreator")
                            : selectedThread.creator_role === "player"
                              ? t("usersRolePlayer")
                              : selectedThread.creator_role,
                      })}
                    </p>
                  </div>
                  <Select
                    value={selectedThread.status}
                    onValueChange={(value) =>
                      void handleStatusChange(value as SupportThreadStatus)
                    }
                  >
                    <SelectTrigger className="w-[140px] border-white/10 bg-zinc-950/60">
                      <SelectDisplayValue>
                        {supportStatusLabel(selectedThread.status, t)}
                      </SelectDisplayValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">{t("supportStatusOpen")}</SelectItem>
                      <SelectItem value="resolved">
                        {t("supportStatusResolved")}
                      </SelectItem>
                      <SelectItem value="closed">{t("supportStatusClosed")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
                  {messagesLoading ? (
                    <div className="flex items-center justify-center py-10 text-sm text-zinc-500">
                      <Loader2 className="mr-2 size-4 animate-spin" />
                      {t("supportLoadingMessages")}
                    </div>
                  ) : messages.length === 0 ? (
                    <p className="py-10 text-center text-sm text-zinc-500">
                      {t("supportEmptyThread")}
                    </p>
                  ) : (
                    <div className="space-y-2.5">
                      {messages.map((message) => (
                        <div
                          key={message.id}
                          className={cn(
                            "flex",
                            message.is_own ? "justify-end" : "justify-start"
                          )}
                        >
                          <div
                            className={cn(
                              "max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed",
                              message.is_own
                                ? "bg-gradient-to-r from-cyan-600 to-violet-600 text-white"
                                : "border border-white/8 bg-zinc-950/80 text-zinc-200"
                            )}
                          >
                            {!message.is_own && (
                              <p className="mb-1 text-[10px] font-medium text-zinc-400">
                                {message.sender_display_name}
                              </p>
                            )}
                            {message.content}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <ChatInput
                  value={draft}
                  onChange={setDraft}
                  sending={sending}
                  maxLength={SUPPORT_CHAT_LIMITS.content}
                  onSend={handleSend}
                />
              </>
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
                <div className="flex size-12 items-center justify-center rounded-2xl bg-cyan-500/10 text-cyan-300">
                  <MessageCircle className="size-6" />
                </div>
                <p className="text-sm text-zinc-300">{t("supportSelectThread")}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
