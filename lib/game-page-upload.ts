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
import { sanitizePlainText } from "@/lib/sanitize";
import { formatMaxSize, MAX_COVER_BYTES } from "@/lib/upload-limits";
import type { SupabaseClient } from "@supabase/supabase-js";

export async function uploadImageFiles(
  supabase: SupabaseClient,
  files: File[],
  maxCount: number
) {
  const urls: string[] = [];

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
  }

  return urls;
}

export async function resolveGalleryUpdate(
  supabase: SupabaseClient,
  formData: FormData,
  existingGallery: unknown
) {
  const keptUrls = parseGalleryUrlsField(formData);
  const newFiles = collectGalleryFiles(formData);
  const uploadedUrls = await uploadImageFiles(
    supabase,
    newFiles,
    MAX_GALLERY_IMAGES - keptUrls.length
  );

  return mergeGalleryUrls(
    keptUrls.length > 0 ? keptUrls : parseStringArray(existingGallery),
    uploadedUrls
  );
}

export async function resolveDevlogUpdate(
  supabase: SupabaseClient,
  formData: FormData,
  existingDevlogs: unknown,
  publishVersion: boolean
) {
  if (!publishVersion) {
    return parseDevlogEntries(existingDevlogs);
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

  if (!devlogTitle && !devlogContent && devlogImages.length === 0) {
    return parseDevlogEntries(existingDevlogs);
  }

  const imageUrls = await uploadImageFiles(
    supabase,
    devlogImages,
    MAX_DEVLOG_IMAGES
  );

  return appendDevlogEntry(existingDevlogs, {
    title: devlogTitle || "版本更新",
    content: devlogContent,
    imageUrls,
    createdAt: new Date().toISOString(),
  });
}
