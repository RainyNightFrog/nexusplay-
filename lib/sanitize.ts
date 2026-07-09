import { createRequire } from "module";

export { escapeHtml, sanitizePlainText } from "@/lib/sanitize-plain";
export { isSafeEmbedUrl } from "@/lib/embed-url";

type DomPurifyInstance = {
  sanitize: (html: string, config?: Record<string, unknown>) => string;
};

const require = createRequire(import.meta.url);

let domPurify: DomPurifyInstance | null = null;

/** 延遲載入，避免 API route 在 Vercel 模組初始化階段因 jsdom 失敗 */
function getDomPurify(): DomPurifyInstance {
  if (!domPurify) {
    const mod = require("isomorphic-dompurify") as {
      default?: DomPurifyInstance;
    } & DomPurifyInstance;
    domPurify = mod.default ?? mod;
  }
  return domPurify;
}

/** Sanitize rich HTML from TipTap before storage. */
export function sanitizeRichHtml(html: string, maxLength: number): string {
  const cleaned = getDomPurify().sanitize(html, {
    ALLOWED_TAGS: [
      "p",
      "br",
      "strong",
      "em",
      "u",
      "s",
      "h1",
      "h2",
      "h3",
      "ul",
      "ol",
      "li",
      "a",
      "blockquote",
      "code",
      "pre",
      "hr",
    ],
    ALLOWED_ATTR: ["href", "target", "rel"],
  });

  if (cleaned.length > maxLength) {
    return cleaned.slice(0, maxLength);
  }

  return cleaned;
}
