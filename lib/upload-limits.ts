export const MAX_COVER_BYTES = 5 * 1024 * 1024; // 5 MB
export const MAX_ZIP_BYTES = 50 * 1024 * 1024; // 50 MB（Supabase Free 方案上限）

/** Vercel 正式站若仍走 FormData 轉傳，單次請求上限約 4.5 MB。
 * 現已改為客戶端直傳 Storage，一般流程不再套用此上限；僅保留給舊轉傳路徑防呆。 */
export const PRODUCTION_UPLOAD_BYTES = 4 * 1024 * 1024; // 4 MB

/** 仍走 FormData 的圖庫／Devlog 安全總量（留 multipart 開銷） */
export const PRODUCTION_FORMDATA_SAFE_BYTES = 3.5 * 1024 * 1024;

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
