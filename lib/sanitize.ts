import DOMPurify from "isomorphic-dompurify";

export { isSafeEmbedUrl } from "@/lib/embed-url";

const HTML_ENTITIES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

/** Escape text for safe insertion into HTML attribute values or text nodes. */
export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => HTML_ENTITIES[char] ?? char);
}

/** Strip HTML tags and trim; used for user-provided title/description before storage. */
export function sanitizePlainText(
  value: string,
  maxLength: number
): string {
  const stripped = value
    .replace(/<[^>]*>/g, "")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .trim();

  if (stripped.length > maxLength) {
    return stripped.slice(0, maxLength);
  }

  return stripped;
}

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
