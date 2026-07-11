"use client";

import { useEffect, useRef } from "react";
import { Loader2, Undo2 } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ChatMessage } from "@/lib/chat";
import { UserBadge } from "@/components/UserBadge";
import { cn } from "@/lib/utils";

function formatChatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const now = new Date();
  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  return date.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    ...(isToday ? {} : { month: "short", day: "numeric" }),
  });
}

type ChatMessageListProps = {
  messages: ChatMessage[];
  loading: boolean;
  canRecall: (message: ChatMessage) => boolean;
  onRecall: (messageId: string) => void;
  onAuthorClick?: (message: ChatMessage) => void;
  scrollToLatestKey?: number;
};

export function ChatMessageList({
  messages,
  loading,
  canRecall,
  onRecall,
  onAuthorClick,
  scrollToLatestKey = 0,
}: ChatMessageListProps) {
  const t = useTranslations("chat");
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const prevMessageCountRef = useRef(0);
  const pendingLatestScrollRef = useRef(false);

  const scrollToBottom = (behavior: ScrollBehavior = "auto") => {
    const container = containerRef.current;
    if (!container) return;
    container.scrollTo({ top: container.scrollHeight, behavior });
  };

  useEffect(() => {
    pendingLatestScrollRef.current = true;
  }, [scrollToLatestKey]);

  useEffect(() => {
    if (!pendingLatestScrollRef.current || loading || messages.length === 0) return;
    pendingLatestScrollRef.current = false;
    requestAnimationFrame(() => {
      scrollToBottom("auto");
    });
  }, [scrollToLatestKey, loading, messages.length]);

  useEffect(() => {
    if (loading) return;

    const prevCount = prevMessageCountRef.current;
    prevMessageCountRef.current = messages.length;
    if (messages.length <= prevCount) return;

    const container = containerRef.current;
    if (!container) return;

    const nearBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight < 120;

    if (nearBottom) {
      requestAnimationFrame(() => {
        scrollToBottom("smooth");
      });
    }
  }, [loading, messages.length]);

  if (loading && messages.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center py-10 text-zinc-500">
        <Loader2 className="mr-2 size-4 animate-spin" />
        {t("loading")}
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 py-10 text-center">
        <span className="text-2xl">💬</span>
        <p className="text-sm text-zinc-400">{t("empty")}</p>
        <p className="text-xs text-zinc-600">{t("retentionHint")}</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="flex flex-1 flex-col gap-2 overflow-y-auto overscroll-contain px-3 py-3"
    >
      {messages.map((message) => {
        const recalled = Boolean(message.recalled_at);
        const showRecall = canRecall(message);

        return (
          <div
            key={message.id}
            className={cn(
              "group flex gap-2",
              message.is_own ? "flex-row-reverse" : "flex-row"
            )}
          >
            <button
              type="button"
              onClick={() => onAuthorClick?.(message)}
              disabled={!onAuthorClick}
              className={cn(
                "flex size-7 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold uppercase transition-opacity",
                message.is_creator
                  ? "bg-gradient-to-br from-violet-500/30 to-cyan-500/30 text-cyan-100 ring-1 ring-cyan-400/20"
                  : "bg-white/8 text-zinc-300",
                onAuthorClick && "cursor-pointer hover:opacity-80"
              )}
              aria-label={message.author_name}
            >
              {message.author_avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={message.author_avatar_url}
                  alt=""
                  className="size-7 rounded-full object-cover"
                />
              ) : (
                message.author_name.slice(0, 1)
              )}
            </button>

            <div
              className={cn(
                "flex max-w-[78%] flex-col gap-1",
                message.is_own ? "items-end" : "items-start"
              )}
            >
              <div
                className={cn(
                  "flex items-center gap-2 text-[10px] text-zinc-500",
                  message.is_own && "flex-row-reverse"
                )}
              >
                {onAuthorClick ? (
                  <button
                    type="button"
                    onClick={() => onAuthorClick(message)}
                    className="text-left"
                  >
                    <UserBadge
                      username={message.is_own ? t("you") : message.author_name}
                      title={message.author_equipped_title}
                      isSupporter={message.author_is_supporter}
                      supporterBadge={message.author_supporter_badge}
                      animateTitle={false}
                      usernameClassName="text-zinc-400 hover:text-cyan-300"
                      titleClassName="text-[9px]"
                    />
                  </button>
                ) : (
                  <UserBadge
                    username={message.is_own ? t("you") : message.author_name}
                    title={message.author_equipped_title}
                    isSupporter={message.author_is_supporter}
                    supporterBadge={message.author_supporter_badge}
                    animateTitle={false}
                    usernameClassName="text-zinc-400"
                    titleClassName="text-[9px]"
                  />
                )}
                {message.is_creator && !message.is_own && (
                  <span className="rounded-full bg-violet-500/15 px-1.5 py-0.5 text-[9px] text-violet-300">
                    {t("creatorBadge")}
                  </span>
                )}
                <span>{formatChatTime(message.created_at)}</span>
              </div>

              <div
                className={cn(
                  "relative rounded-2xl px-3 py-2 text-sm leading-relaxed shadow-sm",
                  recalled
                    ? "border border-dashed border-white/10 bg-white/3 italic text-zinc-500"
                    : message.is_own
                      ? "bg-gradient-to-br from-cyan-600/80 to-violet-600/80 text-white"
                      : "border border-white/8 bg-zinc-900/80 text-zinc-100"
                )}
              >
                {recalled ? t("recalled") : message.content}
              </div>

              {showRecall && (
                <button
                  type="button"
                  onClick={() => void onRecall(message.id)}
                  className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] text-zinc-500 opacity-0 transition-all hover:bg-white/5 hover:text-zinc-300 group-hover:opacity-100"
                >
                  <Undo2 className="size-3" />
                  {t("recall")}
                </button>
              )}
            </div>
          </div>
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
}
