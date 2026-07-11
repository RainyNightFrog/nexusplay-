const HTML_TAG_PATTERN = /<[a-z][\s\S]*>/i;

export function looksLikeForumHtml(content: string) {
  return HTML_TAG_PATTERN.test(content);
}

export function stripHtmlForPreview(content: string) {
  return content
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

export function isForumContentEmpty(content: string) {
  return stripHtmlForPreview(content).length === 0;
}
