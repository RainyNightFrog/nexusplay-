"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import type { RealtimeChannel } from "@supabase/supabase-js";
import type { ChatChannel, ChatMessage } from "@/lib/chat";
import { CHAT_LIMITS } from "@/lib/chat";
import { createClient } from "@/lib/supabase/client";

async function parseJsonResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    throw new Error("invalid response");
  }
  return (await response.json()) as T;
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

  const formatError = useCallback(
    (err: unknown, fallback: string) => {
      if (err instanceof Error && err.message === "invalid response") {
        return t("connectionFailed");
      }
      return err instanceof Error ? err.message : fallback;
    },
    [t]
  );

  const loadMessages = useCallback(async () => {
    if (!enabled) return;

    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/chat/messages?channel=${encodeURIComponent(channel)}`
      );
      const data = await parseJsonResponse<{
        messages?: ChatMessage[];
        error?: string;
      }>(response);

      if (!response.ok) {
        throw new Error(data.error ?? t("readFailed"));
      }

      setMessages(data.messages ?? []);
    } catch (err) {
      setError(formatError(err, t("readFailed")));
    } finally {
      setLoading(false);
    }
  }, [channel, enabled, formatError, t]);

  useEffect(() => {
    if (!enabled) {
      setMessages([]);
      return;
    }

    void loadMessages();
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
          void loadMessages();
        }
      )
      .subscribe();

    channelRef.current = realtimeChannel;

    return () => {
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
          await loadMessages();
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
