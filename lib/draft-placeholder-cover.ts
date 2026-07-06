/** 1×1 PNG for draft uploads without a cover image yet. */
export function createDraftPlaceholderCoverBuffer(): ArrayBuffer {
  const base64 =
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
  const buf = Buffer.from(base64, "base64");
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
}

export const DRAFT_PLACEHOLDER_DESCRIPTION = "（草稿，簡介待補）";
export const DRAFT_DEFAULT_GENRE = "休閒";
