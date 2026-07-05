import JSZip from "jszip";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  MAX_COMPRESSION_RATIO,
  MAX_SINGLE_EXTRACTED_FILE_BYTES,
  MAX_UNCOMPRESSED_TOTAL_BYTES,
  MAX_ZIP_ENTRIES,
} from "@/lib/upload-limits";

const FILES_BUCKET = "game-files";

const ALLOWED_EXTENSIONS = new Set([
  ".html",
  ".htm",
  ".css",
  ".js",
  ".mjs",
  ".json",
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".svg",
  ".woff",
  ".woff2",
  ".ttf",
  ".mp3",
  ".wav",
  ".ogg",
  ".wasm",
  ".ico",
  ".map",
  ".txt",
  ".xml",
  ".atlas",
  ".fnt",
  ".glb",
  ".gltf",
]);

const BLOCKED_EXTENSIONS = new Set([
  ".exe",
  ".bat",
  ".cmd",
  ".com",
  ".msi",
  ".dll",
  ".sh",
  ".bash",
  ".php",
  ".asp",
  ".aspx",
  ".jsp",
  ".py",
  ".rb",
  ".pl",
  ".cgi",
  ".htaccess",
  ".env",
]);

import { guessContentType } from "@/lib/game-mime";

function normalizeZipPath(path: string) {
  return path.replace(/\\/g, "/").replace(/^\/+/, "");
}

function getExtension(path: string) {
  const lower = path.toLowerCase();
  const dot = lower.lastIndexOf(".");
  return dot === -1 ? "" : lower.slice(dot);
}

function isSafeZipPath(path: string) {
  const normalized = normalizeZipPath(path);
  if (!normalized || normalized === "." || normalized === "..") {
    return false;
  }
  if (/^[a-zA-Z]:/.test(normalized)) {
    return false;
  }
  const segments = normalized.split("/");
  if (segments.some((segment) => segment === ".." || segment === "")) {
    return false;
  }
  if (normalized.startsWith("__MACOSX/")) {
    return false;
  }
  const baseName = segments[segments.length - 1] ?? "";
  if (baseName.startsWith(".") && baseName !== ".well-known") {
    return false;
  }
  const ext = getExtension(normalized);
  if (BLOCKED_EXTENSIONS.has(ext)) {
    return false;
  }
  if (ext && !ALLOWED_EXTENSIONS.has(ext)) {
    return false;
  }
  return true;
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

function getUncompressedSize(entry: JSZip.JSZipObject) {
  const raw = entry as JSZip.JSZipObject & {
    _data?: { uncompressedSize?: number };
  };
  return raw._data?.uncompressedSize ?? null;
}

function getCompressedSize(entry: JSZip.JSZipObject) {
  const raw = entry as JSZip.JSZipObject & {
    _data?: { compressedSize?: number };
  };
  return raw._data?.compressedSize ?? null;
}

function validateZipEntries(fileEntries: [string, JSZip.JSZipObject][]) {
  if (fileEntries.length === 0) {
    throw new Error("zip 檔案是空的，請確認內容後再試");
  }
  if (fileEntries.length > MAX_ZIP_ENTRIES) {
    throw new Error(
      `zip 內檔案過多（最多 ${MAX_ZIP_ENTRIES} 個），可能是 zip bomb 攻擊`
    );
  }

  let estimatedTotal = 0;

  for (const [entryPath, entry] of fileEntries) {
    if (!isSafeZipPath(entryPath)) {
      throw new Error(`zip 內含不允許的路徑或檔案類型：${entryPath}`);
    }

    const uncompressed = getUncompressedSize(entry);
    const compressed = getCompressedSize(entry);

    if (uncompressed !== null) {
      if (uncompressed > MAX_SINGLE_EXTRACTED_FILE_BYTES) {
        throw new Error(
          `解壓後單檔過大（${entryPath}），超過 ${MAX_SINGLE_EXTRACTED_FILE_BYTES / (1024 * 1024)} MB 上限`
        );
      }
      estimatedTotal += uncompressed;
      if (estimatedTotal > MAX_UNCOMPRESSED_TOTAL_BYTES) {
        throw new Error(
          "解壓後總大小超過上限，可能是 zip bomb 攻擊，請壓縮遊戲資源後再試"
        );
      }
      if (
        compressed !== null &&
        compressed > 0 &&
        uncompressed / compressed > MAX_COMPRESSION_RATIO
      ) {
        throw new Error(
          `壓縮比異常（${entryPath}），可能是 zip bomb 攻擊`
        );
      }
    }
  }

  const indexPath = findIndexHtml(fileEntries.map(([path]) => path));
  if (!indexPath) {
    throw new Error("zip 內需包含 index.html");
  }

  return indexPath;
}

export async function extractAndUploadGameBuild(
  supabase: SupabaseClient,
  zipBuffer: ArrayBuffer
) {
  const zip = await JSZip.loadAsync(zipBuffer);
  const fileEntries = Object.entries(zip.files).filter(
    ([, entry]) => !entry.dir
  ) as [string, JSZip.JSZipObject][];

  const indexPath = validateZipEntries(fileEntries);

  const buildId = crypto.randomUUID();
  const uploadedPaths: string[] = [];
  let extractedTotal = 0;

  try {
    for (const [entryPath, entry] of fileEntries) {
      const normalizedPath = normalizeZipPath(entryPath);
      const content = await entry.async("arraybuffer");

      if (content.byteLength > MAX_SINGLE_EXTRACTED_FILE_BYTES) {
        throw new Error(
          `解壓後單檔過大（${normalizedPath}），超過 ${MAX_SINGLE_EXTRACTED_FILE_BYTES / (1024 * 1024)} MB 上限`
        );
      }

      extractedTotal += content.byteLength;
      if (extractedTotal > MAX_UNCOMPRESSED_TOTAL_BYTES) {
        throw new Error(
          "解壓後總大小超過上限，可能是 zip bomb 攻擊，請壓縮遊戲資源後再試"
        );
      }

      const storagePath = `builds/${buildId}/${normalizedPath}`;

      const mime = guessContentType(normalizedPath);
      const blob = new Blob([content], { type: mime });

      const { error } = await supabase.storage
        .from(FILES_BUCKET)
        .upload(storagePath, blob, {
          cacheControl: "3600",
          upsert: true,
          contentType: mime,
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
