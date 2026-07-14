"use client";

import Image from "next/image";
import { ArrowLeft, Loader2, MessageCircle, Shield } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { ChatInput } from "@/components/chat/chat-input";
import { UserBadge } from "@/components/UserBadge";
import { RainbowSafeText } from "@/components/supporter/rainbow-safe-text";
import { useVirtualContacts, useVirtualDm } from "@/hooks/use-virtual-dm";
import { useAdminSupportChat, useAdminSupportContact } from "@/hooks/use-admin-support-chat";
import { ADMIN_SUPPORT_CONTACT_ID, SUPPORT_CHAT_LIMITS } from "@/lib/support-chat";
import type { SupporterDisplayTier } from "@/lib/supporter-tier";
import {
  getSupporterDisplayTier,
  supporterMessageContentClassByTier,
} from "@/lib/supporter-tier";
import { getVirtualPlayerSupporterFlags } from "@/lib/virtual-player-supporter";
import type { EquippedTitle } from "@/lib/titles";
import { resolveVirtualPlayerAvatarUrl } from "@/lib/virtual-player-avatar";
import { getVirtualPlayerById, listVirtualChatDiscoverPlayers } from "@/lib/virtual-players";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

function ContactListItem({
  contact,
  active,
  onSelect,
  pinned,
  isAdminContact,
}: {
  contact: {
    id: string;
    displayName: string;
    avatarUrl?: string;
    lastMessage: string | null;
    lastMessageAt: string | null;
    equippedTitle?: EquippedTitle | null;
    unread?: boolean;
  };
  active: boolean;
  onSelect: () => void;
  pinned?: boolean;
  isAdminContact?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors",
        active ? "bg-cyan-500/15" : "hover:bg-white/5",
        pinned && "border border-amber-400/20 bg-amber-500/5"
      )}
    >
      <div className="relative size-10 shrink-0 overflow-hidden rounded-full ring-1 ring-white/10">
        {isAdminContact ? (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-amber-500/30 to-cyan-500/20 text-amber-200">
            <Shield className="size-5" />
          </div>
        ) : (
          <Image
            src={contact.avatarUrl ?? ""}
            alt={contact.displayName}
            fill
            className="object-cover"
            unoptimized
          />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          {isAdminContact ? (
            <span className="truncate text-sm font-semibold text-amber-100">
              {contact.displayName}
            </span>
          ) : (
            <UserBadge
              username={contact.displayName}
              title={contact.equippedTitle}
              layout="compact"
              animateTitle={false}
              usernameClassName="text-sm text-zinc-100"
              titleClassName="text-[9px]"
            />
          )}
          {contact.unread && (
            <Badge className="border-cyan-400/30 bg-cyan-500/15 px-1.5 py-0 text-[10px] text-cyan-200">
              NEW
            </Badge>
          )}
        </div>
        <p className="truncate text-xs text-zinc-500">
          {contact.lastMessage ?? "—"}
        </p>
      </div>
    </button>
  );
}

function AdminSupportThread({
  onBack,
  supporterTier = "none",
}: {
  onBack: () => void;
  supporterTier?: SupporterDisplayTier;
}) {
  const t = useTranslations("chat");
  const [draft, setDraft] = useState("");
  const support = useAdminSupportChat(true);

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
        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-500/30 to-cyan-500/20 text-amber-200 ring-1 ring-white/10">
          <Shield className="size-4" />
        </div>
        <div className="min-w-0 flex-1 text-left">
          <p className="text-sm font-semibold text-amber-100">
            {t("contactsAdminTitle")}
          </p>
          <p className="text-[10px] text-zinc-500">{t("contactsAdminHint")}</p>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
        {support.loading ? (
          <div className="flex items-center justify-center py-10 text-sm text-zinc-500">
            <Loader2 className="mr-2 size-4 animate-spin" />
            {t("loading")}
          </div>
        ) : support.messages.length === 0 ? (
          <div className="space-y-2 px-2 py-8 text-center">
            <p className="text-sm text-zinc-300">{t("contactsAdminEmpty")}</p>
            <p className="text-xs leading-relaxed text-zinc-500">
              {t("contactsAdminEmptyHint")}
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {support.messages.map((message) => {
              const isUser = message.is_own;
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
                        : "border border-amber-400/20 bg-amber-500/10 text-amber-50"
                    )}
                  >
                    {!isUser && (
                      <p className="mb-1 text-[10px] font-medium text-amber-200/80">
                        {message.sender_display_name}
                      </p>
                    )}
                    {message.content}
                  </div>
                </div>
              );
            })}
            <div ref={support.bottomRef} />
          </div>
        )}
      </div>

      <ChatInput
        value={draft}
        onChange={setDraft}
        sending={support.sending}
        maxLength={SUPPORT_CHAT_LIMITS.content}
        supporterTier={supporterTier}
        onSend={async (content) => {
          const ok = await support.sendMessage(content);
          if (ok) setDraft("");
          return ok;
        }}
      />

      {support.error && (
        <div className="border-t border-rose-500/20 bg-rose-500/10 px-3 py-2 text-center text-xs text-rose-300">
          {support.error}
        </div>
      )}
    </div>
  );
}

function VirtualDmThread({
  playerId,
  displayName,
  avatarUrl,
  equippedTitle,
  onBack,
  onProfileClick,
  supporterTier = "none",
}: {
  playerId: string;
  displayName: string;
  avatarUrl: string;
  equippedTitle?: EquippedTitle | null;
  onBack: () => void;
  onProfileClick: () => void;
  supporterTier?: SupporterDisplayTier;
}) {
  const t = useTranslations("chat");
  const [draft, setDraft] = useState("");
  const dm = useVirtualDm(playerId, true);
  const virtualSupporter = getVirtualPlayerSupporterFlags(playerId);
  const virtualSupporterTier = virtualSupporter
    ? getSupporterDisplayTier(true, virtualSupporter.badge)
    : "none";

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
            isSupporter={virtualSupporter != null}
            supporterBadge={virtualSupporter?.badge ?? null}
            showSupporterBadge={false}
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
              const tier = isUser
                ? supporterTier
                : virtualSupporterTier;
              const useRainbow = tier === "premium";
              const contentClass = useRainbow
                ? undefined
                : isUser
                  ? supporterTier !== "none"
                    ? supporterMessageContentClassByTier[supporterTier]
                    : "text-white"
                  : virtualSupporterTier !== "none"
                    ? supporterMessageContentClassByTier[virtualSupporterTier]
                    : "text-zinc-200";

              return (
                <div
                  key={message.id}
                  className={cn("flex", isUser ? "justify-end" : "justify-start")}
                >
                  <div
                    className={cn(
                      "max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed",
                      isUser
                        ? "bg-gradient-to-r from-cyan-600 to-violet-600"
                        : "border border-white/8 bg-zinc-900/80"
                    )}
                  >
                    {useRainbow ? (
                      <RainbowSafeText
                        text={message.content}
                        rainbowClassName={
                          supporterMessageContentClassByTier.premium
                        }
                      />
                    ) : (
                      <span className={contentClass}>{message.content}</span>
                    )}
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
        supporterTier={supporterTier}
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
  isCreator,
  supporterTier = "none",
  initialPlayerId,
  onInitialPlayerConsumed,
  onPlayerProfileClick,
}: {
  active: boolean;
  isCreator: boolean;
  supporterTier?: SupporterDisplayTier;
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
  const adminContact = useAdminSupportContact(active, isCreator);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (!active || !initialPlayerId) return;
    setSelectedId(initialPlayerId);
    onInitialPlayerConsumed?.();
  }, [active, initialPlayerId, onInitialPlayerConsumed]);

  if (!active) return null;

  if (selectedId === ADMIN_SUPPORT_CONTACT_ID) {
    return (
      <AdminSupportThread
        supporterTier={supporterTier}
        onBack={() => {
          setSelectedId(null);
          void reload();
          void adminContact.reload();
        }}
      />
    );
  }

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
          avatarUrl: resolveVirtualPlayerAvatarUrl(player.id),
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
        supporterTier={supporterTier}
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
        ) : contacts.length === 0 && !isCreator ? (
          <div className="flex flex-col gap-4 px-2 py-6">
            <div className="flex flex-col items-center gap-3 px-2 text-center">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-300">
                <MessageCircle className="size-6" />
              </div>
              <p className="text-sm text-zinc-300">{t("contactsEmpty")}</p>
              <p className="text-xs leading-relaxed text-zinc-500">
                {t("contactsEmptyHint")}
              </p>
            </div>

            <div className="rounded-xl border border-white/8 bg-white/[0.02] p-2">
              <p className="px-2 py-1.5 text-center text-xs font-medium text-zinc-400">
                {t("contactsDiscoverTitle")}
              </p>
              <p className="mb-2 px-2 text-center text-[10px] leading-relaxed text-zinc-600">
                {t("contactsDiscoverHint")}
              </p>
              <div className="space-y-1">
                {listVirtualChatDiscoverPlayers().map((player) => (
                  <ContactListItem
                    key={player.id}
                    contact={{
                      id: player.id,
                      displayName: player.displayName,
                      avatarUrl: resolveVirtualPlayerAvatarUrl(player.id),
                      lastMessage: t("contactsDiscoverPreview"),
                      lastMessageAt: null,
                    }}
                    active={false}
                    onSelect={() => setSelectedId(player.id)}
                  />
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-1">
            {isCreator && (
              <ContactListItem
                contact={{
                  id: ADMIN_SUPPORT_CONTACT_ID,
                  displayName: t("contactsAdminTitle"),
                  lastMessage:
                    adminContact.contact?.lastMessage ??
                    t("contactsAdminDefaultPreview"),
                  lastMessageAt: adminContact.contact?.lastMessageAt ?? null,
                  unread: adminContact.contact?.unread,
                }}
                active={false}
                pinned
                isAdminContact
                onSelect={() => setSelectedId(ADMIN_SUPPORT_CONTACT_ID)}
              />
            )}
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
