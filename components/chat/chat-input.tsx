"use client";

import { useRef, type KeyboardEvent } from "react";
import { Loader2, Send } from "lucide-react";
import { useTranslations } from "next-intl";
import { ChatEmojiPicker } from "@/components/chat/chat-emoji-picker";
import { CHAT_LIMITS } from "@/lib/chat";
import { cn } from "@/lib/utils";

type ChatInputProps = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  sending?: boolean;
  readOnly?: boolean;
  readOnlyHint?: string;
  onSend: (content: string) => Promise<boolean>;
};

export function ChatInput({
  value,
  onChange,
  disabled,
  sending,
  readOnly,
  readOnlyHint,
  onSend,
}: ChatInputProps) {
  const t = useTranslations("chat");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  async function handleSend() {
    const trimmed = value.trim();
    if (!trimmed || disabled || sending || readOnly) return;

    const ok = await onSend(trimmed);
    if (ok) {
      onChange("");
      textareaRef.current?.focus();
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void handleSend();
    }
  }

  function handleEmojiPick(emoji: string) {
    const next = `${value}${emoji}`;
    onChange(
      next.length > CHAT_LIMITS.content
        ? next.slice(0, CHAT_LIMITS.content)
        : next
    );
    textareaRef.current?.focus();
  }

  if (readOnly) {
    return (
      <div className="border-t border-white/8 bg-zinc-950/60 px-4 py-3 text-center text-xs text-zinc-500">
        {readOnlyHint ?? t("creatorReadOnly")}
      </div>
    );
  }

  return (
    <div className="border-t border-white/8 bg-zinc-950/60 p-3">
      <div className="flex items-end gap-2">
        <ChatEmojiPicker disabled={disabled || sending} onPick={handleEmojiPick} />
        <div className="relative min-w-0 flex-1">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(event) =>
              onChange(event.target.value.slice(0, CHAT_LIMITS.content))
            }
            onKeyDown={handleKeyDown}
            disabled={disabled || sending}
            rows={1}
            placeholder={t("placeholder")}
            className={cn(
              "max-h-24 min-h-9 w-full resize-none rounded-xl border border-white/10 bg-zinc-900/80 px-3 py-2 pr-12 text-sm text-zinc-100",
              "placeholder:text-zinc-600 focus:border-cyan-500/40 focus:outline-none focus:ring-2 focus:ring-cyan-500/15",
              "disabled:opacity-50"
            )}
          />
          <span className="pointer-events-none absolute bottom-2 right-2 text-[10px] text-zinc-600">
            {value.length}/{CHAT_LIMITS.content}
          </span>
        </div>
        <button
          type="button"
          onClick={() => void handleSend()}
          disabled={disabled || sending || !value.trim()}
          aria-label={t("send")}
          className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-violet-600 text-white shadow-lg shadow-cyan-500/20 transition-all hover:brightness-110 disabled:opacity-40"
        >
          {sending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Send className="size-4" />
          )}
        </button>
      </div>
      <p className="mt-2 text-center text-[10px] text-zinc-600">
        {t("sendHint")}
      </p>
    </div>
  );
}
