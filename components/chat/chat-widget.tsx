"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronDown,
  Globe,
  MessageCircle,
  Sparkles,
  X,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { ChatInput } from "@/components/chat/chat-input";
import { ChatMessageList } from "@/components/chat/chat-message-list";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";
import { useChatMessages } from "@/hooks/use-chat-messages";
import type { ChatChannel } from "@/lib/chat";
import { cn } from "@/lib/utils";

function ChatChannelPanel({
  channel,
  active,
  readOnly,
  draft,
  onDraftChange,
}: {
  channel: ChatChannel;
  active: boolean;
  readOnly?: boolean;
  draft: string;
  onDraftChange: (value: string) => void;
}) {
  const t = useTranslations("chat");
  const chat = useChatMessages(channel, active);

  if (!active) return null;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ChatMessageList
        messages={chat.messages}
        loading={chat.loading}
        canRecall={chat.canRecall}
        onRecall={(id) => void chat.recallMessage(id)}
      />
      <ChatInput
        value={draft}
        onChange={onDraftChange}
        sending={chat.sending}
        readOnly={readOnly}
        readOnlyHint={t("creatorReadOnly")}
        onSend={chat.sendMessage}
      />
      {chat.error && (
        <div className="border-t border-rose-500/20 bg-rose-500/10 px-3 py-2 text-center text-xs text-rose-300">
          {chat.error}
        </div>
      )}
    </div>
  );
}

export function ChatWidget() {
  const t = useTranslations("chat");
  const { profile, isCreator } = useAuth();
  const [open, setOpen] = useState(false);
  const [channel, setChannel] = useState<ChatChannel>("world");
  const [minimized, setMinimized] = useState(false);
  const [drafts, setDrafts] = useState<Record<ChatChannel, string>>({
    world: "",
    creator: "",
  });

  function updateDraft(targetChannel: ChatChannel, value: string) {
    setDrafts((prev) => ({ ...prev, [targetChannel]: value }));
  }

  useEffect(() => {
    if (!open) return;

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [open]);

  if (!profile) return null;

  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{
              opacity: 1,
              y: 0,
              scale: 1,
              height: minimized ? 52 : 520,
            }}
            exit={{ opacity: 0, y: 16, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
            className="pointer-events-auto flex w-[min(100vw-2rem,380px)] flex-col overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/95 shadow-2xl shadow-black/50 backdrop-blur-xl"
          >
            <div className="flex items-center justify-between border-b border-white/8 bg-gradient-to-r from-cyan-500/10 via-transparent to-violet-500/10 px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="flex size-8 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500/20 to-violet-500/20 text-cyan-300">
                  <MessageCircle className="size-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-zinc-100">
                    {t("title")}
                  </p>
                  <p className="text-[10px] text-zinc-500">{t("subtitle")}</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setMinimized((prev) => !prev)}
                  aria-label={minimized ? t("expand") : t("minimize")}
                  className="inline-flex size-8 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-white/8 hover:text-white"
                >
                  <ChevronDown
                    className={cn(
                      "size-4 transition-transform",
                      minimized && "rotate-180"
                    )}
                  />
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label={t("close")}
                  className="inline-flex size-8 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-white/8 hover:text-white"
                >
                  <X className="size-4" />
                </button>
              </div>
            </div>

            {!minimized && (
              <>
                <Tabs
                  value={channel}
                  onValueChange={(value) => setChannel(value as ChatChannel)}
                  className="flex min-h-0 flex-1 flex-col gap-0"
                >
                  <TabsList className="mx-3 mt-3 h-9 w-auto self-stretch rounded-xl border border-white/8 bg-zinc-900/60 p-1">
                    <TabsTrigger
                      value="world"
                      className="flex-1 gap-1.5 rounded-lg text-xs data-active:bg-cyan-500/15 data-active:text-cyan-200"
                    >
                      <Globe className="size-3.5" />
                      {t("channelWorld")}
                    </TabsTrigger>
                    <TabsTrigger
                      value="creator"
                      className="flex-1 gap-1.5 rounded-lg text-xs data-active:bg-violet-500/15 data-active:text-violet-200"
                    >
                      <Sparkles className="size-3.5" />
                      {t("channelCreator")}
                    </TabsTrigger>
                  </TabsList>

                  <ChatChannelPanel
                    channel="world"
                    active={channel === "world"}
                    draft={drafts.world}
                    onDraftChange={(value) => updateDraft("world", value)}
                  />
                  <ChatChannelPanel
                    channel="creator"
                    active={channel === "creator"}
                    readOnly={!isCreator}
                    draft={drafts.creator}
                    onDraftChange={(value) => updateDraft("creator", value)}
                  />
                </Tabs>

                <div className="border-t border-white/5 px-3 py-2 text-center text-[10px] text-zinc-600">
                  {t("retentionHint")}
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        type="button"
        onClick={() => {
          setOpen((prev) => !prev);
          setMinimized(false);
        }}
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.96 }}
        aria-label={open ? t("close") : t("open")}
        className="pointer-events-auto inline-flex size-14 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500 to-violet-600 text-white shadow-xl shadow-cyan-500/25 ring-2 ring-white/10"
      >
        {open ? (
          <ChevronDown className="size-6" />
        ) : (
          <MessageCircle className="size-6" />
        )}
      </motion.button>
    </div>
  );
}
