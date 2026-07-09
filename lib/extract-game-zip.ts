import JSZip from "jszip";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  MAX_SINGLE_EXTRACTED_FILE_BYTES,
  MAX_UNCOMPRESSED_TOTAL_BYTES,
} from "@/lib/upload-limits";
import {
  normalizeZipPath,
  validateGameZipEntries,
} from "@/lib/game-zip-structure";
import { guessContentType } from "@/lib/game-mime";

const FILES_BUCKET = "game-files";
const UPLOAD_CONCURRENCY = 12;

type PreparedZipFile = {
  normalizedPath: string;
  content: ArrayBuffer;
};

async function runWithConcurrency<T>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<void>
) {
  if (items.length === 0) {
    return;
  }

  let nextIndex = 0;

  async function runWorker() {
    while (true) {
      const current = nextIndex;
      nextIndex += 1;
      if (current >= items.length) {
        return;
      }
      await worker(items[current]);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () =>
      runWorker()
    )
  );
}

async function prepareZipFiles(
  fileEntries: [string, JSZip.JSZipObject][]
): Promise<PreparedZipFile[]> {
  const prepared = await Promise.all(
    fileEntries.map(async ([entryPath, entry]) => ({
      normalizedPath: normalizeZipPath(entryPath),
      content: await entry.async("arraybuffer"),
    }))
  );

  let extractedTotal = 0;
  for (const item of prepared) {
    if (item.content.byteLength > MAX_SINGLE_EXTRACTED_FILE_BYTES) {
      throw new Error(
        `解壓後單檔過大（${item.normalizedPath}），超過 ${MAX_SINGLE_EXTRACTED_FILE_BYTES / (1024 * 1024)} MB 上限`
      );
    }

    extractedTotal += item.content.byteLength;
    if (extractedTotal > MAX_UNCOMPRESSED_TOTAL_BYTES) {
      throw new Error(
        "解壓後總大小超過上限，可能是 zip bomb 攻擊，請壓縮遊戲資源後再試"
      );
    }
  }

  return prepared;
}

export async function extractAndUploadGameBuild(
  supabase: SupabaseClient,
  zipBuffer: ArrayBuffer
) {
  const zip = await JSZip.loadAsync(zipBuffer);
  const fileEntries = Object.entries(zip.files).filter(
    ([, entry]) => !entry.dir
  ) as [string, JSZip.JSZipObject][];

  const validation = validateGameZipEntries(fileEntries);
  if (!validation.ok) {
    throw new Error(validation.error);
  }
  const indexPath = validation.entryPath;

  const buildId = crypto.randomUUID();
  const uploadedPaths: string[] = [];
  const preparedFiles = await prepareZipFiles(fileEntries);

  try {
    await runWithConcurrency(preparedFiles, UPLOAD_CONCURRENCY, async (item) => {
      const storagePath = `builds/${buildId}/${item.normalizedPath}`;
      const mime = guessContentType(item.normalizedPath);
      const blob = new Blob([item.content], { type: mime });

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
    });

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
