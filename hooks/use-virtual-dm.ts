"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import type { VirtualContactSummary, VirtualDmMessage } from "@/lib/virtual-dm";

export function useVirtualContacts(enabled: boolean) {
  const t = useTranslations("chat");
  const [contacts, setContacts] = useState<VirtualContactSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadContacts = useCallback(async () => {
    if (!enabled) return;

    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/chat/contacts", {
        credentials: "same-origin",
        cache: "no-store",
      });
      const data = (await response.json()) as {
        contacts?: VirtualContactSummary[];
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? t("contactsLoadFailed"));
      }

      setContacts(data.contacts ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("contactsLoadFailed"));
    } finally {
      setLoading(false);
    }
  }, [enabled, t]);

  useEffect(() => {
    if (!enabled) {
      setContacts([]);
      return;
    }
    void loadContacts();
  }, [enabled, loadContacts]);

  return { contacts, loading, error, reload: loadContacts };
}

export function useVirtualDm(playerId: string | null, enabled: boolean) {
  const t = useTranslations("chat");
  const [messages, setMessages] = useState<VirtualDmMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const loadMessages = useCallback(async () => {
    if (!enabled || !playerId) return;

    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/chat/contacts/${encodeURIComponent(playerId)}/messages`,
        { credentials: "same-origin", cache: "no-store" }
      );
      const data = (await response.json()) as {
        messages?: VirtualDmMessage[];
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
  }, [enabled, playerId, t]);

  useEffect(() => {
    if (!enabled || !playerId) {
      setMessages([]);
      return;
    }
    void loadMessages();
  }, [enabled, loadMessages, playerId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!enabled || !playerId) return false;

      setSending(true);
      setError(null);
      try {
        const response = await fetch(
          `/api/chat/contacts/${encodeURIComponent(playerId)}/messages`,
          {
            method: "POST",
            credentials: "same-origin",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ content }),
          }
        );

        const data = (await response.json()) as {
          messages?: VirtualDmMessage[];
          error?: string;
        };

        if (!response.ok) {
          throw new Error(data.error ?? t("sendFailed"));
        }

        setMessages(data.messages ?? []);
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : t("sendFailed"));
        return false;
      } finally {
        setSending(false);
      }
    },
    [enabled, playerId, t]
  );

  return {
    messages,
    loading,
    sending,
    error,
    sendMessage,
    bottomRef,
    reload: loadMessages,
  };
}
