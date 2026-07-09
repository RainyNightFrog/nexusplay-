import sanitizeHtml from "sanitize-html";

const RICH_HTML_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
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
  allowedAttributes: {
    a: ["href", "target", "rel"],
  },
};

/** Sanitize rich HTML from TipTap before storage. */
export function sanitizeRichHtml(html: string, maxLength: number): string {
  const cleaned = sanitizeHtml(html, RICH_HTML_OPTIONS);

  if (cleaned.length > maxLength) {
    return cleaned.slice(0, maxLength);
  }

  return cleaned;
}
