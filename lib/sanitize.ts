import DOMPurify from "isomorphic-dompurify";

export { escapeHtml, sanitizePlainText } from "@/lib/sanitize-plain";
export { isSafeEmbedUrl } from "@/lib/embed-url";

/** Sanitize rich HTML from TipTap before storage. */
export function sanitizeRichHtml(html: string, maxLength: number): string {
  const cleaned = DOMPurify.sanitize(html, {
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
