import { NextResponse } from "next/server";
import { extractAndUploadGameBuild } from "@/lib/extract-game-zip";
import { authorizeGameEdit } from "@/lib/game-auth";
import { resolveUserRole, hasCreatorDashboardAccess } from "@/lib/auth-profile";
import {
  COVERS_BUCKET,
  extractPublicStoragePath,
  FILES_BUCKET,
  removeBuildFolder,
  removeStoragePaths,
  uploadBuffer,
} from "@/lib/game-storage";
import { deleteGameAndAssets } from "@/lib/game-delete-server";
import { parseMonetizationFromFormData } from "@/lib/game-publish";
import { triggerNewGameFollowerNotify } from "@/lib/creator-follow-notify";
import { isGamePubliclyLive } from "@/lib/game-live-service";
import { GAME_GENRES } from "@/lib/game-metadata";
import {
  buildMetadataDbPayload,
  parsePublishMetadataFromFormData,
} from "@/lib/game-metadata";
import { sanitizePlainText, sanitizeRichHtml } from "@/lib/sanitize";
import { createAuthServerClient } from "@/lib/supabase/server-auth";
import { createServerSupabase } from "@/lib/supabase-server";
import {
  formatMaxSize,
  MAX_CATEGORY_LENGTH,
  MAX_COVER_BYTES,
  MAX_DESCRIPTION_LENGTH,
  MAX_TITLE_LENGTH,
  MAX_ZIP_BYTES,
} from "@/lib/upload-limits";
import { MAX_DETAILS_HTML_LENGTH } from "@/lib/game-metadata";
import { resolvePlatformFeePercentForSave } from "@/lib/tip-fee-policy";
import {
  resolveDevlogUpdate,
  resolveGalleryUpdate,
} from "@/lib/game-page-upload";
import { isZipBuffer, isZipFile } from "@/lib/zip-file-validation";

/** 創作者可更新的欄位；公開發布時重置審批狀態為 pending */
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
    galleryUrls: string[];
    devlogEntries: unknown;
    metadataPayload: Record<string, unknown>;
  },
  options: { userId: string; isOrphan: boolean }
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
    gallery_urls: input.galleryUrls,
    devlog_entries: input.devlogEntries,
    ...input.metadataPayload,
  };

  if (options.isOrphan) {
    payload.creator_id = options.userId;
  }

  if (input.publishStatus === "public") {
    payload.status = "pending";
  }

  return payload;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const numericId = Number.parseInt(id, 10);

    if (Number.isNaN(numericId)) {
      return NextResponse.json({ error: "無效的遊戲 ID" }, { status: 400 });
    }

    const authClient = await createAuthServerClient();
    const {
      data: { user },
    } = await authClient.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "請先登入" }, { status: 401 });
    }

    const role = await resolveUserRole(authClient, user);

    if (!hasCreatorDashboardAccess(user, role)) {
      return NextResponse.json(
        { error: "需要創作者身分才能更新遊戲" },
        { status: 403 }
      );
    }

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
    // 孤兒遊戲綁定 creator_id 需 service role；其餘更新走登入者 client 以觸發 RLS
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

    if (isPublic && !hasCover && !record.cover_url) {
      return NextResponse.json({ error: "請上傳遊戲封面圖" }, { status: 400 });
    }

    if (publishVersion && !hasZip) {
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
    }

    const metadataResult = parsePublishMetadataFromFormData(formData);
    if (!metadataResult.ok) {
      return NextResponse.json({ error: metadataResult.error }, { status: 400 });
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

    try {
      if (hasCover) {
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

      if (hasZip) {
        const zipBuffer = await gameZipFile.arrayBuffer();
        if (!isZipBuffer(zipBuffer)) {
          return NextResponse.json(
            { error: "遊戲檔案僅支援 .zip 壓縮檔" },
            { status: 400 }
          );
        }
        const buildUpload = await extractAndUploadGameBuild(supabase, zipBuffer);
        newBuildPaths = buildUpload.uploadedPaths;
        newGameUrl = buildUpload.playUrl;
      }

      let galleryUrls: string[];
      let devlogEntries: unknown;

      try {
        galleryUrls = await resolveGalleryUpdate(
          supabase,
          formData,
          record.gallery_urls ?? []
        );
        devlogEntries = await resolveDevlogUpdate(
          supabase,
          formData,
          record.devlog_entries ?? [],
          publishVersion
        );
      } catch (contentError) {
        const message =
          contentError instanceof Error
            ? contentError.message
            : "處理遊戲介紹圖片失敗";
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
          galleryUrls,
          devlogEntries,
          metadataPayload,
        },
        { userId: user.id, isOrphan }
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
                : "";
        throw new Error(`資料庫更新失敗：${updateError.message}${hint}`);
      }

      if (hasCover && oldCoverPath && oldCoverPath !== newCoverPath) {
        await removeStoragePaths(supabase, COVERS_BUCKET, [oldCoverPath]);
      }

      if (hasZip && oldGameUrl && oldGameUrl !== newGameUrl) {
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
      }

      return NextResponse.json({ game: updated });
    } catch (error) {
      if (newCoverPath) {
        await removeStoragePaths(supabase, COVERS_BUCKET, [newCoverPath]);
      }
      if (newBuildPaths.length > 0) {
        await removeStoragePaths(supabase, FILES_BUCKET, newBuildPaths);
      }
      throw error;
    }
  } catch (error) {
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
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const numericId = Number.parseInt(id, 10);

    if (Number.isNaN(numericId)) {
      return NextResponse.json({ error: "無效的遊戲 ID" }, { status: 400 });
    }

    const authClient = await createAuthServerClient();
    const {
      data: { user },
    } = await authClient.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "請先登入" }, { status: 401 });
    }

    const role = await resolveUserRole(authClient, user);

    if (!hasCreatorDashboardAccess(user, role)) {
      return NextResponse.json(
        { error: "需要創作者身分才能刪除遊戲" },
        { status: 403 }
      );
    }

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
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "刪除遊戲失敗";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
