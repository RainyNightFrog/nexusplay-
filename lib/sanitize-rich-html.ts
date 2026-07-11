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
    "img",
  ],
  allowedAttributes: {
    a: ["href", "target", "rel"],
    img: ["src", "alt", "title"],
  },
  allowedSchemes: ["http", "https"],
  allowedSchemesByTag: {
    img: ["http", "https"],
    a: ["http", "https", "mailto"],
  },
  transformTags: {
    a: (_tagName, attribs) => {
      const nextAttribs: Record<string, string> = { ...attribs, rel: "noopener noreferrer" };
      if (attribs.target === "_blank") {
        nextAttribs.target = "_blank";
      } else {
        delete nextAttribs.target;
      }
      return { tagName: "a", attribs: nextAttribs };
    },
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

/** Defense-in-depth: re-sanitize HTML before client render. */
export function sanitizeRichHtmlForRender(html: string): string {
  return sanitizeHtml(html, RICH_HTML_OPTIONS);
}
