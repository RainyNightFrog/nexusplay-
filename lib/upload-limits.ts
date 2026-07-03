export const MAX_COVER_BYTES = 5 * 1024 * 1024; // 5 MB
export const MAX_ZIP_BYTES = 50 * 1024 * 1024; // 50 MB（Supabase Free 方案上限）

export function formatMaxSize(bytes: number) {
  if (bytes >= 1024 * 1024 * 1024) {
    return `${bytes / (1024 * 1024 * 1024)} GB`;
  }
  return `${bytes / (1024 * 1024)} MB`;
}
