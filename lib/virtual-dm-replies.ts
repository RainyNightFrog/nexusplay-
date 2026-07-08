import {
  AMBIENT_CHAT_DIALOGUES,
  AMBIENT_CHAT_SINGLES,
} from "@/lib/chat-ambient-content";
import type { VirtualPlayer } from "@/lib/virtual-players";

const GENERIC_REPLIES: Record<VirtualPlayer["locale"], string[]> = {
  "zh-HK": [
    "哈哈係喎",
    "等等我開機先",
    "而家玩緊另一款",
    "可以呀 一齊",
    "唔知喎 你試下",
    "我頭先都係咁",
    "得閒再傾",
    "正 多謝分享",
  ],
  "zh-CN": [
    "哈哈是的",
    "等我开一下",
    "我在打别的",
    "可以啊一起",
    "不太清楚你试试",
    "我刚才也这样",
    "有空再聊",
    "好 谢啦",
  ],
  en: [
    "lol fair",
    "gimme a sec booting up",
    "im on another game rn",
    "sure down",
    "idk try it",
    "same thing happened to me",
    "brb",
    "nice thx",
  ],
};

function pickRandom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)]!;
}

function hashMessage(value: string) {
  let hash = 0;
  for (const char of value) {
    hash = Math.imul(31, hash) + char.charCodeAt(0);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function pickVirtualDmReply(
  player: VirtualPlayer,
  userMessage: string
): string {
  const locale = player.locale;
  const trimmed = userMessage.trim().toLowerCase();

  const dialoguePool = AMBIENT_CHAT_DIALOGUES.filter(
    (item) => item.locale === locale
  );
  const singlePool = AMBIENT_CHAT_SINGLES.filter(
    (item) => item.locale === locale
  );

  if (trimmed.includes("?") || trimmed.includes("？")) {
    const questionReplies = dialoguePool.map((item) => item.lines[1]);
    if (questionReplies.length > 0) {
      return questionReplies[hashMessage(trimmed) % questionReplies.length]!;
    }
  }

  if (hashMessage(trimmed + player.id) % 3 === 0 && dialoguePool.length > 0) {
    return pickRandom(dialoguePool).lines[1];
  }

  if (singlePool.length > 0) {
    return singlePool[hashMessage(trimmed) % singlePool.length]!.content;
  }

  return pickRandom(GENERIC_REPLIES[locale]);
}
