import type { SupabaseClient } from "@supabase/supabase-js";
import { extractAndUploadGameBuild } from "@/lib/extract-game-zip";
import { parseMonetizationFromFormData, parsePublishStatus } from "@/lib/game-publish";
import { parsePricingFromFormData } from "@/lib/game-pricing";
import { GAME_GENRES } from "@/lib/game-metadata";
import {
  createDraftPlaceholderCoverBuffer,
  DRAFT_DEFAULT_GENRE,
  DRAFT_PLACEHOLDER_DESCRIPTION,
} from "@/lib/draft-placeholder-cover";
import {
  buildMetadataDbPayload,
  parsePublishMetadataFromFormData,
  MAX_DETAILS_HTML_LENGTH,
} from "@/lib/game-metadata";
import { resolveGalleryUpdate } from "@/lib/game-page-upload";
import { sanitizePlainText } from "@/lib/sanitize-plain";
import { sanitizeRichHtml } from "@/lib/sanitize-rich-html";
import { createServerSupabase } from "@/lib/supabase-server";
import {
  formatMaxSize,
  MAX_CATEGORY_LENGTH,
  MAX_COVER_BYTES,
  MAX_DESCRIPTION_LENGTH,
  MAX_TITLE_LENGTH,
  MAX_ZIP_BYTES,
  PRODUCTION_UPLOAD_BYTES,
} from "@/lib/upload-limits";
import { resolvePlatformFeePercentForSave } from "@/lib/tip-fee-policy";
import { isZipBuffer, isZipFile } from "@/lib/zip-file-validation";

const COVERS_BUCKET = "game-covers";
const FILES_BUCKET = "game-files";

export type GameUploadResult =
  | { ok: true; game: Record<string, unknown> }
  | { ok: false; status: number; error: string };

function sanitizeFileName(name: string) {
  return name.replace(/[^\w.\-()]/g, "_");
}

function buildStoragePath(fileName: string) {
  return `${crypto.randomUUID()}-${sanitizeFileName(fileName)}`;
}

async function uploadBuffer(
  supabase: SupabaseClient,
  bucket: string,
  fileName: string,
  buffer: ArrayBuffer,
  contentType: string
) {
  const path = buildStoragePath(fileName);

  const { error } = await supabase.storage.from(bucket).upload(path, buffer, {
    cacheControl: "3600",
    upsert: false,
    contentType,
  });

  if (error) {
    throw new Error(`Storage 上傳失敗（${bucket}）：${error.message}`);
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return { path, publicUrl: data.publicUrl };
}

function mapUploadError(error: unknown): GameUploadResult {
  const message =
    error instanceof Error ? error.message : "上傳過程發生未知錯誤";

  if (
    message.includes("fetch failed") ||
    message.includes("Failed to fetch") ||
    message.includes("ENOTFOUND") ||
    message.includes("getaddrinfo")
  ) {
    return {
      ok: false,
      status: 502,
      error:
        "無法連線 Supabase：Project URL 可能錯誤或專案 DNS 尚未生效。請到 Supabase → Settings → Data API 複製「Project URL」，貼到 .env.local 後重啟。也可開啟 /api/supabase/health 查看診斷。",
    };
  }

  if (message.includes("maximum allowed size")) {
    return {
      ok: false,
      status: 413,
      error:
        "檔案超過 Supabase 大小上限（Free 方案單檔最大 50 MB）。請壓縮 zip 後再試，或升級 Pro 方案提高上限。",
    };
  }

  return { ok: false, status: 500, error: message };
}

export async function uploadCreatorGameFromFormData(params: {
  creatorId: string;
  formData: FormData;
  supabase?: SupabaseClient;
}): Promise<GameUploadResult> {
  const formData = params.formData;

  const title = sanitizePlainText(
    String(formData.get("title") ?? ""),
    MAX_TITLE_LENGTH
  );
  const description = sanitizePlainText(
    String(formData.get("description") ?? ""),
    MAX_DESCRIPTION_LENGTH
  );
  const category = sanitizePlainText(
    String(formData.get("category") ?? ""),
    MAX_CATEGORY_LENGTH
  );
  const coverFile = formData.get("cover");
  const gameZipFile = formData.get("gameZip");
  const publishStatus = parsePublishStatus(formData.get("publishStatus"));
  const isPublic = publishStatus === "public";

  if (!title) {
    return { ok: false, status: 400, error: "請輸入遊戲名稱" };
  }
  if (!(gameZipFile instanceof File)) {
    return { ok: false, status: 400, error: "請上傳遊戲壓縮檔" };
  }

  const finalDescription =
    description || (isPublic ? "" : DRAFT_PLACEHOLDER_DESCRIPTION);
  const finalCategory =
    category && (GAME_GENRES as readonly string[]).includes(category)
      ? category
      : isPublic
        ? ""
        : DRAFT_DEFAULT_GENRE;

  if (isPublic) {
    if (!finalDescription) {
      return { ok: false, status: 400, error: "請輸入遊戲簡介" };
    }
    if (!finalCategory) {
      return { ok: false, status: 400, error: "請選擇遊戲分類" };
    }
    if (!(coverFile instanceof File)) {
      return { ok: false, status: 400, error: "請上傳遊戲封面圖" };
    }
  }

  const hasCoverFile = coverFile instanceof File && coverFile.size > 0;

  if (hasCoverFile) {
    const validCoverTypes = ["image/png", "image/jpeg", "image/jpg"];
    if (!validCoverTypes.includes(coverFile.type)) {
      return {
        ok: false,
        status: 400,
        error: "封面圖僅支援 .png、.jpg 格式",
      };
    }
    if (coverFile.size > MAX_COVER_BYTES) {
      return {
        ok: false,
        status: 400,
        error: `封面圖不可超過 ${formatMaxSize(MAX_COVER_BYTES)}（目前 ${formatMaxSize(coverFile.size)}）`,
      };
    }
  }

  if (!isZipFile(gameZipFile)) {
    return { ok: false, status: 400, error: "遊戲檔案僅支援 .zip 壓縮檔" };
  }
  if (gameZipFile.size > MAX_ZIP_BYTES) {
    return {
      ok: false,
      status: 400,
      error: `遊戲 zip 不可超過 ${formatMaxSize(MAX_ZIP_BYTES)}（目前 ${formatMaxSize(gameZipFile.size)}）`,
    };
  }
  if (
    process.env.VERCEL &&
    gameZipFile.size > PRODUCTION_UPLOAD_BYTES
  ) {
    return {
      ok: false,
      status: 413,
      error: `正式站上傳 zip 請小於 ${formatMaxSize(PRODUCTION_UPLOAD_BYTES)}（目前 ${formatMaxSize(gameZipFile.size)}）。請壓縮後再試。`,
    };
  }

  const monetization = parseMonetizationFromFormData(formData);
  if (!monetization.ok) {
    return { ok: false, status: 400, error: monetization.error };
  }

  const pricing = parsePricingFromFormData(formData);
  if (!pricing.ok) {
    return { ok: false, status: 400, error: pricing.error };
  }

  const metadataResult = parsePublishMetadataFromFormData(formData);
  if (!metadataResult.ok) {
    return { ok: false, status: 400, error: metadataResult.error };
  }

  const metadataPayload = buildMetadataDbPayload({
    ...metadataResult.data,
    detailsHtml: sanitizeRichHtml(
      metadataResult.data.detailsHtml,
      MAX_DETAILS_HTML_LENGTH
    ),
  });

  const supabase = params.supabase ?? createServerSupabase();
  let coverPath: string | null = null;
  let buildPaths: string[] = [];

  try {
    const coverBuffer = hasCoverFile
      ? await coverFile.arrayBuffer()
      : createDraftPlaceholderCoverBuffer();
    const coverUpload = await uploadBuffer(
      supabase,
      COVERS_BUCKET,
      hasCoverFile ? coverFile.name : "draft-placeholder.png",
      coverBuffer,
      hasCoverFile ? coverFile.type || "image/jpeg" : "image/png"
    );
    coverPath = coverUpload.path;

    const zipBuffer = await gameZipFile.arrayBuffer();
    if (!isZipBuffer(zipBuffer)) {
      return { ok: false, status: 400, error: "遊戲檔案僅支援 .zip 壓縮檔" };
    }
    const buildUpload = await extractAndUploadGameBuild(supabase, zipBuffer);
    buildPaths = buildUpload.uploadedPaths;

    let galleryUrls: string[] = [];
    try {
      galleryUrls = await resolveGalleryUpdate(supabase, formData, []);
    } catch (contentError) {
      const message =
        contentError instanceof Error
          ? contentError.message
          : "處理遊戲介紹圖片失敗";
      return { ok: false, status: 400, error: message };
    }

    const { data, error } = await supabase
      .from("games")
      .insert({
        title,
        description: finalDescription,
        category: finalCategory,
        cover_url: coverUpload.publicUrl,
        game_url: buildUpload.playUrl,
        creator_id: params.creatorId,
        publish_status: monetization.data.publish_status,
        tips_enabled: monetization.data.tips_enabled,
        suggested_tip_amount: monetization.data.suggested_tip_amount,
        pricing_type: pricing.data.pricing_type,
        price: pricing.data.price,
        currency: pricing.data.currency,
        min_price: pricing.data.min_price,
        status: "pending",
        gallery_urls: galleryUrls,
        devlog_entries: [],
        ...metadataPayload,
        platform_fee_percent: resolvePlatformFeePercentForSave(
          null,
          monetization.data.tips_enabled
        ),
      })
      .select()
      .single();

    if (error) {
      throw new Error(`資料庫寫入失敗：${error.message}`);
    }

    return { ok: true, game: data as Record<string, unknown> };
  } catch (error) {
    if (coverPath) {
      await supabase.storage
        .from(COVERS_BUCKET)
        .remove([coverPath])
        .catch(() => undefined);
    }
    if (buildPaths.length > 0) {
      await supabase.storage
        .from(FILES_BUCKET)
        .remove(buildPaths)
        .catch(() => undefined);
    }

    return mapUploadError(error);
  }
}
