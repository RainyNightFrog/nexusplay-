import JSZip from "jszip";
import type { SupabaseClient } from "@supabase/supabase-js";

const FILES_BUCKET = "game-files";

const MIME_TYPES: Record<string, string> = {
  ".html": "text/html",
  ".htm": "text/html",
  ".css": "text/css",
  ".js": "application/javascript",
  ".mjs": "application/javascript",
  ".json": "application/json",
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
};

function guessContentType(filePath: string) {
  const extension = filePath.slice(filePath.lastIndexOf(".")).toLowerCase();
  return MIME_TYPES[extension] ?? "application/octet-stream";
}

function normalizeZipPath(path: string) {
  return path.replace(/\\/g, "/").replace(/^\/+/, "");
}

function findIndexHtml(paths: string[]) {
  const normalized = paths.map(normalizeZipPath);
  const exact = normalized.find(
    (path) => path.toLowerCase() === "index.html"
  );
  if (exact) return exact;

  const nested = normalized
    .filter((path) => path.toLowerCase().endsWith("/index.html"))
    .sort((a, b) => a.length - b.length)[0];

  return nested ?? null;
}

export async function extractAndUploadGameBuild(
  supabase: SupabaseClient,
  zipBuffer: ArrayBuffer
) {
  const zip = await JSZip.loadAsync(zipBuffer);
  const fileEntries = Object.entries(zip.files).filter(
    ([, entry]) => !entry.dir
  );

  if (fileEntries.length === 0) {
    throw new Error("zip 檔案是空的，請確認內容後再試");
  }

  const indexPath = findIndexHtml(fileEntries.map(([path]) => path));
  if (!indexPath) {
    throw new Error("zip 內需包含 index.html");
  }

  const buildId = crypto.randomUUID();
  const uploadedPaths: string[] = [];

  try {
    for (const [entryPath, entry] of fileEntries) {
      const normalizedPath = normalizeZipPath(entryPath);
      const storagePath = `builds/${buildId}/${normalizedPath}`;
      const content = await entry.async("arraybuffer");

      const { error } = await supabase.storage
        .from(FILES_BUCKET)
        .upload(storagePath, content, {
          cacheControl: "3600",
          upsert: true,
          contentType: guessContentType(normalizedPath),
        });

      if (error) {
        throw new Error(`解壓上傳失敗：${error.message}`);
      }

      uploadedPaths.push(storagePath);
    }

    const indexStoragePath = `builds/${buildId}/${indexPath}`;
    const { data } = supabase.storage
      .from(FILES_BUCKET)
      .getPublicUrl(indexStoragePath);

    return {
      buildId,
      playUrl: data.publicUrl,
      uploadedPaths,
    };
  } catch (error) {
    if (uploadedPaths.length > 0) {
      await supabase.storage
        .from(FILES_BUCKET)
        .remove(uploadedPaths)
        .catch(() => undefined);
    }
    throw error;
  }
}
