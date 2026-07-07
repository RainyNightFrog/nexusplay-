"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import type { ChatChannel, ChatMessage } from "@/lib/chat";
import { CHAT_LIMITS } from "@/lib/chat";
import { createClient } from "@/lib/supabase/client";

function mergeMessages(existing: ChatMessage[], incoming: ChatMessage[]) {
  const map = new Map<string, ChatMessage>();
  for (const message of existing) map.set(message.id, message);
  for (const message of incoming) map.set(message.id, message);
  return [...map.values()].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
}

export function useChatMessages(channel: ChatChannel, enabled: boolean) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  const loadMessages = useCallback(async () => {
    if (!enabled) return;

    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/chat/messages?channel=${encodeURIComponent(channel)}`
      );
      const data = (await response.json()) as {
        messages?: ChatMessage[];
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "讀取聊天記錄失敗");
      }

      setMessages(data.messages ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "讀取聊天記錄失敗");
    } finally {
      setLoading(false);
    }
  }, [channel, enabled]);

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

        const data = (await response.json()) as {
          message?: ChatMessage;
          error?: string;
        };

        if (!response.ok) {
          throw new Error(data.error ?? "發送失敗");
        }

        if (data.message) {
          setMessages((prev) => mergeMessages(prev, [data.message!]));
        } else {
          await loadMessages();
        }

        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : "發送失敗");
        return false;
      } finally {
        setSending(false);
      }
    },
    [channel, enabled, loadMessages]
  );

  const recallMessage = useCallback(async (messageId: string) => {
    setError(null);
    try {
      const response = await fetch(`/api/chat/messages/${messageId}/recall`, {
        method: "PATCH",
      });

      const data = (await response.json()) as {
        message?: ChatMessage;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "回收失敗");
      }

      if (data.message) {
        setMessages((prev) =>
          prev.map((item) => (item.id === messageId ? data.message! : item))
        );
      }

      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "回收失敗");
      return false;
    }
  }, []);

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
