"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import type {
  CreatorAdminContactSummary,
  SupportMessage,
} from "@/lib/support-chat";

export function useAdminSupportContact(enabled: boolean, isCreator: boolean) {
  const t = useTranslations("chat");
  const [contact, setContact] = useState<CreatorAdminContactSummary | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!enabled || !isCreator) return;

    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/chat/support", {
        credentials: "same-origin",
        cache: "no-store",
      });
      const data = (await response.json()) as {
        contact?: CreatorAdminContactSummary;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? t("adminSupportLoadFailed"));
      }

      setContact(data.contact ?? null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t("adminSupportLoadFailed")
      );
      setContact(null);
    } finally {
      setLoading(false);
    }
  }, [enabled, isCreator, t]);

  useEffect(() => {
    if (!enabled || !isCreator) {
      setContact(null);
      return;
    }
    void load();
  }, [enabled, isCreator, load]);

  return { contact, loading, error, reload: load };
}

export function useAdminSupportChat(enabled: boolean) {
  const t = useTranslations("chat");
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const loadMessages = useCallback(async () => {
    if (!enabled) return;

    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/chat/support/messages", {
        credentials: "same-origin",
        cache: "no-store",
      });
      const data = (await response.json()) as {
        messages?: SupportMessage[];
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? t("readFailed"));
      }

      setMessages(data.messages ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("readFailed"));
    } finally {
      setLoading(false);
    }
  }, [enabled, t]);

  useEffect(() => {
    if (!enabled) {
      setMessages([]);
      return;
    }
    void loadMessages();
    const timer = window.setInterval(() => {
      void loadMessages();
    }, 8000);
    return () => window.clearInterval(timer);
  }, [enabled, loadMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!enabled) return false;

      setSending(true);
      setError(null);
      try {
        const response = await fetch("/api/chat/support/messages", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content }),
        });
        const data = (await response.json()) as {
          message?: SupportMessage;
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
    [enabled, loadMessages, t]
  );

  return {
    messages,
    loading,
    sending,
    error,
    bottomRef,
    reload: loadMessages,
    sendMessage,
  };
}
