/** File input accept list — includes Windows MIME type application/x-zip-compressed */
export const ZIP_FILE_ACCEPT =
  ".zip,application/zip,application/x-zip-compressed,application/x-zip";

const ZIP_MIME_TYPES = new Set([
  "application/zip",
  "application/x-zip-compressed",
  "application/x-zip",
  "multipart/x-zip",
]);

/** Strip invisible chars and trailing dots (Windows may append a trailing dot). */
export function normalizeArchiveFileName(name: string): string {
  return name
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .trim()
    .replace(/\.+$/, "");
}

function hasZipExtension(name: string): boolean {
  return normalizeArchiveFileName(name).toLowerCase().endsWith(".zip");
}

function hasZipMimeType(type: string | undefined): boolean {
  if (!type) return false;
  return ZIP_MIME_TYPES.has(type.toLowerCase());
}

/** Sync check: filename extension or known zip MIME type. */
export function isZipFile(file: { name: string; type?: string }): boolean {
  return hasZipExtension(file.name) || hasZipMimeType(file.type);
}

/** PK zip local header, empty archive, or spanned archive signature. */
export function isZipBuffer(buffer: ArrayBuffer): boolean {
  if (buffer.byteLength < 4) return false;
  const bytes = new Uint8Array(buffer, 0, 4);
  if (bytes[0] !== 0x50 || bytes[1] !== 0x4b) return false;
  return (
    (bytes[2] === 0x03 && bytes[3] === 0x04) ||
    (bytes[2] === 0x05 && bytes[3] === 0x06) ||
    (bytes[2] === 0x07 && bytes[3] === 0x08)
  );
}

/** Async check — falls back to magic bytes when name/MIME are inconclusive. */
export async function isZipFileAsync(file: File): Promise<boolean> {
  if (isZipFile(file)) return true;
  if (file.size < 4) return false;
  const header = await file.slice(0, 4).arrayBuffer();
  return isZipBuffer(header);
}

export { validateGameZipFile } from "@/lib/game-zip-structure";
