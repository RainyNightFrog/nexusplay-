"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import type {
  PlayerDmContact,
  PlayerDmMessage,
  PlayerDmThreadSummary,
} from "@/lib/player-dm";

export function usePlayerDmContacts(enabled: boolean) {
  const t = useTranslations("chat");
  const [contacts, setContacts] = useState<PlayerDmContact[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!enabled) return;

    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/chat/dms", {
        credentials: "same-origin",
        cache: "no-store",
      });
      const data = (await response.json()) as {
        contacts?: PlayerDmContact[];
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? t("contactsLoadFailed"));
      }

      setContacts(data.contacts ?? []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t("contactsLoadFailed")
      );
      setContacts([]);
    } finally {
      setLoading(false);
    }
  }, [enabled, t]);

  useEffect(() => {
    if (!enabled) {
      setContacts([]);
      return;
    }
    void load();
    const timer = window.setInterval(() => {
      void load();
    }, 20_000);
    return () => window.clearInterval(timer);
  }, [enabled, load]);

  return { contacts, loading, error, reload: load };
}

export function useOpenPlayerDm() {
  const t = useTranslations("chat");

  return useCallback(
    async (peerUserId: string): Promise<PlayerDmThreadSummary | null> => {
      const response = await fetch("/api/chat/dms", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ peerUserId }),
      });
      const data = (await response.json()) as {
        thread?: PlayerDmThreadSummary;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? t("playerDmOpenFailed"));
      }

      return data.thread ?? null;
    },
    [t]
  );
}

export function usePlayerDmChat(threadId: string | null, enabled: boolean) {
  const t = useTranslations("chat");
  const [thread, setThread] = useState<PlayerDmThreadSummary | null>(null);
  const [messages, setMessages] = useState<PlayerDmMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const loadMessages = useCallback(async () => {
    if (!enabled || !threadId) return;

    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/chat/dms/${encodeURIComponent(threadId)}/messages`,
        {
          credentials: "same-origin",
          cache: "no-store",
        }
      );
      const data = (await response.json()) as {
        thread?: PlayerDmThreadSummary;
        messages?: PlayerDmMessage[];
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? t("readFailed"));
      }

      setThread(data.thread ?? null);
      setMessages(data.messages ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("readFailed"));
    } finally {
      setLoading(false);
    }
  }, [enabled, t, threadId]);

  useEffect(() => {
    if (!enabled || !threadId) {
      setThread(null);
      setMessages([]);
      return;
    }
    void loadMessages();
    const timer = window.setInterval(() => {
      void loadMessages();
    }, 8000);
    return () => window.clearInterval(timer);
  }, [enabled, threadId, loadMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!enabled || !threadId) return false;

      setSending(true);
      setError(null);
      try {
        const response = await fetch(
          `/api/chat/dms/${encodeURIComponent(threadId)}/messages`,
          {
            method: "POST",
            credentials: "same-origin",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ content }),
          }
        );
        const data = (await response.json()) as {
          message?: PlayerDmMessage;
          error?: string;
        };

        if (!response.ok) {
          throw new Error(data.error ?? t("sendFailed"));
        }

        if (data.message) {
          setMessages((prev) => [...prev, data.message!]);
        } else {
          await loadMessages();
        }
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : t("sendFailed"));
        return false;
      } finally {
        setSending(false);
      }
    },
    [enabled, loadMessages, t, threadId]
  );

  return {
    thread,
    messages,
    loading,
    sending,
    error,
    bottomRef,
    reload: loadMessages,
    sendMessage,
  };
}
