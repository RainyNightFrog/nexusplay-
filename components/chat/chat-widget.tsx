"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronDown,
  Globe,
  MessageCircle,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { ChatContactsPanel } from "@/components/chat/chat-contacts-panel";
import { ChatInput } from "@/components/chat/chat-input";
import { ChatMessageList } from "@/components/chat/chat-message-list";
import {
  ChatPlayerCard,
  chatMessageToPlayerPreview,
  type ChatPlayerPreview,
} from "@/components/chat/chat-player-card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "@/i18n/navigation";
import { useChatMessages } from "@/hooks/use-chat-messages";
import type { ChatChannel, ChatMessage } from "@/lib/chat";
import { cn } from "@/lib/utils";

type ChatTab = ChatChannel | "contacts";

function ChatChannelPanel({
  channel,
  active,
  readOnly,
  draft,
  onDraftChange,
  onAuthorClick,
  scrollToLatestKey,
}: {
  channel: ChatChannel;
  active: boolean;
  readOnly?: boolean;
  draft: string;
  onDraftChange: (value: string) => void;
  onAuthorClick?: (message: ChatMessage) => void;
  scrollToLatestKey: number;
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
        onAuthorClick={onAuthorClick}
        scrollToLatestKey={scrollToLatestKey}
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
  const { profile, isCreator, loading } = useAuth();
  const [open, setOpen] = useState(false);
  const [channel, setChannel] = useState<ChatTab>("world");
  const [minimized, setMinimized] = useState(false);
  const [drafts, setDrafts] = useState<Record<ChatChannel, string>>({
    world: "",
    creator: "",
  });
  const [playerPreview, setPlayerPreview] = useState<ChatPlayerPreview | null>(
    null
  );
  const [playerCardOpen, setPlayerCardOpen] = useState(false);
  const [dmTargetId, setDmTargetId] = useState<string | null>(null);
  const [scrollToLatestKey, setScrollToLatestKey] = useState(0);

  function updateDraft(targetChannel: ChatChannel, value: string) {
    setDrafts((prev) => ({ ...prev, [targetChannel]: value }));
  }

  function handleAuthorClick(message: ChatMessage) {
    setPlayerPreview(chatMessageToPlayerPreview(message));
    setPlayerCardOpen(true);
  }

  function openDirectMessage(virtualPlayerId: string) {
    setDmTargetId(virtualPlayerId);
    setChannel("contacts");
  }

  useEffect(() => {
    if (!open || minimized) return;
    if (channel === "contacts") return;
    setScrollToLatestKey((key) => key + 1);
  }, [open, channel, minimized]);

  useEffect(() => {
    if (!open) return;

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [open]);

  return (
    <>
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
            className="pointer-events-auto flex w-[min(100vw-2rem,400px)] flex-col overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/95 shadow-2xl shadow-black/50 backdrop-blur-xl"
          >
            <div className="relative flex items-center justify-end border-b border-white/8 bg-gradient-to-r from-cyan-500/10 via-transparent to-violet-500/10 px-4 py-3">
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-16">
                <p className="text-center text-sm font-semibold text-zinc-100">
                  {t("title")}
                </p>
                <p className="text-center text-[10px] text-zinc-500">
                  {t("subtitle")}
                </p>
              </div>
              <div className="relative z-10 flex items-center gap-1">
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
                {loading ? (
                  <div className="flex flex-1 items-center justify-center px-6 py-12 text-sm text-zinc-500">
                    {t("loading")}
                  </div>
                ) : !profile ? (
                  <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-10 text-center">
                    <div className="flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500/15 to-violet-500/15 text-cyan-300">
                      <MessageCircle className="size-6" />
                    </div>
                    <p className="text-sm text-zinc-300">{t("loginRequired")}</p>
                    <Button
                      nativeButton={false}
                      render={<Link href="/auth" />}
                      className="gap-2 bg-gradient-to-r from-cyan-600 to-violet-600 text-white hover:from-cyan-500 hover:to-violet-500"
                    >
                      {t("goLogin")}
                    </Button>
                  </div>
                ) : (
                  <>
                    <Tabs
                      value={channel}
                      onValueChange={(value) => setChannel(value as ChatTab)}
                      className="flex min-h-0 flex-1 flex-col gap-0"
                    >
                      <TabsList className="mx-3 mt-3 h-9 w-auto self-stretch rounded-xl border border-white/8 bg-zinc-900/60 p-1">
                        <TabsTrigger
                          value="world"
                          className="flex-1 gap-1 rounded-lg text-[11px] data-active:bg-cyan-500/15 data-active:text-cyan-200"
                        >
                          <Globe className="size-3.5" />
                          {t("channelWorld")}
                        </TabsTrigger>
                        <TabsTrigger
                          value="creator"
                          className="flex-1 gap-1 rounded-lg text-[11px] data-active:bg-violet-500/15 data-active:text-violet-200"
                        >
                          <Sparkles className="size-3.5" />
                          {t("channelCreator")}
                        </TabsTrigger>
                        <TabsTrigger
                          value="contacts"
                          className="flex-1 gap-1 rounded-lg text-[11px] data-active:bg-emerald-500/15 data-active:text-emerald-200"
                        >
                          <Users className="size-3.5" />
                          {t("channelContacts")}
                        </TabsTrigger>
                      </TabsList>

                      {channel === "contacts" ? (
                        <ChatContactsPanel
                          active
                          initialPlayerId={dmTargetId}
                          onInitialPlayerConsumed={() => setDmTargetId(null)}
                        />
                      ) : (
                        <>
                          <ChatChannelPanel
                            channel={channel}
                            active={channel === "world" || channel === "creator"}
                            readOnly={channel === "creator" && !isCreator}
                            draft={drafts[channel]}
                            onDraftChange={(value) => updateDraft(channel, value)}
                            onAuthorClick={handleAuthorClick}
                            scrollToLatestKey={scrollToLatestKey}
                          />
                        </>
                      )}
                    </Tabs>

                    <div className="border-t border-white/5 px-3 py-2 text-center text-[10px] text-zinc-600">
                      {t("retentionHint")}
                    </div>
                  </>
                )}
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

    <ChatPlayerCard
      player={playerPreview}
      open={playerCardOpen}
      onOpenChange={setPlayerCardOpen}
      onDirectMessage={openDirectMessage}
    />
    </>
  );
}
