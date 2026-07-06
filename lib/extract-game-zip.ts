import JSZip from "jszip";
import type { SupabaseClient } from "@supabase/supabase-js";
import { MAX_SINGLE_EXTRACTED_FILE_BYTES, MAX_UNCOMPRESSED_TOTAL_BYTES } from "@/lib/upload-limits";
import {
  normalizeZipPath,
  validateGameZipEntries,
} from "@/lib/game-zip-structure";
import { guessContentType } from "@/lib/game-mime";

const FILES_BUCKET = "game-files";

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
