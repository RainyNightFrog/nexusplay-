import {
  COVERS_BUCKET,
  uploadBuffer,
} from "@/lib/game-storage";
import {
  MAX_DEVLOG_CONTENT_LENGTH,
  MAX_DEVLOG_IMAGES,
  MAX_DEVLOG_TITLE_LENGTH,
  MAX_GALLERY_IMAGES,
  appendDevlogEntry,
  collectDevlogImageFiles,
  collectGalleryFiles,
  isValidGalleryImage,
  mergeGalleryUrls,
  parseDevlogEntries,
  parseGalleryUrlsField,
  parseStringArray,
} from "@/lib/game-page-content";
import { sanitizePlainText } from "@/lib/sanitize-plain";
import {
  formatMaxSize,
  MAX_COVER_BYTES,
  PRODUCTION_FORMDATA_SAFE_BYTES,
} from "@/lib/upload-limits";
import type { SupabaseClient } from "@supabase/supabase-js";

export function assertImageBatchWithinFormDataLimit(files: File[]) {
  const total = files.reduce((sum, file) => sum + file.size, 0);
  if (total > PRODUCTION_FORMDATA_SAFE_BYTES) {
    throw new Error(
      `圖庫／更新配圖合計不可超過約 ${formatMaxSize(PRODUCTION_FORMDATA_SAFE_BYTES)}（目前 ${formatMaxSize(total)}）。請減少張數或壓縮後再試。`
    );
  }
}

export async function uploadImageFiles(
  supabase: SupabaseClient,
  files: File[],
  maxCount: number
) {
  const urls: string[] = [];
  const paths: string[] = [];

  try {
    for (const file of files.slice(0, maxCount)) {
      if (!isValidGalleryImage(file)) {
        throw new Error("圖片僅支援 .png、.jpg、.webp 格式");
      }
      if (file.size > MAX_COVER_BYTES) {
        throw new Error(
          `單張圖片不可超過 ${formatMaxSize(MAX_COVER_BYTES)}（目前 ${formatMaxSize(file.size)}）`
        );
      }

      const buffer = await file.arrayBuffer();
      const upload = await uploadBuffer(
        supabase,
        COVERS_BUCKET,
        file.name,
        buffer,
        file.type || "image/jpeg"
      );
      urls.push(upload.publicUrl);
      paths.push(upload.path);
    }
  } catch (error) {
    if (paths.length > 0) {
      const { removeStoragePaths } = await import("@/lib/game-storage");
      await removeStoragePaths(supabase, COVERS_BUCKET, paths);
    }
    throw error;
  }

  return { urls, paths };
}

export async function resolveGalleryUpdate(
  supabase: SupabaseClient,
  formData: FormData,
  existingGallery: unknown
) {
  const keptUrls = parseGalleryUrlsField(formData);
  const newFiles = collectGalleryFiles(formData);
  assertImageBatchWithinFormDataLimit(newFiles);
  const uploaded = await uploadImageFiles(
    supabase,
    newFiles,
    MAX_GALLERY_IMAGES - keptUrls.length
  );

  return {
    urls: mergeGalleryUrls(
      keptUrls.length > 0 ? keptUrls : parseStringArray(existingGallery),
      uploaded.urls
    ),
    uploadedPaths: uploaded.paths,
  };
}

export async function resolveDevlogUpdate(
  supabase: SupabaseClient,
  formData: FormData,
  existingDevlogs: unknown,
  publishVersion: boolean
) {
  if (!publishVersion) {
    return {
      entries: parseDevlogEntries(existingDevlogs),
      uploadedPaths: [] as string[],
    };
  }

  const devlogTitle = sanitizePlainText(
    String(formData.get("devlogTitle") ?? ""),
    MAX_DEVLOG_TITLE_LENGTH
  );
  const devlogContent = sanitizePlainText(
    String(formData.get("devlogContent") ?? ""),
    MAX_DEVLOG_CONTENT_LENGTH
  );
  const devlogImages = collectDevlogImageFiles(formData);
  assertImageBatchWithinFormDataLimit(devlogImages);

  if (!devlogTitle && !devlogContent && devlogImages.length === 0) {
    return {
      entries: parseDevlogEntries(existingDevlogs),
      uploadedPaths: [] as string[],
    };
  }

  const uploaded = await uploadImageFiles(
    supabase,
    devlogImages,
    MAX_DEVLOG_IMAGES
  );

  return {
    entries: appendDevlogEntry(existingDevlogs, {
      title: devlogTitle || "版本更新",
      content: devlogContent,
      imageUrls: uploaded.urls,
      createdAt: new Date().toISOString(),
    }),
    uploadedPaths: uploaded.paths,
  };
}
