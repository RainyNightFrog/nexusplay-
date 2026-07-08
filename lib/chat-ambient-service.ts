import {
  AMBIENT_CHAT_DIALOGUES,
  AMBIENT_CHAT_SINGLES,
  AMBIENT_CREATOR_DIALOGUES,
  AMBIENT_CREATOR_SINGLES,
  type AmbientChatDialogue,
  type AmbientChatSingle,
} from "@/lib/chat-ambient-content";
import { pickRandom, pickWithoutRepeat } from "@/lib/chat-ambient-pick";
import type { ChatChannel } from "@/lib/chat";
import { CHAT_LIMITS } from "@/lib/chat";
import { createServerSupabase } from "@/lib/supabase-server";
import {
  ambientBotEmail,
  ambientCreatorBotEmail,
  VIRTUAL_PLAYERS,
  VIRTUAL_PLAYERS_BY_LOCALE,
  type VirtualPlayer,
  type VirtualPlayerLocale,
} from "@/lib/virtual-players";
import type { SupabaseClient } from "@supabase/supabase-js";

const WORLD_DIALOGUE_CHANCE = 0.5;
const CREATOR_DIALOGUE_CHANCE = 0.38;
const REPLY_GAP_MS_MIN = 18_000;
const REPLY_GAP_MS_MAX = 75_000;
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

function pickWorldSingle(
  locale: VirtualPlayerLocale | undefined,
  recent: Set<string>
): AmbientChatSingle {
  const pool = locale
    ? AMBIENT_CHAT_SINGLES.filter((line) => line.locale === locale)
    : AMBIENT_CHAT_SINGLES;
  return pickWithoutRepeat(pool, recent, (line) => line.content);
}

function pickCreatorSingle(
  locale: VirtualPlayerLocale | undefined,
  recent: Set<string>
): AmbientChatSingle {
  const pool = locale
    ? AMBIENT_CREATOR_SINGLES.filter((line) => line.locale === locale)
    : AMBIENT_CREATOR_SINGLES;
  return pickWithoutRepeat(pool, recent, (line) => line.content);
}

function pickDialogue(
  pool: AmbientChatDialogue[],
  locale: VirtualPlayerLocale | undefined,
  recent: Set<string>
): AmbientChatDialogue {
  const filtered = locale ? pool.filter((line) => line.locale === locale) : pool;
  return pickWithoutRepeat(filtered, recent, (line) => line.lines);
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
  const { data, error } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  if (error) throw new Error(error.message);

  const byEmail = new Map<string, string>();
  for (const user of data.users ?? []) {
    if (user.email?.endsWith("@nexusplay.local")) {
      byEmail.set(user.email, user.id);
    }
  }
  return byEmail;
}

async function syncAmbientPlayerProfile(
  supabase: SupabaseClient,
  userId: string,
  player: VirtualPlayer,
  options?: { asCreator?: boolean }
) {
  const role = options?.asCreator ? "creator" : "player";
  const { error: profileError } = await supabase.from("profiles").upsert(
    {
      id: userId,
      display_name: player.displayName,
      role,
    },
    { onConflict: "id" }
  );
  if (profileError) throw new Error(profileError.message);

  const { error: authError } = await supabase.auth.admin.updateUserById(userId, {
    user_metadata: {
      display_name: player.displayName,
      role,
      ambient_bot: true,
      ambient_id: player.id,
    },
  });
  if (authError) throw new Error(authError.message);
}

async function ensureAmbientPlayer(
  supabase: SupabaseClient,
  player: VirtualPlayer,
  cache: Map<string, string>,
  options?: { asCreator?: boolean }
): Promise<string> {
  const email = options?.asCreator
    ? ambientCreatorBotEmail(player.id)
    : ambientBotEmail(player.id);
  const cached = cache.get(email);
  if (cached) {
    await syncAmbientPlayerProfile(supabase, cached, player, options);
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
    const existing = refreshed.get(email);
    if (existing) {
      cache.set(email, existing);
      return existing;
    }
    throw new Error(error.message);
  }

  const userId = data.user.id;
  const { error: profileError } = await supabase.from("profiles").upsert(
    {
      id: userId,
      display_name: player.displayName,
      role: options?.asCreator ? "creator" : "player",
    },
    { onConflict: "id" }
  );

  if (profileError && !profileError.message.includes("duplicate")) {
    throw new Error(profileError.message);
  }

  cache.set(email, userId);
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
