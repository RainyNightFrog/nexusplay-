import {
  AMBIENT_CHAT_DIALOGUES,
  AMBIENT_CHAT_SINGLES,
  AMBIENT_CREATOR_DIALOGUES,
  AMBIENT_CREATOR_SINGLES,
  type AmbientChatDialogue,
  type AmbientChatSingle,
} from "@/lib/chat-ambient-content";
import { pickRandom, pickWithoutRepeat } from "@/lib/chat-ambient-pick";
import {
  filterAmbientByTimeSlot,
  getCurrentAmbientTimeSlot,
} from "@/lib/chat-ambient-time";
import type { ChatChannel } from "@/lib/chat";
import { CHAT_LIMITS } from "@/lib/chat";
import { createServerSupabase } from "@/lib/supabase-server";
import { ambientEmailAliases, isAmbientLocalEmail } from "@/lib/ambient-local-email";
import {
  ambientBotEmail,
  ambientCreatorBotEmail,
  VIRTUAL_PLAYERS,
  VIRTUAL_PLAYERS_BY_LOCALE,
  getVirtualPlayerById,
  type VirtualPlayer,
  type VirtualPlayerLocale,
} from "@/lib/virtual-players";
import { resolveVirtualPlayerAvatarUrl } from "@/lib/virtual-player-avatar";
import { upsertBotProfile } from "@/lib/profile-player-number";
import type { SupabaseClient } from "@supabase/supabase-js";

const WORLD_DIALOGUE_CHANCE = 0.58;
const CREATOR_DIALOGUE_CHANCE = 0.45;
const REPLY_GAP_MS_MIN = 12_000;
const REPLY_GAP_MS_MAX = 48_000;
const RECENT_CONTENT_LIMIT = 200;

type AmbientPostResult = {
  channel: ChatChannel;
  posted: number;
  type: "single" | "dialogue";
  players: string[];
  messages: string[];
};

function historyCutoffIso() {
  return new Date(
    Date.now() - CHAT_LIMITS.historyDays * 86_400_000
  ).toISOString();
}

async function getRecentChannelContents(
  supabase: SupabaseClient,
  channel: ChatChannel,
  seed?: Set<string>
): Promise<Set<string>> {
  const recent = new Set(seed ?? []);
  const { data, error } = await supabase
    .from("chat_messages")
    .select("content")
    .eq("channel", channel)
    .gte("created_at", historyCutoffIso())
    .is("recalled_at", null)
    .order("created_at", { ascending: false })
    .limit(RECENT_CONTENT_LIMIT);

  if (error) throw new Error(error.message);
  for (const row of data ?? []) {
    recent.add(row.content as string);
  }
  return recent;
}

function trackPosted(recent: Set<string>, messages: string[]) {
  for (const message of messages) recent.add(message);
}

function pickLocale(): VirtualPlayerLocale {
  const roll = Math.random();
  if (roll < 0.38) return "zh-HK";
  if (roll < 0.68) return "zh-CN";
  return "en";
}

function applyTimeSlotPool<T>(
  pool: T[],
  getText: (item: T) => string | string[]
): T[] {
  const slot = getCurrentAmbientTimeSlot();
  const filtered = filterAmbientByTimeSlot(pool, slot, getText);
  return filtered.length > 0 ? filtered : pool;
}

function pickWorldSingle(
  locale: VirtualPlayerLocale | undefined,
  recent: Set<string>
): AmbientChatSingle {
  const base = locale
    ? AMBIENT_CHAT_SINGLES.filter((line) => line.locale === locale)
    : AMBIENT_CHAT_SINGLES;
  const pool = applyTimeSlotPool(base, (line) => line.content);
  return pickWithoutRepeat(pool, recent, (line) => line.content);
}

function pickCreatorSingle(
  locale: VirtualPlayerLocale | undefined,
  recent: Set<string>
): AmbientChatSingle {
  const base = locale
    ? AMBIENT_CREATOR_SINGLES.filter((line) => line.locale === locale)
    : AMBIENT_CREATOR_SINGLES;
  const pool = applyTimeSlotPool(base, (line) => line.content);
  return pickWithoutRepeat(pool, recent, (line) => line.content);
}

function pickDialogue(
  pool: AmbientChatDialogue[],
  locale: VirtualPlayerLocale | undefined,
  recent: Set<string>
): AmbientChatDialogue {
  const byLocale = locale ? pool.filter((line) => line.locale === locale) : pool;
  const timePool = applyTimeSlotPool(byLocale, (line) => line.lines);
  return pickWithoutRepeat(timePool, recent, (line) => line.lines);
}

function pickWorldDialogue(
  locale: VirtualPlayerLocale | undefined,
  recent: Set<string>
) {
  return pickDialogue(AMBIENT_CHAT_DIALOGUES, locale, recent);
}

function pickCreatorDialogue(
  locale: VirtualPlayerLocale | undefined,
  recent: Set<string>
) {
  return pickDialogue(AMBIENT_CREATOR_DIALOGUES, locale, recent);
}

function pickPlayer(locale: VirtualPlayerLocale, excludeId?: string): VirtualPlayer {
  const pool = excludeId
    ? VIRTUAL_PLAYERS_BY_LOCALE[locale].filter((player) => player.id !== excludeId)
    : VIRTUAL_PLAYERS_BY_LOCALE[locale];
  return pickRandom(pool);
}

async function listAmbientBotUsers(supabase: SupabaseClient) {
  let lastMessage = "listUsers failed";
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });
    if (!error) {
      const byEmail = new Map<string, string>();
      for (const user of data.users ?? []) {
        if (user.email && isAmbientLocalEmail(user.email)) {
          byEmail.set(user.email, user.id);
        }
      }
      return byEmail;
    }
    lastMessage = error.message;
    await new Promise((resolve) => setTimeout(resolve, 350 * (attempt + 1)));
  }
  throw new Error(lastMessage);
}

async function syncAmbientPlayerProfile(
  supabase: SupabaseClient,
  userId: string,
  player: VirtualPlayer,
  options?: { asCreator?: boolean; skipAuthMetadata?: boolean }
) {
  const role = options?.asCreator ? "creator" : "player";
  await upsertBotProfile(supabase, {
    userId,
    displayName: player.displayName,
    avatarUrl: resolveVirtualPlayerAvatarUrl(player.id),
    role,
  });

  if (options?.skipAuthMetadata) return;

  const { error: authError } = await supabase.auth.admin.updateUserById(userId, {
    user_metadata: {
      display_name: player.displayName,
      role,
      ambient_bot: true,
      ambient_id: player.id,
    },
  });
  // Auth Admin 偶發 JWT 驗簽失敗時，profile 已足夠供聊天顯示
  if (authError) {
    console.warn(
      `[ambient] skip auth metadata sync for ${player.id}: ${authError.message}`
    );
  }
}

async function ensureAmbientPlayer(
  supabase: SupabaseClient,
  player: VirtualPlayer,
  cache: Map<string, string>,
  options?: { asCreator?: boolean }
): Promise<string> {
  const localPart = options?.asCreator
    ? `ambient.creator.${player.id}`
    : `ambient.${player.id}`;
  const [email, legacyEmail] = ambientEmailAliases(localPart);
  const cached =
    cache.get(email) ??
    cache.get(legacyEmail) ??
    null;
  if (cached) {
    await syncAmbientPlayerProfile(supabase, cached, player, options);
    cache.set(email, cached);
    cache.set(legacyEmail, cached);
    return cached;
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password: "AmbientBot_NexusPlay_2026!",
    email_confirm: true,
    user_metadata: {
      display_name: player.displayName,
      role: options?.asCreator ? "creator" : "player",
      ambient_bot: true,
      ambient_id: player.id,
    },
  });

  if (error) {
    const refreshed = await listAmbientBotUsers(supabase);
    const existing = refreshed.get(email) ?? refreshed.get(legacyEmail);
    if (existing) {
      cache.set(email, existing);
      cache.set(legacyEmail, existing);
      await syncAmbientPlayerProfile(supabase, existing, player, options);
      return existing;
    }
    throw new Error(error.message);
  }

  const userId = data.user.id;
  await syncAmbientPlayerProfile(supabase, userId, player, options);

  cache.set(email, userId);
  cache.set(legacyEmail, userId);
  return userId;
}

async function insertAmbientMessage(
  supabase: SupabaseClient,
  channel: ChatChannel,
  userId: string,
  content: string,
  createdAt: Date
) {
  const { error } = await supabase.from("chat_messages").insert({
    channel,
    user_id: userId,
    content,
    created_at: createdAt.toISOString(),
  });

  if (error) throw new Error(error.message);
}

export async function postAmbientWorldChat(
  options?: { at?: Date; recentContents?: Set<string> }
): Promise<AmbientPostResult> {
  const supabase = createServerSupabase();
  const botCache = await listAmbientBotUsers(supabase);
  const recent = await getRecentChannelContents(
    supabase,
    "world",
    options?.recentContents
  );
  const locale = pickLocale();
  const postedAt = options?.at ?? new Date();

  if (Math.random() < WORLD_DIALOGUE_CHANCE) {
    const dialogue = pickWorldDialogue(locale, recent);
    const firstPlayer = pickPlayer(dialogue.locale);
    const secondPlayer = pickPlayer(dialogue.locale, firstPlayer.id);
    const gap =
      REPLY_GAP_MS_MIN +
      Math.floor(Math.random() * (REPLY_GAP_MS_MAX - REPLY_GAP_MS_MIN));
    const secondAt = postedAt;
    const firstAt = new Date(secondAt.getTime() - gap);

    const firstUserId = await ensureAmbientPlayer(supabase, firstPlayer, botCache);
    const secondUserId = await ensureAmbientPlayer(
      supabase,
      secondPlayer,
      botCache
    );

    await insertAmbientMessage(
      supabase,
      "world",
      firstUserId,
      dialogue.lines[0],
      firstAt
    );
    await insertAmbientMessage(
      supabase,
      "world",
      secondUserId,
      dialogue.lines[1],
      secondAt
    );

    trackPosted(recent, [...dialogue.lines]);

    return {
      channel: "world",
      posted: 2,
      type: "dialogue",
      players: [firstPlayer.displayName, secondPlayer.displayName],
      messages: [...dialogue.lines],
    };
  }

  const single = pickWorldSingle(locale, recent);
  const player = pickPlayer(single.locale);
  const userId = await ensureAmbientPlayer(supabase, player, botCache);
  await insertAmbientMessage(supabase, "world", userId, single.content, postedAt);

  trackPosted(recent, [single.content]);

  return {
    channel: "world",
    posted: 1,
    type: "single",
    players: [player.displayName],
    messages: [single.content],
  };
}

/** 創作者頻道：單句或對答 */
export async function postAmbientCreatorChat(
  options?: { at?: Date; recentContents?: Set<string> }
): Promise<AmbientPostResult> {
  const supabase = createServerSupabase();
  const botCache = await listAmbientBotUsers(supabase);
  const recent = await getRecentChannelContents(
    supabase,
    "creator",
    options?.recentContents
  );
  const locale = pickLocale();
  const postedAt = options?.at ?? new Date();

  if (Math.random() < CREATOR_DIALOGUE_CHANCE) {
    const dialogue = pickCreatorDialogue(locale, recent);
    const firstPlayer = pickPlayer(dialogue.locale);
    const secondPlayer = pickPlayer(dialogue.locale, firstPlayer.id);
    const gap =
      REPLY_GAP_MS_MIN +
      Math.floor(Math.random() * (REPLY_GAP_MS_MAX - REPLY_GAP_MS_MIN));
    const secondAt = postedAt;
    const firstAt = new Date(secondAt.getTime() - gap);

    const firstUserId = await ensureAmbientPlayer(supabase, firstPlayer, botCache, {
      asCreator: true,
    });
    const secondUserId = await ensureAmbientPlayer(
      supabase,
      secondPlayer,
      botCache,
      { asCreator: true }
    );

    await insertAmbientMessage(
      supabase,
      "creator",
      firstUserId,
      dialogue.lines[0],
      firstAt
    );
    await insertAmbientMessage(
      supabase,
      "creator",
      secondUserId,
      dialogue.lines[1],
      secondAt
    );

    trackPosted(recent, [...dialogue.lines]);

    return {
      channel: "creator",
      posted: 2,
      type: "dialogue",
      players: [firstPlayer.displayName, secondPlayer.displayName],
      messages: [...dialogue.lines],
    };
  }

  const single = pickCreatorSingle(locale, recent);
  const player = pickPlayer(single.locale);
  const userId = await ensureAmbientPlayer(supabase, player, botCache, {
    asCreator: true,
  });

  await insertAmbientMessage(
    supabase,
    "creator",
    userId,
    single.content,
    postedAt
  );

  trackPosted(recent, [single.content]);

  return {
    channel: "creator",
    posted: 1,
    type: "single",
    players: [player.displayName],
    messages: [single.content],
  };
}

export async function ensureAllAmbientPlayers() {
  const supabase = createServerSupabase();
  const cache = await listAmbientBotUsers(supabase);
  const created: string[] = [];
  const synced: string[] = [];

  for (const player of VIRTUAL_PLAYERS) {
    for (const asCreator of [false, true] as const) {
      const email = asCreator
        ? ambientCreatorBotEmail(player.id)
        : ambientBotEmail(player.id);
      const existed = cache.has(email);
      await ensureAmbientPlayer(supabase, player, cache, { asCreator });
      const label = `${asCreator ? "creator:" : "world:"}${player.displayName}`;
      if (existed) synced.push(label);
      else created.push(label);
    }
  }

  return { total: VIRTUAL_PLAYERS.length * 2, created, synced };
}

const COSMETIC_SHOWCASE_LINES: Record<string, string[]> = {
  "zh-HK": [
    "剛換咗個新頭像框，感覺勁晒～",
    "呢個名色靚唔靚？我覺得幾岩氣氛",
    "氣泡特效開咗，世界頻道即刻唔同晒",
    "AP 商店掃咗一輪，決定用呢套外觀",
  ],
  "zh-CN": [
    "刚换了新头像框，感觉很炫～",
    "这个名字颜色好看吗？我挺喜欢的",
    "气泡特效开了，聊天区马上不一样",
    "AP 商店逛了一圈，决定用这套外观",
  ],
  en: [
    "Just equipped a new avatar frame — looking sharp.",
    "Trying this name color — vibe check?",
    "Bubble effect on. World chat feels different now.",
    "Picked a fresh look from the AP store.",
  ],
};

/**
 * 讓已裝備 AP 外觀的虛擬玩家各在世界頻道發言一次（方便預覽特效）。
 */
export async function postVirtualCosmeticShowcaseMessages(): Promise<{
  posted: number;
  players: string[];
  messages: { playerId: string; displayName: string; content: string }[];
}> {
  const { listVirtualPlayerIdsWithCosmetics } = await import(
    "@/lib/virtual-player-cosmetics"
  );
  const playerIds = listVirtualPlayerIdsWithCosmetics();
  const supabase = createServerSupabase();
  const botCache = await listAmbientBotUsers(supabase);
  const results: { playerId: string; displayName: string; content: string }[] =
    [];

  let offsetMs = 0;
  for (const playerId of playerIds) {
    const player = getVirtualPlayerById(playerId);
    if (!player) continue;

    const pool =
      COSMETIC_SHOWCASE_LINES[player.locale] ?? COSMETIC_SHOWCASE_LINES.en!;
    const content =
      pool[hashShowcaseIndex(playerId) % pool.length] ?? pool[0]!;

    const localPart = `ambient.${player.id}`;
    const [email, legacyEmail] = ambientEmailAliases(localPart);
    let userId = botCache.get(email) ?? botCache.get(legacyEmail) ?? null;
    if (!userId) {
      userId = await ensureAmbientPlayer(supabase, player, botCache);
    } else {
      await syncAmbientPlayerProfile(supabase, userId, player, {
        skipAuthMetadata: true,
      });
    }
    const createdAt = new Date(Date.now() - (playerIds.length - offsetMs) * 1500);
    await insertAmbientMessage(supabase, "world", userId, content, createdAt);
    results.push({
      playerId,
      displayName: player.displayName,
      content,
    });
    offsetMs += 1;
  }

  return {
    posted: results.length,
    players: results.map((row) => row.displayName),
    messages: results,
  };
}

function hashShowcaseIndex(playerId: string) {
  let hash = 421;
  for (const char of playerId) {
    hash = Math.imul(31, hash) + char.charCodeAt(0);
    hash |= 0;
  }
  return Math.abs(hash);
}

/** 灌入近期聊天記錄，讓世界頻道一打開就有對話感 */
export async function bootstrapAmbientWorldChat(messageCount = 14) {
  const supabase = createServerSupabase();
  const recent = await getRecentChannelContents(supabase, "world");
  const results: AmbientPostResult[] = [];
  for (let index = 0; index < messageCount; index += 1) {
    const minutesAgo = (messageCount - index) * 3 + Math.random() * 2;
    const at = new Date(Date.now() - minutesAgo * 60_000);
    const result = await postAmbientWorldChat({ at, recentContents: recent });
    trackPosted(recent, result.messages);
    results.push(result);
  }
  return {
    posted: results.reduce((sum, row) => sum + row.posted, 0),
    rounds: results.length,
  };
}

export async function bootstrapAmbientCreatorChat(messageCount = 8) {
  const supabase = createServerSupabase();
  const recent = await getRecentChannelContents(supabase, "creator");
  const results: AmbientPostResult[] = [];
  for (let index = 0; index < messageCount; index += 1) {
    const minutesAgo = (messageCount - index) * 28 + Math.random() * 8;
    const at = new Date(Date.now() - minutesAgo * 60_000);
    const result = await postAmbientCreatorChat({ at, recentContents: recent });
    trackPosted(recent, result.messages);
    results.push(result);
  }
  return {
    posted: results.reduce((sum, row) => sum + row.posted, 0),
    rounds: results.length,
  };
}
