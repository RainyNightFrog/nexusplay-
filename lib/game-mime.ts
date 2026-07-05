/** 解壓上傳／代理播放時依副檔名回傳正確 MIME，避免 Supabase 以 text/plain 提供 HTML */
const MIME_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".htm": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".ogg": "audio/ogg",
  ".wasm": "application/wasm",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".map": "application/json; charset=utf-8",
};

export function guessContentType(filePath: string) {
  const dot = filePath.lastIndexOf(".");
  if (dot === -1) {
    return "application/octet-stream";
  }
  const extension = filePath.slice(dot).toLowerCase();
  return MIME_TYPES[extension] ?? "application/octet-stream";
}
