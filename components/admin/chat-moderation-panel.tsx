"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Loader2, MessageCircle, RefreshCw, Trash2 } from "lucide-react";
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
  Select,
  SelectContent,
  SelectDisplayValue,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import type { AdminChatMessageRecord } from "@/lib/admin-chat-moderation-service";
import {
  AdminPanelHeader,
  adminPanelCenteredCardsClass,
} from "@/components/admin/admin-panel-header";
import { AdminLoadingState } from "@/components/admin/admin-loading-state";
import { cn } from "@/lib/utils";

type ChannelFilter = "all" | "world" | "creator";

function channelFilterLabel(
  channel: ChannelFilter,
  t: ReturnType<typeof useTranslations<"admin">>
) {
  if (channel === "world") return t("chatChannelWorld");
  if (channel === "creator") return t("chatChannelCreator");
  return t("chatChannelAll");
}

function channelLabel(
  channel: string,
  t: ReturnType<typeof useTranslations<"admin">>
) {
  if (channel === "world") return t("chatChannelWorld");
  if (channel === "creator") return t("chatChannelCreator");
  return channel;
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

export function AdminChatModerationPanel() {
  const t = useTranslations("admin");
  const locale = useLocale();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [channel, setChannel] = useState<ChannelFilter>("all");
  const [messages, setMessages] = useState<AdminChatMessageRecord[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadMessages = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ channel });
      const response = await fetch(`/api/admin/chat/messages?${params.toString()}`);
      const data = (await response.json()) as {
        messages?: AdminChatMessageRecord[];
        error?: string;
      };
      if (!response.ok) throw new Error(data.error ?? t("chatLoadFailed"));
      setMessages(data.messages ?? []);
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : t("chatLoadFailed")
      );
    } finally {
      setLoading(false);
    }
  }, [channel, t]);

  useEffect(() => {
    void loadMessages();
  }, [loadMessages]);

  async function handleDelete(messageId: string) {
    if (!window.confirm(t("chatDeleteConfirm"))) return;

    setDeletingId(messageId);
    setError(null);
    try {
      const response = await fetch(`/api/admin/chat/messages/${messageId}`, {
        method: "DELETE",
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? t("chatDeleteFailed"));
      await loadMessages();
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : t("chatDeleteFailed")
      );
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className={cn("space-y-6", adminPanelCenteredCardsClass)}>
      <AdminPanelHeader
        title={t("tabChat")}
        description={t("chatDesc")}
        actions={
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void loadMessages()}
            disabled={loading}
            className="gap-2 border-white/10"
          >
            <RefreshCw className={cn("size-4", loading && "animate-spin")} />
            {t("refresh")}
          </Button>
        }
      />

      {error && <p className="text-center text-sm text-rose-400">{error}</p>}

      <div className="flex items-center gap-3">
        <span className="text-sm text-zinc-400">{t("chatChannelFilter")}</span>
        <Select
          value={channel}
          onValueChange={(value) => setChannel(value as ChannelFilter)}
        >
          <SelectTrigger className="w-40 border-white/10 bg-zinc-900/60 text-white">
            <SelectDisplayValue>
              {channelFilterLabel(channel, t)}
            </SelectDisplayValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("chatChannelAll")}</SelectItem>
            <SelectItem value="world">{t("chatChannelWorld")}</SelectItem>
            <SelectItem value="creator">{t("chatChannelCreator")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="border-white/8 bg-zinc-900/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base text-white">
            <MessageCircle className="size-4 text-sky-400" />
            {t("chatMessagesTitle")}
          </CardTitle>
          <CardDescription>{t("chatMessagesDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <AdminLoadingState spinnerClassName="text-sky-400" minHeightClassName="min-h-0" />
          ) : messages.length === 0 ? (
            <p className="py-8 text-center text-sm text-zinc-500">
              {t("chatMessagesEmpty")}
            </p>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-white/8 bg-black/20 px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium text-white">
                      {message.authorName}
                    </p>
                    <Badge className="border border-white/10 bg-white/5 text-zinc-300">
                      {channelLabel(message.channel, t)}
                    </Badge>
                    {message.recalledAt && (
                      <Badge className="border border-amber-400/30 bg-amber-500/10 text-amber-200">
                        {t("chatRecalled")}
                      </Badge>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-zinc-300">{message.content}</p>
                  <p className="mt-1 text-xs text-zinc-500">
                    {formatDate(message.createdAt, locale)}
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={deletingId === message.id}
                  onClick={() => void handleDelete(message.id)}
                  className="gap-1.5 border-rose-400/20 text-rose-200"
                >
                  {deletingId === message.id ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="size-3.5" />
                  )}
                  {t("chatDelete")}
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
