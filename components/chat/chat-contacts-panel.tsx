"use client";

import { ArrowLeft, Loader2, MessageCircle, Shield } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { ChatInput } from "@/components/chat/chat-input";
import { RainbowSafeText } from "@/components/supporter/rainbow-safe-text";
import {
  useAdminSupportChat,
  useAdminSupportContact,
} from "@/hooks/use-admin-support-chat";
import {
  useOpenPlayerDm,
  usePlayerDmChat,
  usePlayerDmContacts,
} from "@/hooks/use-player-dm";
import { useVirtualContacts, useVirtualDm } from "@/hooks/use-virtual-dm";
import {
  ADMIN_SUPPORT_CONTACT_ID,
  SUPPORT_CHAT_LIMITS,
} from "@/lib/support-chat";
import { PLAYER_DM_LIMITS } from "@/lib/player-dm";
import {
  parseVirtualDmContactId,
  toVirtualDmContactId,
  VIRTUAL_DM_LIMITS,
} from "@/lib/virtual-dm";
import { resolveVirtualPlayerAvatarUrl } from "@/lib/virtual-player-avatar";
import { getVirtualPlayerById } from "@/lib/virtual-players";
import { getVirtualPlayerSupporterFlags } from "@/lib/virtual-player-supporter";
import {
  getSupporterDisplayTier,
  supporterMessageContentClassByTier,
  type SupporterDisplayTier,
} from "@/lib/supporter-tier";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

function DmMessageBubble({
  content,
  isOwn,
  senderName,
  supporterTier = "none",
}: {
  content: string;
  isOwn: boolean;
  senderName?: string | null;
  supporterTier?: SupporterDisplayTier;
}) {
  const isSupporter = supporterTier !== "none";
  return (
    <div className={cn("flex", isOwn ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap break-words",
          isOwn
            ? "bg-gradient-to-r from-cyan-600 to-violet-600"
            : "border border-white/10 bg-white/5"
        )}
      >
        {!isOwn && senderName ? (
          <p className="mb-1 text-[10px] font-medium text-zinc-400">
            {senderName}
          </p>
        ) : null}
        {isSupporter && supporterTier === "premium" ? (
          <RainbowSafeText
            text={content}
            rainbowClassName={supporterMessageContentClassByTier.premium}
          />
        ) : (
          <span
            className={cn(
              isSupporter
                ? supporterMessageContentClassByTier[supporterTier]
                : isOwn
                  ? "text-white"
                  : "text-zinc-100"
            )}
          >
            {content}
          </span>
        )}
      </div>
    </div>
  );
}

function ContactListItem({
  contact,
  active,
  onSelect,
  pinned,
  isAdminContact,
  avatarUrl,
}: {
  contact: {
    id: string;
    displayName: string;
    lastMessage: string | null;
    lastMessageAt: string | null;
    unread?: boolean;
  };
  active: boolean;
  onSelect: () => void;
  pinned?: boolean;
  isAdminContact?: boolean;
  avatarUrl?: string | null;
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
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarUrl}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <div
            className={cn(
              "flex h-full w-full items-center justify-center",
              isAdminContact
                ? "bg-gradient-to-br from-amber-500/30 to-cyan-500/20 text-amber-200"
                : "bg-white/8 text-zinc-300"
            )}
          >
            {isAdminContact ? (
              <Shield className="size-5" />
            ) : (
              <span className="text-sm font-semibold">
                {contact.displayName.slice(0, 1)}
              </span>
            )}
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "truncate text-sm font-semibold",
              isAdminContact ? "text-amber-100" : "text-zinc-100"
            )}
          >
            {contact.displayName}
          </span>
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

function PlayerDmThread({
  threadId,
  fallbackName,
  onBack,
  onProfileClick,
  supporterTier = "none",
}: {
  threadId: string;
  fallbackName?: string;
  onBack: () => void;
  onProfileClick?: (target: {
    userId?: string | null;
    virtualPlayerId?: string | null;
    displayName: string;
    avatarUrl?: string | null;
  }) => void;
  supporterTier?: SupporterDisplayTier;
}) {
  const t = useTranslations("chat");
  const [draft, setDraft] = useState("");
  const chat = usePlayerDmChat(threadId, true);
  const title = chat.thread?.peerDisplayName ?? fallbackName ?? t("playerDmTitle");
  const peerUserId = chat.thread?.peerUserId ?? null;
  const peerAvatarUrl = chat.thread?.peerAvatarUrl ?? null;

  function openProfile() {
    if (!onProfileClick || !peerUserId) return;
    onProfileClick({
      userId: peerUserId,
      displayName: title,
      avatarUrl: peerAvatarUrl,
    });
  }

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
          onClick={openProfile}
          disabled={!onProfileClick || !peerUserId}
          className="flex min-w-0 flex-1 items-center gap-2 rounded-lg px-1 py-0.5 text-left transition-colors hover:bg-white/5 disabled:pointer-events-none"
        >
          <div className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/8 text-zinc-200 ring-1 ring-white/10">
            {peerAvatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={peerAvatarUrl}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              <MessageCircle className="size-4" />
            )}
          </div>
          <div className="min-w-0 flex-1 text-left">
            <p className="truncate text-sm font-semibold text-zinc-100 underline-offset-2 hover:underline">
              {title}
            </p>
          </div>
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
        {chat.loading && chat.messages.length === 0 ? (
          <div className="flex items-center justify-center py-10 text-sm text-zinc-500">
            <Loader2 className="mr-2 size-4 animate-spin" />
            {t("loading")}
          </div>
        ) : chat.messages.length === 0 ? (
          <div className="space-y-2 px-2 py-8 text-center">
            <p className="text-sm text-zinc-300">{t("contactsEmptyThread")}</p>
            <p className="text-xs leading-relaxed text-zinc-500">
              {t("playerDmEmptyHint")}
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {chat.messages.map((message) => (
              <DmMessageBubble
                key={message.id}
                content={message.content}
                isOwn={message.is_own}
                senderName={message.sender_display_name}
                supporterTier={message.sender_supporter_tier ?? "none"}
              />
            ))}
            <div ref={chat.bottomRef} />
          </div>
        )}
      </div>

      <ChatInput
        value={draft}
        onChange={setDraft}
        sending={chat.sending}
        maxLength={PLAYER_DM_LIMITS.content}
        supporterTier={supporterTier}
        onSend={async (content) => {
          const ok = await chat.sendMessage(content);
          if (ok) setDraft("");
          return ok;
        }}
      />

      {chat.error && (
        <div className="border-t border-rose-500/20 bg-rose-500/10 px-3 py-2 text-center text-xs text-rose-300">
          {chat.error}
        </div>
      )}
    </div>
  );
}

function VirtualDmThread({
  virtualPlayerId,
  fallbackName,
  fallbackAvatar,
  onBack,
  onProfileClick,
  supporterTier = "none",
}: {
  virtualPlayerId: string;
  fallbackName?: string;
  fallbackAvatar?: string | null;
  onBack: () => void;
  onProfileClick?: (target: {
    userId?: string | null;
    virtualPlayerId?: string | null;
    displayName: string;
    avatarUrl?: string | null;
  }) => void;
  supporterTier?: SupporterDisplayTier;
}) {
  const t = useTranslations("chat");
  const [draft, setDraft] = useState("");
  const chat = useVirtualDm(virtualPlayerId, true);
  const player = getVirtualPlayerById(virtualPlayerId);
  const title =
    player?.displayName ?? fallbackName ?? t("playerDmTitle");
  const avatarUrl =
    fallbackAvatar ?? resolveVirtualPlayerAvatarUrl(virtualPlayerId);

  function openProfile() {
    if (!onProfileClick) return;
    onProfileClick({
      virtualPlayerId,
      displayName: title,
      avatarUrl,
    });
  }

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
          onClick={openProfile}
          disabled={!onProfileClick}
          className="flex min-w-0 flex-1 items-center gap-2 rounded-lg px-1 py-0.5 text-left transition-colors hover:bg-white/5 disabled:pointer-events-none"
        >
          <div className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/8 text-zinc-200 ring-1 ring-white/10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
          </div>
          <div className="min-w-0 flex-1 text-left">
            <p className="truncate text-sm font-semibold text-zinc-100 underline-offset-2 hover:underline">
              {title}
            </p>
          </div>
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
        {chat.loading && chat.messages.length === 0 ? (
          <div className="flex items-center justify-center py-10 text-sm text-zinc-500">
            <Loader2 className="mr-2 size-4 animate-spin" />
            {t("loading")}
          </div>
        ) : chat.messages.length === 0 ? (
          <div className="space-y-2 px-2 py-8 text-center">
            <p className="text-sm text-zinc-300">{t("contactsEmptyThread")}</p>
            <p className="text-xs leading-relaxed text-zinc-500">
              {t("playerDmEmptyHint")}
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {chat.messages.map((message) => {
              const isOwn = message.sender === "user";
              const peerFlags = getVirtualPlayerSupporterFlags(virtualPlayerId);
              const messageTier = isOwn
                ? supporterTier
                : getSupporterDisplayTier(
                    peerFlags?.isSupporter === true,
                    peerFlags?.badge ?? null
                  );
              return (
                <DmMessageBubble
                  key={message.id}
                  content={message.content}
                  isOwn={isOwn}
                  supporterTier={messageTier}
                />
              );
            })}
            <div ref={chat.bottomRef} />
          </div>
        )}
      </div>

      <ChatInput
        value={draft}
        onChange={setDraft}
        sending={chat.sending}
        maxLength={VIRTUAL_DM_LIMITS.content}
        supporterTier={supporterTier}
        onSend={async (content) => {
          const ok = await chat.sendMessage(content);
          if (ok) setDraft("");
          return ok;
        }}
      />

      {chat.error && (
        <div className="border-t border-rose-500/20 bg-rose-500/10 px-3 py-2 text-center text-xs text-rose-300">
          {chat.error}
        </div>
      )}
    </div>
  );
}

export function ChatContactsPanel({
  active,
  supporterTier = "none",
  initialPeerUserId = null,
  initialVirtualPlayerId = null,
  onInitialPeerConsumed,
  onPlayerProfileClick,
}: {
  active: boolean;
  supporterTier?: SupporterDisplayTier;
  initialPeerUserId?: string | null;
  initialVirtualPlayerId?: string | null;
  onInitialPeerConsumed?: () => void;
  onPlayerProfileClick?: (target: {
    userId?: string | null;
    virtualPlayerId?: string | null;
    displayName: string;
    avatarUrl?: string | null;
  }) => void;
}) {
  const t = useTranslations("chat");
  const adminContact = useAdminSupportContact(active);
  const dmContacts = usePlayerDmContacts(active);
  const virtualContacts = useVirtualContacts(active);
  const openPlayerDm = useOpenPlayerDm();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [openingPeer, setOpeningPeer] = useState(false);
  const [openError, setOpenError] = useState<string | null>(null);

  useEffect(() => {
    if (!active) return;

    if (initialVirtualPlayerId) {
      setSelectedId(toVirtualDmContactId(initialVirtualPlayerId));
      setOpeningPeer(false);
      onInitialPeerConsumed?.();
      void virtualContacts.reload();
      return;
    }

    if (!initialPeerUserId) return;

    let cancelled = false;
    setOpeningPeer(true);
    setOpenError(null);

    void (async () => {
      try {
        const thread = await openPlayerDm(initialPeerUserId);
        if (cancelled) return;
        if (thread) {
          setSelectedId(thread.id);
          void dmContacts.reload();
        }
      } catch (err) {
        if (!cancelled) {
          setOpenError(
            err instanceof Error ? err.message : t("playerDmOpenFailed")
          );
        }
      } finally {
        if (!cancelled) {
          setOpeningPeer(false);
          onInitialPeerConsumed?.();
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [active, initialPeerUserId, initialVirtualPlayerId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!active) return null;

  const reloadList = () => {
    void adminContact.reload();
    void dmContacts.reload();
    void virtualContacts.reload();
  };

  if (selectedId === ADMIN_SUPPORT_CONTACT_ID) {
    return (
      <AdminSupportThread
        supporterTier={supporterTier}
        onBack={() => {
          setSelectedId(null);
          reloadList();
        }}
      />
    );
  }

  const virtualPlayerId = selectedId
    ? parseVirtualDmContactId(selectedId)
    : null;

  if (virtualPlayerId) {
    const contact = virtualContacts.contacts.find(
      (item) => item.id === virtualPlayerId
    );
    return (
      <VirtualDmThread
        virtualPlayerId={virtualPlayerId}
        fallbackName={contact?.displayName}
        fallbackAvatar={contact?.avatarUrl}
        supporterTier={supporterTier}
        onProfileClick={onPlayerProfileClick}
        onBack={() => {
          setSelectedId(null);
          reloadList();
        }}
      />
    );
  }

  if (selectedId) {
    const peerName = dmContacts.contacts.find(
      (c) => c.threadId === selectedId
    )?.displayName;
    return (
      <PlayerDmThread
        threadId={selectedId}
        fallbackName={peerName}
        supporterTier={supporterTier}
        onProfileClick={onPlayerProfileClick}
        onBack={() => {
          setSelectedId(null);
          reloadList();
        }}
      />
    );
  }

  const loading =
    (adminContact.loading && !adminContact.contact) ||
    ((dmContacts.loading || virtualContacts.loading) &&
      dmContacts.contacts.length === 0 &&
      virtualContacts.contacts.length === 0) ||
    openingPeer;

  const mergedContacts = [
    ...dmContacts.contacts.map((contact) => ({
      key: contact.threadId,
      id: contact.threadId,
      displayName: contact.displayName,
      lastMessage: contact.lastMessage,
      lastMessageAt: contact.lastMessageAt,
      unread: contact.unread,
      avatarUrl: contact.avatarUrl,
    })),
    ...virtualContacts.contacts.map((contact) => ({
      key: toVirtualDmContactId(contact.id),
      id: toVirtualDmContactId(contact.id),
      displayName: contact.displayName,
      lastMessage: contact.lastMessage,
      lastMessageAt: contact.lastMessageAt,
      unread: false,
      avatarUrl: contact.avatarUrl as string | null,
    })),
  ].sort((a, b) => {
    const aTime = a.lastMessageAt ? Date.parse(a.lastMessageAt) : 0;
    const bTime = b.lastMessageAt ? Date.parse(b.lastMessageAt) : 0;
    return bTime - aTime;
  });

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
        ) : adminContact.error &&
          dmContacts.error &&
          virtualContacts.error ? (
          <p className="py-10 text-center text-sm text-rose-300">
            {adminContact.error}
          </p>
        ) : (
          <div className="space-y-1">
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

            {mergedContacts.map((contact) => (
              <ContactListItem
                key={contact.key}
                contact={{
                  id: contact.id,
                  displayName: contact.displayName,
                  lastMessage: contact.lastMessage,
                  lastMessageAt: contact.lastMessageAt,
                  unread: contact.unread,
                }}
                avatarUrl={contact.avatarUrl}
                active={false}
                onSelect={() => setSelectedId(contact.id)}
              />
            ))}

            {(openError || dmContacts.error || virtualContacts.error) && (
              <p className="px-3 py-2 text-center text-xs text-rose-300">
                {openError ?? dmContacts.error ?? virtualContacts.error}
              </p>
            )}

            <p className="px-3 py-4 text-center text-xs leading-relaxed text-zinc-600">
              {t("contactsEmptyHint")}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
