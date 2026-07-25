import type { SupabaseClient } from "@supabase/supabase-js";
import { extractAndUploadGameBuild } from "@/lib/extract-game-zip";
import { resolveDirectBuildUpload, resolveDirectCoverUpload, directCoverFinalizeMarkerPath, DIRECT_BUILD_FINALIZED_MARKER } from "@/lib/direct-upload-resolve";
import { parseMonetizationFromFormData, parsePublishStatus } from "@/lib/game-publish";
import { parsePricingFromFormData } from "@/lib/game-pricing";
import {
  canCreatorReceivePaidPayments,
  paidPublishStripeConnectError,
  pricingRequiresStripeConnect,
} from "@/lib/creator-stripe-gate";
import { readCreatorPayoutRow } from "@/lib/creator-payout-service";
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
import { buildDirectUploadPrefix } from "@/lib/direct-upload-session";
import { collectGalleryFiles } from "@/lib/game-page-content";
import {
  assertImageBatchWithinFormDataLimit,
  resolveGalleryUpdate,
} from "@/lib/game-page-upload";
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
import { resolveGameSlugForSave } from "@/lib/game-slug";
import { resolvePlatformFeePercentForSave } from "@/lib/tip-fee-policy";
import { isZipBuffer, isZipFile } from "@/lib/zip-file-validation";
import {
  COVERS_BUCKET,
  FILES_BUCKET,
  isCreatorOwnedCoverPath,
  uploadBuffer,
  removeStoragePaths,
  removeStoragePrefix,
} from "@/lib/game-storage";

export type GameUploadResult =
  | { ok: true; game: Record<string, unknown> }
  | { ok: false; status: number; error: string };

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
  const directBuildId = String(formData.get("directBuildId") ?? "").trim();
  const directBuildToken = String(formData.get("directBuildToken") ?? "").trim();
  const directIndexPath = String(formData.get("directIndexPath") ?? "").trim();
  const directCoverPath = String(formData.get("directCoverPath") ?? "").trim();
  const useDirectBuild = Boolean(
    directBuildId && directBuildToken && directIndexPath
  );
  const publishStatus = parsePublishStatus(formData.get("publishStatus"));
  const isPublic = publishStatus === "public";

  let succeeded = false;
  let claimedDirectCover = false;
  let claimedDirectBuild = false;

  try {
  if (!title) {
    return { ok: false, status: 400, error: "請輸入遊戲名稱" };
  }
  if (!useDirectBuild && !(gameZipFile instanceof File)) {
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
    if (!directCoverPath && !(coverFile instanceof File)) {
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

  if (!useDirectBuild) {
    if (!isZipFile(gameZipFile as File)) {
      return { ok: false, status: 400, error: "遊戲檔案僅支援 .zip 壓縮檔" };
    }
    if ((gameZipFile as File).size > MAX_ZIP_BYTES) {
      return {
        ok: false,
        status: 400,
        error: `遊戲 zip 不可超過 ${formatMaxSize(MAX_ZIP_BYTES)}（目前 ${formatMaxSize((gameZipFile as File).size)}）`,
      };
    }
    if (
      process.env.VERCEL &&
      (gameZipFile as File).size > PRODUCTION_UPLOAD_BYTES
    ) {
      return {
        ok: false,
        status: 413,
        error: `正式站請使用直傳模式（ZIP 上限 ${formatMaxSize(MAX_ZIP_BYTES)}）。目前經由伺服器轉傳的上限為 ${formatMaxSize(PRODUCTION_UPLOAD_BYTES)}。`,
      };
    }
  }

  const monetization = parseMonetizationFromFormData(formData);
  if (!monetization.ok) {
    return { ok: false, status: 400, error: monetization.error };
  }

  const pricing = parsePricingFromFormData(formData);
  if (!pricing.ok) {
    return { ok: false, status: 400, error: pricing.error };
  }

  if (
    monetization.data.publish_status === "public" &&
    pricingRequiresStripeConnect(pricing.data)
  ) {
    const supabaseForGate = params.supabase ?? createServerSupabase();
    const payoutRow = await readCreatorPayoutRow(
      supabaseForGate,
      params.creatorId
    );
    if (!canCreatorReceivePaidPayments(payoutRow)) {
      return {
        ok: false,
        status: 403,
        error: paidPublishStripeConnectError(),
      };
    }
  }

  const metadataResult = parsePublishMetadataFromFormData(formData);
  if (!metadataResult.ok) {
    return { ok: false, status: 400, error: metadataResult.error };
  }
  if (isPublic && metadataResult.data.aiDisclosed === null) {
    return {
      ok: false,
      status: 400,
      error: "公開發布前請完成 AI 內容申報",
    };
  }

  const slugResult = resolveGameSlugForSave({
    rawSlug: String(formData.get("slug") ?? ""),
    title,
    requireSlug: isPublic,
  });
  if (!slugResult.ok) {
    return { ok: false, status: 400, error: slugResult.error };
  }

  if (slugResult.slug) {
    const { data: profileConflict } = await (params.supabase ?? createServerSupabase())
      .from("profiles")
      .select("id")
      .eq("username", slugResult.slug)
      .maybeSingle();
    if (profileConflict) {
      return {
        ok: false,
        status: 409,
        error: "此專案網址已被創作者使用，請改用其他名稱",
      };
    }
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
  let galleryUploadedPaths: string[] = [];
  let directBuildPrefix: string | null = null;
  /** 直傳封面失敗回滾時要刪；伺服器轉傳封面同理 */
  let shouldCleanupCover = false;

  const cleanupPartialUpload = async () => {
    if (coverPath && shouldCleanupCover) {
      const coverTargets = [coverPath];
      if (claimedDirectCover) {
        coverTargets.push(directCoverFinalizeMarkerPath(coverPath));
      }
      await removeStoragePaths(supabase, COVERS_BUCKET, coverTargets);
    }
    if (galleryUploadedPaths.length > 0) {
      await removeStoragePaths(supabase, COVERS_BUCKET, galleryUploadedPaths);
    }
    if (buildPaths.length > 0) {
      await removeStoragePaths(supabase, FILES_BUCKET, buildPaths);
    }
    if (directBuildPrefix && claimedDirectBuild) {
      await removeStoragePrefix(supabase, FILES_BUCKET, directBuildPrefix);
    }
  };

  try {
    let coverPublicUrl: string;

    if (directCoverPath) {
      const resolvedCover = await resolveDirectCoverUpload(
        supabase,
        directCoverPath,
        params.creatorId
      );
      if (!resolvedCover.ok) {
        return { ok: false, status: 400, error: resolvedCover.error };
      }
      coverPath = resolvedCover.path;
      coverPublicUrl = resolvedCover.publicUrl;
      shouldCleanupCover = true;
      claimedDirectCover = true;
    } else {
      const coverBuffer = hasCoverFile
        ? await (coverFile as File).arrayBuffer()
        : createDraftPlaceholderCoverBuffer();
      const coverUpload = await uploadBuffer(
        supabase,
        COVERS_BUCKET,
        hasCoverFile ? (coverFile as File).name : "draft-placeholder.png",
        coverBuffer,
        hasCoverFile
          ? (coverFile as File).type || "image/jpeg"
          : "image/png"
      );
      coverPath = coverUpload.path;
      coverPublicUrl = coverUpload.publicUrl;
      shouldCleanupCover = true;
    }

    let playUrl: string;

    if (useDirectBuild) {
      const resolvedBuild = await resolveDirectBuildUpload(supabase, {
        userId: params.creatorId,
        buildId: directBuildId,
        indexPath: directIndexPath,
        token: directBuildToken,
      });
      if (!resolvedBuild.ok) {
        await cleanupPartialUpload();
        return { ok: false, status: 400, error: resolvedBuild.error };
      }
      playUrl = resolvedBuild.playUrl;
      directBuildPrefix = resolvedBuild.prefix;
      claimedDirectBuild = true;
    } else {
      const zipBuffer = await (gameZipFile as File).arrayBuffer();
      if (!isZipBuffer(zipBuffer)) {
        await cleanupPartialUpload();
        return { ok: false, status: 400, error: "遊戲檔案僅支援 .zip 壓縮檔" };
      }
      const buildUpload = await extractAndUploadGameBuild(supabase, zipBuffer);
      buildPaths = buildUpload.uploadedPaths;
      playUrl = buildUpload.playUrl;
    }

    let galleryUrls: string[] = [];
    try {
      assertImageBatchWithinFormDataLimit(collectGalleryFiles(formData));
      const galleryResult = await resolveGalleryUpdate(supabase, formData, []);
      galleryUrls = galleryResult.urls;
      galleryUploadedPaths = galleryResult.uploadedPaths;
    } catch (contentError) {
      const message =
        contentError instanceof Error
          ? contentError.message
          : "處理遊戲介紹圖片失敗";
      await cleanupPartialUpload();
      return { ok: false, status: 400, error: message };
    }

    const { data, error } = await supabase
      .from("games")
      .insert({
        title,
        slug: slugResult.slug,
        description: finalDescription,
        category: finalCategory,
        cover_url: coverPublicUrl,
        game_url: playUrl,
        creator_id: params.creatorId,
        publish_status: monetization.data.publish_status,
        tips_enabled: monetization.data.tips_enabled,
        suggested_tip_amount: monetization.data.suggested_tip_amount,
        pricing_type: pricing.data.pricing_type,
        price: pricing.data.price,
        currency: pricing.data.currency,
        min_price: pricing.data.min_price,
        on_sale: pricing.data.on_sale,
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
      if (error.message.includes("games_slug_unique_idx") || error.code === "23505") {
        await cleanupPartialUpload();
        return {
          ok: false,
          status: 409,
          error: "此專案網址已被使用，請改用其他名稱",
        };
      }
      throw new Error(`資料庫寫入失敗：${error.message}`);
    }

    succeeded = true;
    return { ok: true, game: data as Record<string, unknown> };
  } catch (error) {
    await cleanupPartialUpload();
    return mapUploadError(error);
  }
  } finally {
    // 僅清理「尚未 claim」的直傳殘檔（例如 AI／slug 驗證失敗）。
    // 已 claim 的資產由 cleanupPartialUpload 處理；不可刪別人已 claim 的 build。
    if (!succeeded) {
      const cleanupClient = params.supabase ?? createServerSupabase();
      if (
        !claimedDirectCover &&
        directCoverPath &&
        isCreatorOwnedCoverPath(params.creatorId, directCoverPath)
      ) {
        const markerPath = directCoverFinalizeMarkerPath(directCoverPath);
        const { data: marker } = await cleanupClient.storage
          .from(COVERS_BUCKET)
          .createSignedUrl(markerPath, 60);
        if (!marker?.signedUrl) {
          await removeStoragePaths(cleanupClient, COVERS_BUCKET, [
            directCoverPath,
          ]);
        }
      }
      if (!claimedDirectBuild && useDirectBuild) {
        const prefix = buildDirectUploadPrefix(
          params.creatorId,
          directBuildId
        );
        const markerPath = `${prefix}/${DIRECT_BUILD_FINALIZED_MARKER}`;
        const { data: marker } = await cleanupClient.storage
          .from(FILES_BUCKET)
          .createSignedUrl(markerPath, 60);
        if (!marker?.signedUrl) {
          await removeStoragePrefix(cleanupClient, FILES_BUCKET, prefix);
        }
      }
    }
  }
}
