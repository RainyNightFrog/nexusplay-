import {
  AMBIENT_CHAT_DIALOGUES,
  AMBIENT_CHAT_SINGLES,
} from "@/lib/chat-ambient-content";
import type { VirtualPlayer, VirtualPlayerLocale } from "@/lib/virtual-players";

/** 每輪回覆延遲：隨機約 2～80 分鐘（依對話回合穩定取樣，避免每次重整亂跳） */
export const VIRTUAL_DM_REPLY_DELAY = {
  minMs: 2 * 60_000,
  maxMs: 80 * 60_000,
} as const;

const GENERIC: Record<VirtualPlayerLocale, string[]> = {
  "zh-HK": [
    "哈哈係喎",
    "等等我開機先",
    "而家玩緊另一款",
    "可以呀",
    "唔知喎你試下",
    "我頭先都係咁",
    "得閒再傾啦",
    "正呀",
    "哦哦",
    "真係?",
    "我都覺得",
    "稍等一陣",
  ],
  "zh-CN": [
    "哈哈是的",
    "等我开一下",
    "我在打别的",
    "可以啊",
    "不太清楚你试试",
    "我刚才也这样",
    "有空再聊",
    "行",
    "哦哦",
    "真的假的",
    "同感",
    "等下哈",
  ],
  en: [
    "lol fair",
    "gimme a sec",
    "im on another game rn",
    "sure",
    "idk try it",
    "same here",
    "ttyl",
    "nice",
    "ohh",
    "for real?",
    "mood",
    "one sec",
  ],
};

const GREETING: Record<VirtualPlayerLocale, string[]> = {
  "zh-HK": ["嗨", "你好呀", "哈囉", "喺度", "嗨 做緊咩"],
  "zh-CN": ["嗨", "你好呀", "在的", "嗨 干嘛呢"],
  en: ["hey", "yo", "hi", "hey whats up"],
};

const THANKS: Record<VirtualPlayerLocale, string[]> = {
  "zh-HK": ["唔使客氣啦", "哈哈小事", "得啦得啦"],
  "zh-CN": ["没事没事", "哈哈客气了", "小事"],
  en: ["np", "all good", "yw"],
};

const GAME_TALK: Record<VirtualPlayerLocale, string[]> = {
  "zh-HK": [
    "邊款嚟 好唔好打",
    "我都想試",
    "難度高唔高",
    "我尋晚打到好夜",
    "推介呀?",
  ],
  "zh-CN": [
    "哪款啊好不好玩",
    "我也想试",
    "难不难",
    "我昨晚打挺久",
    "推荐吗",
  ],
  en: [
    "which one is it any good",
    "wanna try that too",
    "hard?",
    "played late last night",
    "worth it?",
  ],
};

const QUESTION_SOFT: Record<VirtualPlayerLocale, string[]> = {
  "zh-HK": [
    "可能啦我都唔太肯定",
    "你自己試下最準",
    "我感覺得",
    "嗯…等我想想",
    "咁樣都可以嘅",
  ],
  "zh-CN": [
    "可能吧我也不太确定",
    "你自己试试最准",
    "我感觉可以",
    "嗯等我想想",
    "那样也行",
  ],
  en: [
    "maybe not sure tho",
    "try it yourself",
    "feels ok to me",
    "hmm let me think",
    "could work",
  ],
};

const ACK: Record<VirtualPlayerLocale, string[]> = {
  "zh-HK": ["收到", "明白", "好呀", "ok", "嗯嗯"],
  "zh-CN": ["收到", "明白", "好呀", "行", "嗯嗯"],
  en: ["got it", "kk", "ok", "cool", "mm"],
};

function pickRandom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)]!;
}

function hashString(value: string) {
  let hash = 0;
  for (const char of value) {
    hash = Math.imul(31, hash) + char.charCodeAt(0);
    hash |= 0;
  }
  return Math.abs(hash);
}

function normalize(text: string) {
  return text.trim().toLowerCase().replace(/\s+/g, " ");
}

function detectLocaleHint(text: string): VirtualPlayerLocale | null {
  if (/[\u4e00-\u9fff]/.test(text)) {
    if (/[係喎咩嚟咗嘅唔哋]/.test(text)) return "zh-HK";
    return "zh-CN";
  }
  if (/[a-z]/i.test(text)) return "en";
  return null;
}

function pickAvoidingRecent(
  pool: string[],
  recentReplies: string[],
  seed: string
): string {
  const recent = new Set(recentReplies.map((item) => normalize(item)));
  const fresh = pool.filter((item) => !recent.has(normalize(item)));
  const use = fresh.length > 0 ? fresh : pool;
  return use[hashString(seed) % use.length]!;
}

function isGreeting(text: string) {
  return /^(hi+|hey+|yo+|hello|哈囉|哈啰|你好|嗨|早|晚安|在嗎|在吗|喺唔喺)[\s!！.。?？~～]*$/i.test(
    text
  ) || /^(hi+|hey+|哈囉|你好|嗨)\b/i.test(text);
}

function isThanks(text: string) {
  return /(thank|thx|ty\b|多謝|谢谢|謝啦|谢啦|多謝晒)/i.test(text);
}

function isGameTalk(text: string) {
  return /(game|玩|打機|打机|通關|通关|難度|难度|關卡|关卡|boss|排行|分數|分数|demo)/i.test(
    text
  );
}

function isQuestion(text: string) {
  return /[?？]/.test(text) || /^(為什麼|为甚么|为什么|點解|怎么|如何|係唔係|是不是|嗎|吗)/.test(text);
}

function isShortAck(text: string) {
  return /^(ok+|好+|嗯+|喔+|哦+|yes|yep|yeah|係|是|可以|行|嗯嗯|哈哈+|lol+|haha+)[\s!！.。~～]*$/i.test(
    text
  );
}

/**
 * 依近期用戶訊息挑一句短回覆：口語、能接話、避免助理腔。
 * userMessages：未回覆區段（舊→新）；recentVirtualReplies：避免重複。
 */
export function pickVirtualDmReply(
  player: VirtualPlayer,
  userMessages: string[],
  recentVirtualReplies: string[] = []
): string {
  const latest = userMessages[userMessages.length - 1]?.trim() || "";
  const joined = userMessages.slice(-3).join(" ");
  const locale =
    detectLocaleHint(latest) && hashString(latest + player.id) % 4 !== 0
      ? detectLocaleHint(latest)!
      : player.locale;
  const seed = `${player.id}|${joined}|${Date.now().toString().slice(0, -5)}`;

  if (!latest) {
    return pickAvoidingRecent(GENERIC[locale], recentVirtualReplies, seed);
  }

  if (isGreeting(latest)) {
    return pickAvoidingRecent(GREETING[locale], recentVirtualReplies, seed);
  }
  if (isThanks(latest)) {
    return pickAvoidingRecent(THANKS[locale], recentVirtualReplies, seed);
  }
  if (isShortAck(latest)) {
    return pickAvoidingRecent(ACK[locale], recentVirtualReplies, seed);
  }
  if (isGameTalk(joined)) {
    return pickAvoidingRecent(GAME_TALK[locale], recentVirtualReplies, seed);
  }
  if (isQuestion(latest)) {
    const dialoguePool = AMBIENT_CHAT_DIALOGUES.filter(
      (item) => item.locale === locale
    ).map((item) => item.lines[1]);
    const pool = [...QUESTION_SOFT[locale], ...dialoguePool];
    if (pool.length > 0) {
      return pickAvoidingRecent(pool, recentVirtualReplies, seed);
    }
  }

  // 偶爾接一句 ambient 單句（像真人隨口講）
  const singles = AMBIENT_CHAT_SINGLES.filter(
    (item) => item.locale === locale
  ).map((item) => item.content);
  if (singles.length > 0 && hashString(seed) % 3 === 0) {
    return pickAvoidingRecent(singles, recentVirtualReplies, seed + "|s");
  }

  return pickAvoidingRecent(GENERIC[locale], recentVirtualReplies, seed);
}

/** 依對話回合取樣 2～80 分鐘延遲（同一回合固定，下回合再重抽） */
export function getVirtualDmReplyDelayMs(
  userId: string,
  virtualPlayerId: string,
  roundSeed: string
) {
  const span =
    VIRTUAL_DM_REPLY_DELAY.maxMs - VIRTUAL_DM_REPLY_DELAY.minMs;
  const offset =
    hashString(`${userId}:${virtualPlayerId}:${roundSeed}:delay`) %
    (span + 1);
  return VIRTUAL_DM_REPLY_DELAY.minMs + offset;
}

export function pickRandomVirtualFallback(locale: VirtualPlayerLocale) {
  return pickRandom(GENERIC[locale]);
}
