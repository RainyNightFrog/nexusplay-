"use client";

import { useRef, type KeyboardEvent } from "react";
import { Loader2, Send } from "lucide-react";
import { useTranslations } from "next-intl";
import { ChatEmojiPicker } from "@/components/chat/chat-emoji-picker";
import { RainbowSafeText } from "@/components/supporter/rainbow-safe-text";
import { CHAT_LIMITS } from "@/lib/chat";
import {
  supporterComposerMirrorClassByTier,
  supporterComposerTextClassByTier,
  type SupporterDisplayTier,
} from "@/lib/supporter-tier";
import { cn } from "@/lib/utils";

type ChatInputProps = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  sending?: boolean;
  readOnly?: boolean;
  readOnlyHint?: string;
  maxLength?: number;
  supporterTier?: SupporterDisplayTier;
  onSend: (content: string) => Promise<boolean>;
};

const composerMirrorClass =
  "pointer-events-none absolute inset-0 overflow-hidden whitespace-pre-wrap break-words px-3 py-2 pr-12 text-sm leading-[1.375rem]";

export function ChatInput({
  value,
  onChange,
  disabled,
  sending,
  readOnly,
  readOnlyHint,
  maxLength = CHAT_LIMITS.content,
  supporterTier = "none",
  onSend,
}: ChatInputProps) {
  const t = useTranslations("chat");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isSupporterComposer = supporterTier !== "none";
  const showComposerMirror =
    supporterTier === "premium" && value.length > 0;

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
      next.length > maxLength
        ? next.slice(0, maxLength)
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
        <div
          className={cn(
            "relative min-w-0 flex-1 rounded-xl border border-white/10 bg-zinc-900/80",
            isSupporterComposer &&
              (supporterTier === "premium"
                ? "focus-within:border-violet-400/35 focus-within:ring-2 focus-within:ring-violet-400/15"
                : "focus-within:border-amber-400/35 focus-within:ring-2 focus-within:ring-amber-400/15"),
            !isSupporterComposer &&
              "focus-within:border-cyan-500/40 focus-within:ring-2 focus-within:ring-cyan-500/15"
          )}
        >
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(event) =>
              onChange(event.target.value.slice(0, maxLength))
            }
            onKeyDown={handleKeyDown}
            disabled={disabled || sending}
            maxLength={maxLength}
            rows={1}
            placeholder={t("placeholder")}
            className={cn(
              "max-h-24 min-h-9 w-full resize-none border-0 bg-transparent px-3 py-2 pr-12 text-sm leading-[1.375rem] focus:outline-none disabled:opacity-50",
              isSupporterComposer
                ? cn(
                    supporterComposerTextClassByTier[supporterTier],
                    showComposerMirror && "[-webkit-text-fill-color:transparent]"
                  )
                : "text-zinc-100",
              "placeholder:text-zinc-600"
            )}
          />
          {showComposerMirror ? (
            <div aria-hidden className={composerMirrorClass}>
              <RainbowSafeText
                text={value}
                rainbowClassName={
                  supporterComposerMirrorClassByTier[supporterTier]
                }
              />
            </div>
          ) : null}
          <span className="pointer-events-none absolute bottom-2 right-2 z-10 text-[10px] text-zinc-600">
            {value.length}/{maxLength}
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
