/** 即時聊天／私訊：禁止玩家與創作者發送網址 */

export const CHAT_URL_BLOCKED_MESSAGE = "訊息不可包含網址或連結";

const PROTOCOL_RE = /(?:https?|ftp|hxxps?):\/\//i;
const WWW_RE = /\bwww\./i;
const DISCORD_INVITE_RE = /discord(?:\.gg|\.com\/invite)\//i;
const TELEGRAM_RE = /\bt\.me\//i;
const IPV4_RE =
  /\b(?:\d{1,3}\.){3}\d{1,3}(?::\d{2,5})?(?:\/\S*)?\b/;
const DOMAIN_TLD_RE =
  /(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+(?:com|net|org|io|co|gg|me|tv|cc|app|dev|xyz|link|click|page|site|online|shop|store|game|games|hk|tw|cn|jp|kr|uk|us|info|biz|edu|gov|ly|to|fm|ai|so|gl|gd|ml|cf|tk|top|club|vip|pro|tech|cloud|space|fun|live|news|blog|wiki|zip|mov|rar)(?:[/:?#]|$)/i;

/** 去掉空白與常見混淆字元，抓「h t t p」「example[.]com」等繞過 */
function compactForUrlScan(content: string): string {
  return content
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\s\u00a0\u2000-\u200d\u2028\u2029\u2060\ufeff]/g, "")
    .replace(/[\[\]（）()【】<>‹›「」『』]/g, "")
    .replace(/\uFF0E/g, ".") // 全形句點
    .replace(/\u3002/g, ".")
    .replace(/（dot）|\(dot\)|\[dot\]|【dot】/gi, ".");
}

export function containsChatUrl(content: string): boolean {
  const text = content.normalize("NFKC");
  const compact = compactForUrlScan(text);

  if (PROTOCOL_RE.test(text) || PROTOCOL_RE.test(compact)) return true;
  if (WWW_RE.test(text) || WWW_RE.test(compact)) return true;
  if (DISCORD_INVITE_RE.test(text) || DISCORD_INVITE_RE.test(compact)) {
    return true;
  }
  if (TELEGRAM_RE.test(text) || TELEGRAM_RE.test(compact)) return true;
  if (IPV4_RE.test(text)) return true;
  if (DOMAIN_TLD_RE.test(compact)) return true;

  // 協定被拆開：http : // 或 httр（混入西里爾字母 р）
  if (/h[tｔ]{2}p[sｓ]?:/i.test(compact)) return true;

  return false;
}

export function assertNoChatUrls(content: string): void {
  if (containsChatUrl(content)) {
    throw new Error(CHAT_URL_BLOCKED_MESSAGE);
  }
}
