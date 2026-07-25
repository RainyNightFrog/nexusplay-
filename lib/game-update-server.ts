import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { authorizeGameEdit } from "@/lib/game-auth";
import {
  resolveDevlogUpdate,
  resolveGalleryUpdate,
  assertImageBatchWithinFormDataLimit,
} from "@/lib/game-page-upload";
import {
  collectDevlogImageFiles,
  collectGalleryFiles,
} from "@/lib/game-page-content";
import { buildDirectUploadPrefix } from "@/lib/direct-upload-session";
import {
  COVERS_BUCKET,
  extractPublicStoragePath,
  FILES_BUCKET,
  isCreatorOwnedCoverPath,
  removeBuildFolder,
  removeStoragePaths,
  removeStoragePrefix,
  uploadBuffer,
} from "@/lib/game-storage";
import { deleteGameAndAssets } from "@/lib/game-delete-server";
import {
  parseMonetizationFromFormData,
  resolveApprovalStatusAfterCreatorUpdate,
} from "@/lib/game-publish";
import { parsePricingFromFormData } from "@/lib/game-pricing";
import {
  canCreatorReceivePaidPayments,
  paidPublishStripeConnectError,
  pricingRequiresStripeConnect,
} from "@/lib/creator-stripe-gate";
import { readCreatorPayoutRow } from "@/lib/creator-payout-service";
import { triggerNewGameFollowerNotify } from "@/lib/creator-follow-notify";
import { onCreatorGameWentLive } from "@/lib/achievement-unlock-service";
import { isGamePubliclyLive } from "@/lib/game-live-service";
import { GAME_GENRES } from "@/lib/game-metadata";
import {
  buildMetadataDbPayload,
  parsePublishMetadataFromFormData,
  MAX_DETAILS_HTML_LENGTH,
} from "@/lib/game-metadata";
import { sanitizePlainText } from "@/lib/sanitize-plain";
import { sanitizeRichHtml } from "@/lib/sanitize-rich-html";
import { createServerSupabase } from "@/lib/supabase-server";
import { resolveDirectBuildUpload, resolveDirectCoverUpload, directCoverFinalizeMarkerPath, DIRECT_BUILD_FINALIZED_MARKER } from "@/lib/direct-upload-resolve";
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

/** 創作者可更新的欄位；僅首次公開或遭拒後重新提交時重置審批狀態 */
function buildCreatorUpdatePayload(
  input: {
    title: string;
    description: string;
    category: string;
    coverUrl: string;
    gameUrl: string;
    publishStatus: "draft" | "public";
    tipsEnabled: boolean;
    suggestedTipAmount: number | null;
    pricingType: "free" | "fixed" | "pwyw";
    price: number;
    currency: string;
    minPrice: number;
    onSale: boolean;
    galleryUrls: string[];
    devlogEntries: unknown;
    metadataPayload: Record<string, unknown>;
  },
  options: {
    userId: string;
    isOrphan: boolean;
    previousPublishStatus: "draft" | "public";
    previousApprovalStatus?: "pending" | "approved" | "rejected" | null;
  }
) {
  const payload: Record<string, unknown> = {
    title: input.title,
    description: input.description,
    category: input.category,
    cover_url: input.coverUrl,
    game_url: input.gameUrl,
    publish_status: input.publishStatus,
    tips_enabled: input.tipsEnabled,
    suggested_tip_amount: input.suggestedTipAmount,
    pricing_type: input.pricingType,
    price: input.price,
    currency: input.currency,
    min_price: input.minPrice,
    on_sale: input.onSale,
    gallery_urls: input.galleryUrls,
    devlog_entries: input.devlogEntries,
    ...input.metadataPayload,
  };

  if (options.isOrphan) {
    payload.creator_id = options.userId;
  }

  const nextApprovalStatus = resolveApprovalStatusAfterCreatorUpdate(
    {
      publish_status: options.previousPublishStatus,
      status: options.previousApprovalStatus ?? "approved",
    },
    input.publishStatus
  );

  if (nextApprovalStatus) {
    payload.status = nextApprovalStatus;
    if (nextApprovalStatus === "pending") {
      payload.rejection_reason = null;
    }
  }

  return payload;
}

function mapUpdateError(error: unknown) {
  const message =
    error instanceof Error ? error.message : "更新過程發生未知錯誤";

  if (
    message.includes("fetch failed") ||
    message.includes("Failed to fetch") ||
    message.includes("ENOTFOUND") ||
    message.includes("getaddrinfo")
  ) {
    return NextResponse.json(
      {
        error:
          "無法連線 Supabase：Project URL 可能錯誤或專案 DNS 尚未生效。請到 Supabase → Settings → Data API 複製「Project URL」，貼到 .env.local 後重啟。",
      },
      { status: 502 }
    );
  }

  if (message.includes("maximum allowed size")) {
    return NextResponse.json(
      {
        error:
          "檔案超過 Supabase 大小上限（Free 方案單檔最大 50 MB）。請壓縮 zip 後再試，或升級 Pro 方案提高上限。",
      },
      { status: 413 }
    );
  }

  return NextResponse.json({ error: message }, { status: 500 });
}

export async function patchCreatorGame(input: {
  request: Request;
  numericId: number;
  user: User;
  authClient: SupabaseClient;
}) {
  const { request, numericId, user, authClient } = input;

  const supabase = createServerSupabase();
  const authResult = await authorizeGameEdit(supabase, numericId, user.id);

  if (!authResult.ok) {
    return NextResponse.json(
      { error: authResult.message },
      { status: authResult.status }
    );
  }

  const record = authResult.record;
  const isOrphan = authResult.isOrphan;
  const dbClient = isOrphan ? supabase : authClient;

  const formData = await request.formData();

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
  const publishVersion =
    String(formData.get("publishVersion") ?? "false") === "true";
  const coverFile = formData.get("cover");
  const gameZipFile = formData.get("gameZip");

  const monetization = parseMonetizationFromFormData(formData);
  if (!monetization.ok) {
    return NextResponse.json({ error: monetization.error }, { status: 400 });
  }

  const pricing = parsePricingFromFormData(formData);
  if (!pricing.ok) {
    return NextResponse.json({ error: pricing.error }, { status: 400 });
  }

  if (
    monetization.data.publish_status === "public" &&
    pricingRequiresStripeConnect(pricing.data)
  ) {
    const payoutRow = await readCreatorPayoutRow(supabase, user.id);
    if (!canCreatorReceivePaidPayments(payoutRow)) {
      return NextResponse.json(
        { error: paidPublishStripeConnectError() },
        { status: 403 }
      );
    }
  }

  const isPublic = monetization.data.publish_status === "public";

  if (!title) {
    return NextResponse.json({ error: "請輸入遊戲名稱" }, { status: 400 });
  }

  if (isPublic) {
    if (!description) {
      return NextResponse.json({ error: "請輸入遊戲簡介" }, { status: 400 });
    }
    if (!category) {
      return NextResponse.json({ error: "請選擇遊戲分類" }, { status: 400 });
    }
    if (!(GAME_GENRES as readonly string[]).includes(category)) {
      return NextResponse.json({ error: "無效的遊戲分類" }, { status: 400 });
    }
  } else if (category && !(GAME_GENRES as readonly string[]).includes(category)) {
    return NextResponse.json({ error: "無效的遊戲分類" }, { status: 400 });
  }

  const hasCover = coverFile instanceof File && coverFile.size > 0;
  const hasZip = gameZipFile instanceof File && gameZipFile.size > 0;
  const directBuildId = String(formData.get("directBuildId") ?? "").trim();
  const directBuildToken = String(formData.get("directBuildToken") ?? "").trim();
  const directIndexPath = String(formData.get("directIndexPath") ?? "").trim();
  const directCoverPath = String(formData.get("directCoverPath") ?? "").trim();
  const useDirectBuild = Boolean(
    directBuildId && directBuildToken && directIndexPath
  );
  const useDirectCover = Boolean(directCoverPath);

  if (isPublic && !hasCover && !useDirectCover && !record.cover_url) {
    return NextResponse.json({ error: "請上傳遊戲封面圖" }, { status: 400 });
  }

  if (publishVersion && !hasZip && !useDirectBuild) {
    return NextResponse.json(
      { error: "發布新版本需上傳新的 .zip 遊戲包" },
      { status: 400 }
    );
  }

  if (hasCover) {
    const validCoverTypes = ["image/png", "image/jpeg", "image/jpg"];
    if (!validCoverTypes.includes(coverFile.type)) {
      return NextResponse.json(
        { error: "封面圖僅支援 .png、.jpg 格式" },
        { status: 400 }
      );
    }
    if (coverFile.size > MAX_COVER_BYTES) {
      return NextResponse.json(
        {
          error: `封面圖不可超過 ${formatMaxSize(MAX_COVER_BYTES)}（目前 ${formatMaxSize(coverFile.size)}）`,
        },
        { status: 400 }
      );
    }
  }

  if (hasZip) {
    if (!isZipFile(gameZipFile)) {
      return NextResponse.json(
        { error: "遊戲檔案僅支援 .zip 壓縮檔" },
        { status: 400 }
      );
    }
    if (gameZipFile.size > MAX_ZIP_BYTES) {
      return NextResponse.json(
        {
          error: `遊戲 zip 不可超過 ${formatMaxSize(MAX_ZIP_BYTES)}（目前 ${formatMaxSize(gameZipFile.size)}）`,
        },
        { status: 400 }
      );
    }
    if (process.env.VERCEL && gameZipFile.size > PRODUCTION_UPLOAD_BYTES) {
      return NextResponse.json(
        {
          error: `正式站請使用直傳模式（ZIP 上限 ${formatMaxSize(MAX_ZIP_BYTES)}）。目前經由伺服器轉傳的上限為 ${formatMaxSize(PRODUCTION_UPLOAD_BYTES)}。`,
        },
        { status: 413 }
      );
    }
  }

  const metadataResult = parsePublishMetadataFromFormData(formData);
  if (!metadataResult.ok) {
    return NextResponse.json({ error: metadataResult.error }, { status: 400 });
  }
  if (isPublic && metadataResult.data.aiDisclosed === null) {
    return NextResponse.json(
      { error: "公開發布前請完成 AI 內容申報" },
      { status: 400 }
    );
  }

  const metadataPayload: Record<string, unknown> = {
    ...buildMetadataDbPayload({
      ...metadataResult.data,
      detailsHtml: sanitizeRichHtml(
        metadataResult.data.detailsHtml,
        MAX_DETAILS_HTML_LENGTH
      ),
    }),
    platform_fee_percent: resolvePlatformFeePercentForSave(
      record.platform_fee_percent,
      monetization.data.tips_enabled
    ),
  };

  const oldCoverPath = extractPublicStoragePath(record.cover_url, COVERS_BUCKET);
  const oldGameUrl = record.game_url;

  let newCoverPath: string | null = null;
  let newCoverUrl = record.cover_url;
  let newGameUrl = record.game_url;
  let newBuildPaths: string[] = [];
  let contentImagePaths: string[] = [];
  let directBuildPrefix: string | null = null;
  let claimedDirectCover = false;
  let claimedDirectBuild = false;
  let updateSucceeded = false;

  const cleanupNewAssets = async () => {
    if (newCoverPath) {
      const coverTargets = [newCoverPath];
      if (claimedDirectCover) {
        coverTargets.push(directCoverFinalizeMarkerPath(newCoverPath));
      }
      await removeStoragePaths(supabase, COVERS_BUCKET, coverTargets);
    }
    if (contentImagePaths.length > 0) {
      await removeStoragePaths(supabase, COVERS_BUCKET, contentImagePaths);
    }
    if (newBuildPaths.length > 0) {
      await removeStoragePaths(supabase, FILES_BUCKET, newBuildPaths);
    }
    if (directBuildPrefix && claimedDirectBuild) {
      await removeStoragePrefix(supabase, FILES_BUCKET, directBuildPrefix);
    }
  };

  try {
    if (useDirectCover) {
      const resolvedCover = await resolveDirectCoverUpload(
        supabase,
        directCoverPath,
        user.id
      );
      if (!resolvedCover.ok) {
        return NextResponse.json(
          { error: resolvedCover.error },
          { status: 400 }
        );
      }
      newCoverPath = resolvedCover.path;
      newCoverUrl = resolvedCover.publicUrl;
      claimedDirectCover = true;
    } else if (hasCover) {
      const coverBuffer = await coverFile.arrayBuffer();
      const coverUpload = await uploadBuffer(
        supabase,
        COVERS_BUCKET,
        coverFile.name,
        coverBuffer,
        coverFile.type || "image/jpeg"
      );
      newCoverPath = coverUpload.path;
      newCoverUrl = coverUpload.publicUrl;
    }

    if (useDirectBuild) {
      const resolvedBuild = await resolveDirectBuildUpload(supabase, {
        userId: user.id,
        buildId: directBuildId,
        indexPath: directIndexPath,
        token: directBuildToken,
      });
      if (!resolvedBuild.ok) {
        await cleanupNewAssets();
        return NextResponse.json(
          { error: resolvedBuild.error },
          { status: 400 }
        );
      }
      newGameUrl = resolvedBuild.playUrl;
      directBuildPrefix = resolvedBuild.prefix;
      claimedDirectBuild = true;
    } else if (hasZip) {
      const zipBuffer = await gameZipFile.arrayBuffer();
      if (!isZipBuffer(zipBuffer)) {
        await cleanupNewAssets();
        return NextResponse.json(
          { error: "遊戲檔案僅支援 .zip 壓縮檔" },
          { status: 400 }
        );
      }
      const { extractAndUploadGameBuild } = await import(
        "@/lib/extract-game-zip"
      );
      const buildUpload = await extractAndUploadGameBuild(supabase, zipBuffer);
      newBuildPaths = buildUpload.uploadedPaths;
      newGameUrl = buildUpload.playUrl;
    }

    let galleryUrls: string[];
    let devlogEntries: unknown;

    try {
      assertImageBatchWithinFormDataLimit([
        ...collectGalleryFiles(formData),
        ...collectDevlogImageFiles(formData),
      ]);
      const galleryResult = await resolveGalleryUpdate(
        supabase,
        formData,
        record.gallery_urls ?? []
      );
      const devlogResult = await resolveDevlogUpdate(
        supabase,
        formData,
        record.devlog_entries ?? [],
        publishVersion
      );
      galleryUrls = galleryResult.urls;
      devlogEntries = devlogResult.entries;
      contentImagePaths = [
        ...galleryResult.uploadedPaths,
        ...devlogResult.uploadedPaths,
      ];
    } catch (contentError) {
      const message =
        contentError instanceof Error
          ? contentError.message
          : "處理遊戲介紹圖片失敗";
      await cleanupNewAssets();
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const updatePayload = buildCreatorUpdatePayload(
      {
        title,
        description,
        category,
        coverUrl: newCoverUrl,
        gameUrl: newGameUrl,
        publishStatus: monetization.data.publish_status,
        tipsEnabled: monetization.data.tips_enabled,
        suggestedTipAmount: monetization.data.suggested_tip_amount,
        pricingType: pricing.data.pricing_type,
        price: pricing.data.price,
        currency: pricing.data.currency,
        minPrice: pricing.data.min_price,
        onSale: pricing.data.on_sale,
        galleryUrls,
        devlogEntries,
        metadataPayload,
      },
      {
        userId: user.id,
        isOrphan,
        previousPublishStatus: record.publish_status,
        previousApprovalStatus: record.status,
      }
    );

    let updateQuery = dbClient
      .from("games")
      .update(updatePayload)
      .eq("id", numericId);

    if (isOrphan) {
      updateQuery = updateQuery.is("creator_id", null);
    } else {
      updateQuery = updateQuery.eq("creator_id", user.id);
    }

    const { data: updated, error: updateError } = await updateQuery
      .select()
      .single();

    if (updateError) {
      const hint =
        updateError.message.includes("status") &&
        updateError.message.includes("schema cache")
          ? " 請先在 Supabase SQL Editor 執行 supabase/add-game-status.sql（或 npm run db:status）。"
          : updateError.message.includes("gallery_urls") &&
              updateError.message.includes("schema cache")
            ? " 請先在 Supabase SQL Editor 執行 supabase/game-page-content.sql（或 npm run db:game-page）。"
            : updateError.message.includes("tags") &&
                updateError.message.includes("schema cache")
              ? " 請先在 Supabase SQL Editor 執行 supabase/game-publish-metadata.sql（或 npm run db:publish-metadata）。"
              : updateError.message.includes("pricing_type") &&
                updateError.message.includes("schema cache")
              ? " 請先在 Supabase SQL Editor 執行 supabase/add-game-pricing.sql（或 npm run db:pricing）。"
              : "";
      throw new Error(`資料庫更新失敗：${updateError.message}${hint}`);
    }

    if (
      (hasCover || useDirectCover) &&
      oldCoverPath &&
      oldCoverPath !== newCoverPath
    ) {
      await removeStoragePaths(supabase, COVERS_BUCKET, [oldCoverPath]);
    }

    if (
      (hasZip || useDirectBuild) &&
      oldGameUrl &&
      oldGameUrl !== newGameUrl
    ) {
      const oldZipPath = extractPublicStoragePath(oldGameUrl, FILES_BUCKET);
      if (oldZipPath?.toLowerCase().endsWith(".zip")) {
        await removeStoragePaths(supabase, FILES_BUCKET, [oldZipPath]);
      } else {
        await removeBuildFolder(supabase, oldGameUrl);
      }
    }

    const wasLive = isGamePubliclyLive(record);
    if (
      !wasLive &&
      isGamePubliclyLive(updated) &&
      updated.creator_id &&
      typeof updated.id === "number"
    ) {
      void triggerNewGameFollowerNotify({
        gameId: updated.id,
        creatorId: updated.creator_id,
        gameTitle: updated.title,
      });
      void onCreatorGameWentLive(createServerSupabase(), updated.creator_id);
    }

    updateSucceeded = true;
    return NextResponse.json({ game: updated });
  } catch (error) {
    await cleanupNewAssets();
    throw error;
  } finally {
    if (!updateSucceeded) {
      if (
        !claimedDirectCover &&
        useDirectCover &&
        directCoverPath &&
        isCreatorOwnedCoverPath(user.id, directCoverPath)
      ) {
        const markerPath = directCoverFinalizeMarkerPath(directCoverPath);
        const { data: marker } = await supabase.storage
          .from(COVERS_BUCKET)
          .createSignedUrl(markerPath, 60);
        if (!marker?.signedUrl) {
          await removeStoragePaths(supabase, COVERS_BUCKET, [directCoverPath]);
        }
      }
      if (!claimedDirectBuild && useDirectBuild) {
        const prefix = buildDirectUploadPrefix(user.id, directBuildId);
        const markerPath = `${prefix}/${DIRECT_BUILD_FINALIZED_MARKER}`;
        const { data: marker } = await supabase.storage
          .from(FILES_BUCKET)
          .createSignedUrl(markerPath, 60);
        if (!marker?.signedUrl) {
          await removeStoragePrefix(supabase, FILES_BUCKET, prefix);
        }
      }
    }
  }
}

export async function deleteCreatorGame(input: {
  numericId: number;
  user: User;
}) {
  const { numericId, user } = input;

  const supabase = createServerSupabase();
  const authResult = await authorizeGameEdit(supabase, numericId, user.id);

  if (!authResult.ok) {
    return NextResponse.json(
      { error: authResult.message },
      { status: authResult.status }
    );
  }

  const record = authResult.record;

  await deleteGameAndAssets(supabase, record, {
    mode: "creator",
    userId: user.id,
    isOrphan: authResult.isOrphan,
  });

  return NextResponse.json({ ok: true, id: numericId });
}

export { mapUpdateError };
