"use client";

import Image from "next/image";
import { ArrowLeft, Loader2, MessageCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { ChatInput } from "@/components/chat/chat-input";
import { UserBadge } from "@/components/UserBadge";
import { useVirtualContacts, useVirtualDm } from "@/hooks/use-virtual-dm";
import type { EquippedTitle } from "@/lib/titles";
import { getVirtualPlayerAvatarUrl } from "@/lib/virtual-player-avatar";
import { getVirtualPlayerById } from "@/lib/virtual-players";
import { cn } from "@/lib/utils";

function ContactListItem({
  contact,
  active,
  onSelect,
}: {
  contact: {
    id: string;
    displayName: string;
    avatarUrl: string;
    lastMessage: string | null;
    lastMessageAt: string | null;
    equippedTitle?: EquippedTitle | null;
  };
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors",
        active ? "bg-cyan-500/15" : "hover:bg-white/5"
      )}
    >
      <div className="relative size-10 shrink-0 overflow-hidden rounded-full ring-1 ring-white/10">
        <Image
          src={contact.avatarUrl}
          alt={contact.displayName}
          fill
          className="object-cover"
          unoptimized
        />
      </div>
      <div className="min-w-0 flex-1">
        <UserBadge
          username={contact.displayName}
          title={contact.equippedTitle}
          layout="compact"
          animateTitle={false}
          usernameClassName="text-sm text-zinc-100"
          titleClassName="text-[9px]"
        />
        <p className="truncate text-xs text-zinc-500">
          {contact.lastMessage ?? "—"}
        </p>
      </div>
    </button>
  );
}

function VirtualDmThread({
  playerId,
  displayName,
  avatarUrl,
  equippedTitle,
  onBack,
  onProfileClick,
}: {
  playerId: string;
  displayName: string;
  avatarUrl: string;
  equippedTitle?: EquippedTitle | null;
  onBack: () => void;
  onProfileClick: () => void;
}) {
  const t = useTranslations("chat");
  const [draft, setDraft] = useState("");
  const dm = useVirtualDm(playerId, true);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center gap-2 border-b border-white/8 px-3 py-2.5">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex size-8 items-center justify-center rounded-lg text-zinc-400 hover:bg-white/8 hover:text-white"
          aria-label={t("contactsBack")}
        >
          <ArrowLeft className="size-4" />
        </button>
        <button
          type="button"
          onClick={onProfileClick}
          className="relative size-8 shrink-0 overflow-hidden rounded-full ring-1 ring-white/10 transition-opacity hover:opacity-85"
          aria-label={displayName}
        >
          <Image
            src={avatarUrl}
            alt={displayName}
            fill
            className="object-cover"
            unoptimized
          />
        </button>
        <button
          type="button"
          onClick={onProfileClick}
          className="min-w-0 flex-1 text-left transition-opacity hover:opacity-85"
        >
          <UserBadge
            username={displayName}
            title={equippedTitle}
            layout="compact"
            animateTitle={false}
            usernameClassName="text-sm font-semibold text-zinc-100"
            titleClassName="text-[9px]"
          />
          <p className="text-[10px] text-zinc-500">{t("contactsVirtualHint")}</p>
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
        {dm.loading ? (
          <div className="flex items-center justify-center py-10 text-sm text-zinc-500">
            <Loader2 className="mr-2 size-4 animate-spin" />
            {t("loading")}
          </div>
        ) : dm.messages.length === 0 ? (
          <p className="py-10 text-center text-sm text-zinc-500">
            {t("contactsEmptyThread")}
          </p>
        ) : (
          <div className="space-y-2.5">
            {dm.messages.map((message) => {
              const isUser = message.sender === "user";
              return (
                <div
                  key={message.id}
                  className={cn("flex", isUser ? "justify-end" : "justify-start")}
                >
                  <div
                    className={cn(
                      "max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed",
                      isUser
                        ? "bg-gradient-to-r from-cyan-600 to-violet-600 text-white"
                        : "border border-white/8 bg-zinc-900/80 text-zinc-200"
                    )}
                  >
                    {message.content}
                  </div>
                </div>
              );
            })}
            {dm.sending && (
              <div className="flex justify-start">
                <div className="rounded-2xl border border-white/8 bg-zinc-900/80 px-3 py-2 text-xs text-zinc-500">
                  <Loader2 className="mr-1 inline size-3 animate-spin" />
                  {t("contactsTyping")}
                </div>
              </div>
            )}
            <div ref={dm.bottomRef} />
          </div>
        )}
      </div>

      <ChatInput
        value={draft}
        onChange={setDraft}
        sending={dm.sending}
        onSend={async (content) => {
          const ok = await dm.sendMessage(content);
          if (ok) setDraft("");
          return ok;
        }}
      />

      {dm.error && (
        <div className="border-t border-rose-500/20 bg-rose-500/10 px-3 py-2 text-center text-xs text-rose-300">
          {dm.error}
        </div>
      )}
    </div>
  );
}

export function ChatContactsPanel({
  active,
  initialPlayerId,
  onInitialPlayerConsumed,
  onPlayerProfileClick,
}: {
  active: boolean;
  initialPlayerId?: string | null;
  onInitialPlayerConsumed?: () => void;
  onPlayerProfileClick?: (contact: {
    id: string;
    displayName: string;
    avatarUrl: string;
    equippedTitle?: EquippedTitle | null;
  }) => void;
}) {
  const t = useTranslations("chat");
  const { contacts, loading, error, reload } = useVirtualContacts(active);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (!active || !initialPlayerId) return;
    setSelectedId(initialPlayerId);
    onInitialPlayerConsumed?.();
  }, [active, initialPlayerId, onInitialPlayerConsumed]);

  if (!active) return null;

  const selectedFromContacts =
    contacts.find((contact) => contact.id === selectedId) ?? null;
  const selectedPlayer = selectedId
    ? selectedFromContacts ??
      (() => {
        const player = getVirtualPlayerById(selectedId);
        if (!player) return null;
        return {
          id: player.id,
          displayName: player.displayName,
          avatarUrl:
            getVirtualPlayerAvatarUrl(player.id) ??
            `https://api.dicebear.com/9.x/notionists/png?seed=${encodeURIComponent(player.id)}&size=128`,
          lastMessage: null,
          lastMessageAt: null,
          equippedTitle: null,
        };
      })()
    : null;

  if (selectedPlayer) {
    return (
      <VirtualDmThread
        playerId={selectedPlayer.id}
        displayName={selectedPlayer.displayName}
        avatarUrl={selectedPlayer.avatarUrl}
        equippedTitle={selectedPlayer.equippedTitle ?? null}
        onBack={() => {
          setSelectedId(null);
          void reload();
        }}
        onProfileClick={() =>
          onPlayerProfileClick?.({
            id: selectedPlayer.id,
            displayName: selectedPlayer.displayName,
            avatarUrl: selectedPlayer.avatarUrl,
            equippedTitle: selectedPlayer.equippedTitle ?? null,
          })
        }
      />
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="border-b border-white/8 px-4 py-2.5 text-center">
        <p className="text-sm font-medium text-zinc-200">{t("channelContacts")}</p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
        {loading ? (
          <div className="flex items-center justify-center py-10 text-sm text-zinc-500">
            <Loader2 className="mr-2 size-4 animate-spin" />
            {t("loading")}
          </div>
        ) : error ? (
          <p className="py-10 text-center text-sm text-rose-300">{error}</p>
        ) : contacts.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 px-4 py-12 text-center">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-300">
              <MessageCircle className="size-6" />
            </div>
            <p className="text-sm text-zinc-300">{t("contactsEmpty")}</p>
            <p className="text-xs leading-relaxed text-zinc-500">
              {t("contactsEmptyHint")}
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {contacts.map((contact) => (
              <ContactListItem
                key={contact.id}
                contact={contact}
                active={false}
                onSelect={() => setSelectedId(contact.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
