"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import type { RealtimeChannel } from "@supabase/supabase-js";
import type { ChatChannel, ChatMessage } from "@/lib/chat";
import { CHAT_LIMITS } from "@/lib/chat";
import { createClient } from "@/lib/supabase/client";

/** 輪詢間隔：本機開發時觸發 maintainAmbientChat；亦作 Realtime 後備 */
export const CHAT_POLL_INTERVAL_MS = 60_000;

const CHAT_FETCH_TIMEOUT_MS = 15_000;
const REALTIME_RELOAD_DEBOUNCE_MS = 400;

/** 對非當前分頁的頻道背景輪詢，確保世界／創作者頻道虛擬發言在本機也能觸發 */
export function useAmbientChatBackgroundPoll(
  channels: ChatChannel[],
  enabled: boolean
) {
  const channelsKey = channels.join(",");

  useEffect(() => {
    if (!enabled || !channelsKey) return;

    const targetChannels = channelsKey.split(",") as ChatChannel[];
    const poll = () => {
      for (const channel of targetChannels) {
        void fetch(`/api/chat/messages?channel=${encodeURIComponent(channel)}`);
      }
    };

    const timer = window.setInterval(poll, CHAT_POLL_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [channelsKey, enabled]);
}

async function parseJsonResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    throw new Error("invalid response");
  }
  return (await response.json()) as T;
}

async function fetchChatMessages(
  channel: ChatChannel,
  signal: AbortSignal
): Promise<ChatMessage[]> {
  const response = await fetch(
    `/api/chat/messages?channel=${encodeURIComponent(channel)}`,
    { signal }
  );
  const data = await parseJsonResponse<{
    messages?: ChatMessage[];
    error?: string;
  }>(response);

  if (!response.ok) {
    throw new Error(data.error ?? "read failed");
  }

  return data.messages ?? [];
}

function mergeMessages(existing: ChatMessage[], incoming: ChatMessage[]) {
  const map = new Map<string, ChatMessage>();
  for (const message of existing) map.set(message.id, message);
  for (const message of incoming) map.set(message.id, message);
  return [...map.values()].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
}

export function useChatMessages(channel: ChatChannel, enabled: boolean) {
  const t = useTranslations("chat");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const loadGenerationRef = useRef(0);
  const realtimeDebounceRef = useRef<number | null>(null);

  const formatError = useCallback(
    (err: unknown, fallback: string) => {
      if (err instanceof DOMException && err.name === "AbortError") {
        return t("connectionFailed");
      }
      if (err instanceof Error && err.message === "invalid response") {
        return t("connectionFailed");
      }
      return err instanceof Error ? err.message : fallback;
    },
    [t]
  );

  const loadMessages = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!enabled) return;

      const generation = ++loadGenerationRef.current;
      const silent = options?.silent ?? false;

      if (!silent) setLoading(true);
      setError(null);

      const controller = new AbortController();
      const timeoutId = window.setTimeout(
        () => controller.abort(),
        CHAT_FETCH_TIMEOUT_MS
      );

      try {
        const incoming = await fetchChatMessages(channel, controller.signal);
        if (generation !== loadGenerationRef.current) return;

        setMessages(incoming);
      } catch (err) {
        if (generation !== loadGenerationRef.current) return;
        setError(formatError(err, t("readFailed")));
      } finally {
        window.clearTimeout(timeoutId);
        if (generation === loadGenerationRef.current && !silent) {
          setLoading(false);
        }
      }
    },
    [channel, enabled, formatError, t]
  );

  useEffect(() => {
    loadGenerationRef.current += 1;

    if (!enabled) {
      setMessages([]);
      setLoading(false);
      setError(null);
      return;
    }

    setMessages([]);
    void loadMessages();
  }, [channel, enabled, loadMessages]);

  useEffect(() => {
    if (!enabled) return;

    const timer = window.setInterval(() => {
      void loadMessages({ silent: true });
    }, CHAT_POLL_INTERVAL_MS);

    return () => window.clearInterval(timer);
  }, [enabled, loadMessages]);

  useEffect(() => {
    if (!enabled) return;

    const supabase = createClient();
    const realtimeChannel = supabase
      .channel(`chat:${channel}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "chat_messages",
          filter: `channel=eq.${channel}`,
        },
        () => {
          if (realtimeDebounceRef.current) {
            window.clearTimeout(realtimeDebounceRef.current);
          }
          realtimeDebounceRef.current = window.setTimeout(() => {
            void loadMessages({ silent: true });
          }, REALTIME_RELOAD_DEBOUNCE_MS);
        }
      )
      .subscribe();

    channelRef.current = realtimeChannel;

    return () => {
      if (realtimeDebounceRef.current) {
        window.clearTimeout(realtimeDebounceRef.current);
        realtimeDebounceRef.current = null;
      }
      void supabase.removeChannel(realtimeChannel);
      channelRef.current = null;
    };
  }, [channel, enabled, loadMessages]);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!enabled) return false;

      setSending(true);
      setError(null);
      try {
        const response = await fetch("/api/chat/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ channel, content }),
        });

        const data = await parseJsonResponse<{
          message?: ChatMessage;
          error?: string;
        }>(response);

        if (!response.ok) {
          throw new Error(data.error ?? t("sendFailed"));
        }

        if (data.message) {
          setMessages((prev) => mergeMessages(prev, [data.message!]));
        } else {
          await loadMessages({ silent: true });
        }

        return true;
      } catch (err) {
        setError(formatError(err, t("sendFailed")));
        return false;
      } finally {
        setSending(false);
      }
    },
    [channel, enabled, formatError, loadMessages, t]
  );

  const recallMessage = useCallback(async (messageId: string) => {
    setError(null);
    try {
      const response = await fetch(`/api/chat/messages/${messageId}/recall`, {
        method: "PATCH",
      });

      const data = await parseJsonResponse<{
        message?: ChatMessage;
        error?: string;
      }>(response);

      if (!response.ok) {
        throw new Error(data.error ?? t("recallFailed"));
      }

      if (data.message) {
        setMessages((prev) =>
          prev.map((item) => (item.id === messageId ? data.message! : item))
        );
      }

      return true;
    } catch (err) {
      setError(formatError(err, t("recallFailed")));
      return false;
    }
  }, [formatError, t]);

  const canRecall = useCallback((message: ChatMessage) => {
    if (!message.is_own || message.recalled_at) return false;
    const age = Date.now() - new Date(message.created_at).getTime();
    return age <= CHAT_LIMITS.recallWindowMs;
  }, []);

  return {
    messages,
    loading,
    sending,
    error,
    sendMessage,
    recallMessage,
    canRecall,
    reload: loadMessages,
    setError,
  };
}
