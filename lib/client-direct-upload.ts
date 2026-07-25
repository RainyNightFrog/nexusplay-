import JSZip from "jszip";
import { createClient } from "@/lib/supabase/client";
import { guessContentType } from "@/lib/game-mime";
import {
  normalizeZipPath,
  validateGameZipEntries,
} from "@/lib/game-zip-structure";
import { buildDirectUploadPrefix } from "@/lib/direct-upload-session";
import {
  COVERS_BUCKET,
  FILES_BUCKET,
  buildCreatorCoverPath,
  removeStoragePaths,
  removeStoragePrefix,
} from "@/lib/game-storage";
import {
  formatMaxSize,
  MAX_COVER_BYTES,
  MAX_SINGLE_EXTRACTED_FILE_BYTES,
  MAX_UNCOMPRESSED_TOTAL_BYTES,
  MAX_ZIP_BYTES,
} from "@/lib/upload-limits";
import { isZipFileAsync } from "@/lib/zip-file-validation";

/** 提高並行以上傳吞吐；過多會被瀏覽器／Storage 限流 */
const UPLOAD_CONCURRENCY = 16;

async function runWithConcurrency<T>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<void>
) {
  if (items.length === 0) return;

  let nextIndex = 0;

  async function runWorker() {
    while (true) {
      const current = nextIndex;
      nextIndex += 1;
      if (current >= items.length) return;
      await worker(items[current]);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () =>
      runWorker()
    )
  );
}

function createThrottledProgress(
  onProgress?: (message: string) => void,
  intervalMs = 200
) {
  let lastSent = 0;
  let pending: string | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const flush = (message: string, force = false) => {
    if (!onProgress) return;
    const now = Date.now();
    if (!force && now - lastSent < intervalMs) {
      pending = message;
      if (!timer) {
        timer = setTimeout(() => {
          timer = null;
          if (pending) {
            onProgress(pending);
            lastSent = Date.now();
            pending = null;
          }
        }, intervalMs);
      }
      return;
    }
    lastSent = now;
    pending = null;
    onProgress(message);
  };

  return {
    update: flush,
    done: (message: string) => {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      flush(message, true);
    },
  };
}

export async function cleanupDirectUploadArtifacts(input: {
  userId: string;
  buildId?: string;
  coverPath?: string;
}) {
  const supabase = createClient();
  const tasks: Promise<void>[] = [];

  if (input.coverPath) {
    tasks.push(
      removeStoragePaths(supabase, COVERS_BUCKET, [input.coverPath])
    );
  }

  if (input.buildId) {
    const prefix = buildDirectUploadPrefix(input.userId, input.buildId);
    tasks.push(removeStoragePrefix(supabase, FILES_BUCKET, prefix));
  }

  await Promise.all(tasks);
}

export async function createDirectUploadSession() {
  const response = await fetch("/api/games/direct-upload/session", {
    method: "POST",
    credentials: "same-origin",
  });
  const payload = (await response.json()) as {
    buildId?: string;
    token?: string;
    userId?: string;
    error?: string;
  };
  if (!response.ok || !payload.buildId || !payload.token || !payload.userId) {
    throw new Error(payload.error ?? "無法建立上傳工作階段");
  }
  return {
    buildId: payload.buildId,
    token: payload.token,
    userId: payload.userId,
  };
}

export async function uploadCoverDirect(
  file: File,
  userId: string,
  onProgress?: (message: string) => void
) {
  if (!["image/png", "image/jpeg", "image/jpg"].includes(file.type)) {
    throw new Error("封面圖僅支援 .png、.jpg 格式");
  }
  if (file.size > MAX_COVER_BYTES) {
    throw new Error(
      `封面圖不可超過 ${formatMaxSize(MAX_COVER_BYTES)}（目前 ${formatMaxSize(file.size)}）`
    );
  }

  onProgress?.("正在直傳封面圖…");
  const supabase = createClient();
  const path = buildCreatorCoverPath(userId, file.name);
  const { error } = await supabase.storage.from(COVERS_BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type || "image/jpeg",
  });
  if (error) {
    throw new Error(`封面上傳失敗：${error.message}`);
  }

  const { data } = supabase.storage.from(COVERS_BUCKET).getPublicUrl(path);
  return { path, publicUrl: data.publicUrl };
}

export async function uploadZipBuildDirect(input: {
  file: File;
  userId: string;
  buildId: string;
  onProgress?: (message: string) => void;
}) {
  const progress = createThrottledProgress(input.onProgress);

  const valid = await isZipFileAsync(input.file);
  if (!valid) {
    throw new Error("遊戲檔案僅支援 .zip 壓縮檔");
  }
  if (input.file.size > MAX_ZIP_BYTES) {
    throw new Error(
      `遊戲 zip 不可超過 ${formatMaxSize(MAX_ZIP_BYTES)}（目前 ${formatMaxSize(input.file.size)}）`
    );
  }

  progress.update("正在解析遊戲壓縮檔…", true);
  const zipBuffer = await input.file.arrayBuffer();
  const zip = await JSZip.loadAsync(zipBuffer);
  const fileEntries = Object.entries(zip.files).filter(
    ([, entry]) => !entry.dir
  ) as [string, JSZip.JSZipObject][];

  const validation = validateGameZipEntries(fileEntries);
  if (!validation.ok) {
    throw new Error(validation.error);
  }

  const total = fileEntries.length;
  const prefix = buildDirectUploadPrefix(input.userId, input.buildId);
  const supabase = createClient();
  const uploadedPaths: string[] = [];
  let done = 0;
  let extractedTotal = 0;
  let aborted = false;
  let firstError: unknown = null;

  try {
    progress.update(`正在直傳遊戲檔案（0/${total}）…`, true);

    // 邊解壓邊上傳：不必先把全部檔案解進記憶體
    await runWithConcurrency(fileEntries, UPLOAD_CONCURRENCY, async ([entryPath, entry]) => {
      if (aborted) return;

      const normalizedPath = normalizeZipPath(entryPath);
      const content = await entry.async("arraybuffer");
      if (aborted) return;

      if (content.byteLength > MAX_SINGLE_EXTRACTED_FILE_BYTES) {
        aborted = true;
        throw new Error(
          `解壓後單檔過大（${normalizedPath}），超過 ${MAX_SINGLE_EXTRACTED_FILE_BYTES / (1024 * 1024)} MB 上限`
        );
      }

      extractedTotal += content.byteLength;
      if (extractedTotal > MAX_UNCOMPRESSED_TOTAL_BYTES) {
        aborted = true;
        throw new Error(
          "解壓後總大小超過上限，可能是 zip bomb 攻擊，請壓縮遊戲資源後再試"
        );
      }

      const storagePath = `${prefix}/${normalizedPath}`;
      const mime = guessContentType(normalizedPath);
      const blob = new Blob([content], { type: mime });
      const { error } = await supabase.storage.from(FILES_BUCKET).upload(
        storagePath,
        blob,
        {
          cacheControl: "3600",
          upsert: true,
          contentType: mime,
        }
      );
      if (aborted) return;
      if (error) {
        aborted = true;
        throw new Error(`遊戲檔案上傳失敗：${error.message}`);
      }

      uploadedPaths.push(storagePath);
      done += 1;
      const percent = Math.round((done / total) * 100);
      progress.update(`正在直傳遊戲檔案（${done}/${total} · ${percent}%）…`);
    });
  } catch (error) {
    aborted = true;
    firstError = error;
  }

  if (firstError) {
    // 等仍在飛的 worker 停住後再清，並再清一次以防競態寫入
    await new Promise((resolve) => setTimeout(resolve, 300));
    await removeStoragePrefix(supabase, FILES_BUCKET, prefix);
    await new Promise((resolve) => setTimeout(resolve, 200));
    await removeStoragePrefix(supabase, FILES_BUCKET, prefix);
    throw firstError;
  }

  progress.done(`遊戲檔案已直傳完成（${total} 個檔案）`);

  const indexPath = validation.entryPath;
  const indexStoragePath = `${prefix}/${indexPath}`;
  const { data } = supabase.storage
    .from(FILES_BUCKET)
    .getPublicUrl(indexStoragePath);

  return {
    buildId: input.buildId,
    indexPath,
    playUrl: data.publicUrl,
    uploadedPaths,
  };
}
