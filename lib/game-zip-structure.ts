import JSZip from "jszip";
import {
  MAX_COMPRESSION_RATIO,
  MAX_SINGLE_EXTRACTED_FILE_BYTES,
  MAX_UNCOMPRESSED_TOTAL_BYTES,
  MAX_ZIP_ENTRIES,
} from "@/lib/upload-limits";

export const GAME_ZIP_ALLOWED_EXTENSIONS = new Set([
  ".html",
  ".htm",
  ".css",
  ".js",
  ".mjs",
  ".json",
  ".webmanifest",
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
  ".csv",
  ".dat",
  ".example",
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

const ENTRY_CANDIDATES = ["index.html", "index.htm", "index"] as const;

export function normalizeZipPath(path: string) {
  return path.replace(/\\/g, "/").replace(/^\/+/, "");
}

function getExtension(path: string) {
  const lower = path.toLowerCase();
  const dot = lower.lastIndexOf(".");
  return dot === -1 ? "" : lower.slice(dot);
}

export function isSafeZipPath(path: string) {
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
  if (baseName === ".gitkeep") {
    return true;
  }
  if (baseName.startsWith(".") && baseName !== ".well-known") {
    return false;
  }
  const ext = getExtension(normalized);
  if (BLOCKED_EXTENSIONS.has(ext)) {
    return false;
  }
  if (ext && !GAME_ZIP_ALLOWED_EXTENSIONS.has(ext)) {
    return false;
  }
  return true;
}

/** Locate the playable HTML entry inside a zip. */
export function findGameEntryPath(paths: string[]) {
  const normalized = paths.map(normalizeZipPath);

  for (const candidate of ENTRY_CANDIDATES) {
    const exact = normalized.find(
      (path) => path.toLowerCase() === candidate
    );
    if (exact) return exact;
  }

  const nested = normalized
    .filter((path) =>
      ENTRY_CANDIDATES.some((candidate) =>
        path.toLowerCase().endsWith(`/${candidate}`)
      )
    )
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

export type GameZipValidationResult =
  | { ok: true; entryPath: string }
  | { ok: false; error: string };

export function validateGameZipEntries(
  fileEntries: [string, JSZip.JSZipObject][]
): GameZipValidationResult {
  if (fileEntries.length === 0) {
    return { ok: false, error: "zip 檔案是空的，請確認內容後再試" };
  }
  if (fileEntries.length > MAX_ZIP_ENTRIES) {
    return {
      ok: false,
      error: `zip 內檔案過多（最多 ${MAX_ZIP_ENTRIES} 個），請移除多餘檔案後再試`,
    };
  }

  let estimatedTotal = 0;

  for (const [entryPath, entry] of fileEntries) {
    if (!isSafeZipPath(entryPath)) {
      const ext = getExtension(normalizeZipPath(entryPath));
      if (ext && !GAME_ZIP_ALLOWED_EXTENSIONS.has(ext)) {
        return {
          ok: false,
          error: `zip 內含不支援的檔案類型：${entryPath}。請移除或轉換後再試`,
        };
      }
      return {
        ok: false,
        error: `zip 內含不允許的路徑或檔案：${entryPath}`,
      };
    }

    const uncompressed = getUncompressedSize(entry);
    const compressed = getCompressedSize(entry);

    if (uncompressed !== null) {
      if (uncompressed > MAX_SINGLE_EXTRACTED_FILE_BYTES) {
        return {
          ok: false,
          error: `解壓後單檔過大（${entryPath}），請壓縮資源後再試`,
        };
      }
      estimatedTotal += uncompressed;
      if (estimatedTotal > MAX_UNCOMPRESSED_TOTAL_BYTES) {
        return {
          ok: false,
          error: "解壓後總大小超過上限，請壓縮遊戲資源後再試",
        };
      }
      if (
        compressed !== null &&
        compressed > 0 &&
        uncompressed / compressed > MAX_COMPRESSION_RATIO
      ) {
        return {
          ok: false,
          error: `壓縮比異常（${entryPath}），請重新打包 zip 後再試`,
        };
      }
    }
  }

  const entryPath = findGameEntryPath(fileEntries.map(([path]) => path));
  if (!entryPath) {
    return {
      ok: false,
      error:
        "zip 根目錄需包含 index.html（或 index.htm）。請確認入口檔名稱與位置正確",
    };
  }

  return { ok: true, entryPath };
}

export async function validateGameZipFile(file: File): Promise<GameZipValidationResult> {
  try {
    const zip = await JSZip.loadAsync(await file.arrayBuffer());
    const fileEntries = Object.entries(zip.files).filter(
      ([, entry]) => !entry.dir
    ) as [string, JSZip.JSZipObject][];
    return validateGameZipEntries(fileEntries);
  } catch {
    return { ok: false, error: "無法讀取 zip 檔案，請確認檔案未損壞且未設密碼" };
  }
}
