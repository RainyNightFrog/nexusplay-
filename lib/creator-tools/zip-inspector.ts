import JSZip from "jszip";
import {
  MAX_ZIP_ENTRIES,
  MAX_UNCOMPRESSED_TOTAL_BYTES,
  PRODUCTION_UPLOAD_BYTES,
} from "@/lib/upload-limits";
import {
  findGameEntryPath,
  isSafeZipPath,
  normalizeZipPath,
  validateGameZipEntries,
} from "@/lib/game-zip-structure";

export type ZipInspectorWarningId =
  | "largeArchive"
  | "nearProductionLimit"
  | "manyFiles"
  | "nestedEntry"
  | "largeMedia"
  | "slowLoadEstimate"
  | "noSdkReference";

export type ZipInspectorWarning = {
  id: ZipInspectorWarningId;
  severity: "info" | "warning" | "critical";
  meta?: Record<string, string | number>;
};

export type ZipFileInsight = {
  path: string;
  compressedBytes: number;
  uncompressedBytes: number | null;
};

export type ZipInspectorReport = {
  ok: boolean;
  error?: string;
  entryPath: string | null;
  fileCount: number;
  totalCompressedBytes: number;
  totalUncompressedBytes: number;
  largestFiles: ZipFileInsight[];
  warnings: ZipInspectorWarning[];
  estimatedLoadSeconds: number;
  hasSdkReference: boolean;
  sdkSignals: string[];
};

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
  return raw._data?.compressedSize ?? 0;
}

const SDK_PATTERNS = [
  { signal: "rnf-game-sdk", pattern: /rnf-game-sdk|RNFGameSDK|window\.RNF/i },
  { signal: "leaderboard", pattern: /leaderboard|submitScore|getLeaderboard/i },
  { signal: "cloud-save", pattern: /cloudSave|saveGame|loadGame|rnf.*save/i },
  { signal: "platform-auth", pattern: /getPlatformUser|platformLogin|rnf.*user/i },
] as const;

const MEDIA_EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp", ".gif", ".mp3", ".wav", ".ogg"];

function estimateLoadSeconds(totalBytes: number, fileCount: number) {
  const mb = totalBytes / (1024 * 1024);
  const base = 0.8 + mb * 0.35 + fileCount * 0.01;
  return Math.round(base * 10) / 10;
}

export async function inspectGameZipFile(file: File): Promise<ZipInspectorReport> {
  const empty: ZipInspectorReport = {
    ok: false,
    fileCount: 0,
    totalCompressedBytes: file.size,
    totalUncompressedBytes: 0,
    largestFiles: [],
    warnings: [],
    estimatedLoadSeconds: 0,
    entryPath: null,
    hasSdkReference: false,
    sdkSignals: [],
  };

  try {
    const zip = await JSZip.loadAsync(await file.arrayBuffer());
    const fileEntries = Object.entries(zip.files).filter(
      ([, entry]) => !entry.dir
    ) as [string, JSZip.JSZipObject][];

    const validation = validateGameZipEntries(fileEntries);
    if (!validation.ok) {
      return { ...empty, error: validation.error };
    }

    const insights: ZipFileInsight[] = [];
    let totalUncompressed = 0;

    for (const [entryPath, entry] of fileEntries) {
      const compressed = getCompressedSize(entry);
      const uncompressed = getUncompressedSize(entry);
      if (uncompressed !== null) totalUncompressed += uncompressed;
      insights.push({
        path: normalizeZipPath(entryPath),
        compressedBytes: compressed,
        uncompressedBytes: uncompressed,
      });
    }

    insights.sort(
      (a, b) =>
        (b.uncompressedBytes ?? b.compressedBytes) -
        (a.uncompressedBytes ?? a.compressedBytes)
    );

    const warnings: ZipInspectorWarning[] = [];
    const entryPath = validation.entryPath;

    if (file.size > PRODUCTION_UPLOAD_BYTES * 0.85) {
      warnings.push({
        id: "nearProductionLimit",
        severity: file.size > PRODUCTION_UPLOAD_BYTES ? "critical" : "warning",
        meta: { sizeMb: Math.round((file.size / (1024 * 1024)) * 10) / 10 },
      });
    }

    if (file.size > 2 * 1024 * 1024) {
      warnings.push({
        id: "largeArchive",
        severity: "warning",
        meta: { sizeMb: Math.round((file.size / (1024 * 1024)) * 10) / 10 },
      });
    }

    if (fileEntries.length > MAX_ZIP_ENTRIES * 0.6) {
      warnings.push({
        id: "manyFiles",
        severity: "info",
        meta: { count: fileEntries.length },
      });
    }

    if (entryPath.includes("/")) {
      warnings.push({ id: "nestedEntry", severity: "info", meta: { path: entryPath } });
    }

    const largeMedia = insights.filter((item) => {
      const lower = item.path.toLowerCase();
      const isMedia = MEDIA_EXTENSIONS.some((ext) => lower.endsWith(ext));
      const size = item.uncompressedBytes ?? item.compressedBytes;
      return isMedia && size > 1.5 * 1024 * 1024;
    });

    if (largeMedia.length > 0) {
      warnings.push({
        id: "largeMedia",
        severity: "warning",
        meta: { count: largeMedia.length },
      });
    }

    const loadSeconds = estimateLoadSeconds(
      totalUncompressed || file.size,
      fileEntries.length
    );
    if (loadSeconds >= 4) {
      warnings.push({
        id: "slowLoadEstimate",
        severity: loadSeconds >= 8 ? "warning" : "info",
        meta: { seconds: loadSeconds },
      });
    }

    if (totalUncompressed > MAX_UNCOMPRESSED_TOTAL_BYTES * 0.5) {
      warnings.push({
        id: "largeArchive",
        severity: "warning",
        meta: {
          sizeMb: Math.round((totalUncompressed / (1024 * 1024)) * 10) / 10,
        },
      });
    }

    const sdkSignals: string[] = [];
    const textEntries = fileEntries.filter(([path]) => {
      const lower = normalizeZipPath(path).toLowerCase();
      return lower.endsWith(".js") || lower.endsWith(".html") || lower.endsWith(".mjs");
    });

    for (const [path, entry] of textEntries.slice(0, 40)) {
      if (!isSafeZipPath(path)) continue;
      try {
        const content = await entry.async("string");
        for (const { signal, pattern } of SDK_PATTERNS) {
          if (pattern.test(content) && !sdkSignals.includes(signal)) {
            sdkSignals.push(signal);
          }
        }
      } catch {
        // skip unreadable entries
      }
    }

    if (sdkSignals.length === 0) {
      warnings.push({ id: "noSdkReference", severity: "info" });
    }

    return {
      ok: true,
      entryPath,
      fileCount: fileEntries.length,
      totalCompressedBytes: file.size,
      totalUncompressedBytes: totalUncompressed,
      largestFiles: insights.slice(0, 5),
      warnings,
      estimatedLoadSeconds: loadSeconds,
      hasSdkReference: sdkSignals.length > 0,
      sdkSignals,
    };
  } catch {
    return { ...empty, error: "無法讀取 zip 檔案" };
  }
}

export function formatZipBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
