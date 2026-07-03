export const MAX_COVER_BYTES = 5 * 1024 * 1024; // 5 MB
export const MAX_ZIP_BYTES = 50 * 1024 * 1024; // 50 MB（Supabase Free 方案上限）

/** Zip bomb / DoS guards applied during server-side extraction */
export const MAX_ZIP_ENTRIES = 500;
export const MAX_UNCOMPRESSED_TOTAL_BYTES = 200 * 1024 * 1024; // 200 MB
export const MAX_SINGLE_EXTRACTED_FILE_BYTES = 25 * 1024 * 1024; // 25 MB per file
export const MAX_COMPRESSION_RATIO = 100;

export const MAX_TITLE_LENGTH = 120;
export const MAX_DESCRIPTION_LENGTH = 2000;
export const MAX_CATEGORY_LENGTH = 64;

export function formatMaxSize(bytes: number) {
  if (bytes >= 1024 * 1024 * 1024) {
    return `${bytes / (1024 * 1024 * 1024)} GB`;
  }
  return `${bytes / (1024 * 1024)} MB`;
}
