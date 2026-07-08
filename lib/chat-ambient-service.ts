import {
  AMBIENT_CHAT_DIALOGUES,
  AMBIENT_CHAT_SINGLES,
  AMBIENT_CREATOR_SINGLES,
  type AmbientChatDialogue,
  type AmbientChatSingle,
} from "@/lib/chat-ambient-content";
import type { ChatChannel } from "@/lib/chat";
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

const WORLD_DIALOGUE_CHANCE = 0;
const REPLY_GAP_MS_MIN = 18_000;
const REPLY_GAP_MS_MAX = 75_000;

type AmbientPostResult = {
  channel: ChatChannel;
  posted: number;
  type: "single" | "dialogue";
  players: string[];
  messages: string[];
};

function pickRandom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)]!;
}

function pickLocale(): VirtualPlayerLocale {
  const roll = Math.random();
  if (roll < 0.38) return "zh-HK";
  if (roll < 0.68) return "zh-CN";
  return "en";
}

function pickWorldSingle(locale?: VirtualPlayerLocale): AmbientChatSingle {
  const pool = locale
    ? AMBIENT_CHAT_SINGLES.filter((line) => line.locale === locale)
    : AMBIENT_CHAT_SINGLES;
  return pickRandom(pool);
}

function pickCreatorSingle(locale?: VirtualPlayerLocale): AmbientChatSingle {
  const pool = locale
    ? AMBIENT_CREATOR_SINGLES.filter((line) => line.locale === locale)
    : AMBIENT_CREATOR_SINGLES;
  return pickRandom(pool);
}

function pickDialogue(locale?: VirtualPlayerLocale): AmbientChatDialogue {
  const pool = locale
    ? AMBIENT_CHAT_DIALOGUES.filter((line) => line.locale === locale)
    : AMBIENT_CHAT_DIALOGUES;
  return pickRandom(pool);
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
  if (cached) return cached;

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
  options?: { at?: Date }
): Promise<AmbientPostResult> {
  const supabase = createServerSupabase();
  const botCache = await listAmbientBotUsers(supabase);
  const locale = pickLocale();
  const postedAt = options?.at ?? new Date();

  if (Math.random() < WORLD_DIALOGUE_CHANCE) {
    const dialogue = pickDialogue(locale);
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

    return {
      channel: "world",
      posted: 2,
      type: "dialogue",
      players: [firstPlayer.displayName, secondPlayer.displayName],
      messages: [...dialogue.lines],
    };
  }

  const single = pickWorldSingle(locale);
  const player = pickPlayer(single.locale);
  const userId = await ensureAmbientPlayer(supabase, player, botCache);
  await insertAmbientMessage(supabase, "world", userId, single.content, postedAt);

  return {
    channel: "world",
    posted: 1,
    type: "single",
    players: [player.displayName],
    messages: [single.content],
  };
}

/** 創作者頻道：每次 cron 只發一句 */
export async function postAmbientCreatorChat(
  options?: { at?: Date }
): Promise<AmbientPostResult> {
  const supabase = createServerSupabase();
  const botCache = await listAmbientBotUsers(supabase);
  const locale = pickLocale();
  const postedAt = options?.at ?? new Date();
  const single = pickCreatorSingle(locale);
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

  for (const player of VIRTUAL_PLAYERS) {
    for (const asCreator of [false, true] as const) {
      const email = asCreator
        ? ambientCreatorBotEmail(player.id)
        : ambientBotEmail(player.id);
      if (cache.has(email)) continue;
      await ensureAmbientPlayer(supabase, player, cache, { asCreator });
      created.push(`${asCreator ? "creator:" : "world:"}${player.displayName}`);
    }
  }

  return { total: VIRTUAL_PLAYERS.length * 2, created };
}

/** 灌入近期聊天記錄，讓世界頻道一打開就有對話感 */
export async function bootstrapAmbientWorldChat(messageCount = 8) {
  const results: AmbientPostResult[] = [];
  for (let index = 0; index < messageCount; index += 1) {
    const minutesAgo = (messageCount - index) * 4 + Math.random() * 2.5;
    const at = new Date(Date.now() - minutesAgo * 60_000);
    results.push(await postAmbientWorldChat({ at }));
  }
  return {
    posted: results.reduce((sum, row) => sum + row.posted, 0),
    rounds: results.length,
  };
}

export async function bootstrapAmbientCreatorChat(messageCount = 4) {
  const results: AmbientPostResult[] = [];
  for (let index = 0; index < messageCount; index += 1) {
    const minutesAgo = (messageCount - index) * 35 + Math.random() * 10;
    const at = new Date(Date.now() - minutesAgo * 60_000);
    results.push(await postAmbientCreatorChat({ at }));
  }
  return {
    posted: results.reduce((sum, row) => sum + row.posted, 0),
    rounds: results.length,
  };
}
