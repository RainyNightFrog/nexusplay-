import type { SupabaseClient } from "@supabase/supabase-js";
import {
  buildDirectUploadPrefix,
  isCreatorOwnedBuildStoragePath,
  isUuidLike,
  verifyDirectUploadSession,
} from "@/lib/direct-upload-session";
import { normalizeZipPath } from "@/lib/game-zip-structure";
import {
  COVERS_BUCKET,
  FILES_BUCKET,
  isCreatorOwnedCoverPath,
} from "@/lib/game-storage";

/** 標記此建置已進入 finalize，防止同一 token 重複提交共用資產 */
export const DIRECT_BUILD_FINALIZED_MARKER = ".rnf-finalized";

function coverFinalizeMarkerPath(coverPath: string) {
  return `${coverPath}.rnf-finalized`;
}

export function directCoverFinalizeMarkerPath(coverPath: string) {
  return coverFinalizeMarkerPath(coverPath);
}

async function claimFinalizeMarker(
  supabase: SupabaseClient,
  bucket: string,
  markerPath: string,
  alreadyUsedError: string
) {
  const { error } = await supabase.storage.from(bucket).upload(
    markerPath,
    new Blob(["1"], { type: "text/plain" }),
    {
      upsert: false,
      contentType: "text/plain",
      cacheControl: "3600",
    }
  );

  if (error) {
    return { ok: false as const, error: alreadyUsedError };
  }

  return { ok: true as const, markerPath };
}

/** 用短效 signed URL 確認物件存在，避免整檔 download 拖慢 finalize */
async function assertStorageObjectExists(
  supabase: SupabaseClient,
  bucket: string,
  path: string,
  missingError: string
) {
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, 60);

  if (error || !data?.signedUrl) {
    return { ok: false as const, error: missingError };
  }

  return { ok: true as const };
}

export async function resolveDirectCoverUpload(
  supabase: SupabaseClient,
  coverPath: string,
  userId: string
) {
  const path = coverPath.trim().replace(/^\/+/, "");
  if (!path || path.includes("..") || path.includes("\\")) {
    return { ok: false as const, error: "封面路徑無效" };
  }

  if (!isCreatorOwnedCoverPath(userId, path)) {
    return { ok: false as const, error: "封面路徑不屬於目前帳號" };
  }

  const exists = await assertStorageObjectExists(
    supabase,
    COVERS_BUCKET,
    path,
    "找不到已上傳的封面圖，請重新上傳"
  );
  if (!exists.ok) return exists;

  const claimed = await claimFinalizeMarker(
    supabase,
    COVERS_BUCKET,
    coverFinalizeMarkerPath(path),
    "此封面已被使用或正在提交中，請重新上傳封面"
  );
  if (!claimed.ok) return claimed;

  const { data: publicData } = supabase.storage
    .from(COVERS_BUCKET)
    .getPublicUrl(path);

  return {
    ok: true as const,
    path,
    markerPath: claimed.markerPath,
    publicUrl: publicData.publicUrl,
  };
}

export async function resolveDirectBuildUpload(
  supabase: SupabaseClient,
  input: {
    userId: string;
    buildId: string;
    indexPath: string;
    token: string;
  }
) {
  if (!isUuidLike(input.buildId) || !isUuidLike(input.userId)) {
    return { ok: false as const, error: "建置識別碼無效" };
  }

  const session = verifyDirectUploadSession(input.token, {
    userId: input.userId,
    buildId: input.buildId,
  });
  if (!session.ok) {
    return session;
  }

  const indexPath = normalizeZipPath(input.indexPath);
  if (!indexPath || indexPath.includes("..")) {
    return { ok: false as const, error: "遊戲入口路徑無效" };
  }

  const prefix = buildDirectUploadPrefix(input.userId, input.buildId);
  const indexStoragePath = `${prefix}/${indexPath}`;

  if (!isCreatorOwnedBuildStoragePath(input.userId, indexStoragePath)) {
    return { ok: false as const, error: "建置路徑不屬於目前帳號" };
  }

  const exists = await assertStorageObjectExists(
    supabase,
    FILES_BUCKET,
    indexStoragePath,
    "找不到已直傳的遊戲檔案，請重新上傳壓縮檔"
  );
  if (!exists.ok) return exists;

  const claimed = await claimFinalizeMarker(
    supabase,
    FILES_BUCKET,
    `${prefix}/${DIRECT_BUILD_FINALIZED_MARKER}`,
    "此建置已被使用或正在提交中，請重新上傳壓縮檔"
  );
  if (!claimed.ok) return claimed;

  const { data: publicData } = supabase.storage
    .from(FILES_BUCKET)
    .getPublicUrl(indexStoragePath);

  return {
    ok: true as const,
    prefix,
    indexStoragePath,
    playUrl: publicData.publicUrl,
  };
}
