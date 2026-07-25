import type { SupabaseClient } from "@supabase/supabase-js";

export const COVERS_BUCKET = "game-covers";
export const FILES_BUCKET = "game-files";

export function sanitizeFileName(name: string) {
  return name.replace(/[^\w.\-()]/g, "_");
}

export function buildStoragePath(fileName: string) {
  return `${crypto.randomUUID()}-${sanitizeFileName(fileName)}`;
}

/** 瀏覽器直傳封面：covers/{userId}/{uuid}-name */
export function buildCreatorCoverPath(userId: string, fileName: string) {
  return `covers/${userId}/${crypto.randomUUID()}-${sanitizeFileName(fileName)}`;
}

export function isCreatorOwnedCoverPath(userId: string, path: string) {
  const normalized = path.replace(/^\/+/, "");
  return normalized.startsWith(`covers/${userId}/`);
}

export async function removeStoragePrefix(
  supabase: SupabaseClient,
  bucket: string,
  prefix: string
) {
  const normalized = prefix.replace(/\/$/, "");
  if (!normalized) return;
  const paths = await listStorageFilesRecursive(supabase, bucket, normalized);
  await removeStoragePaths(supabase, bucket, paths);
}

export function extractPublicStoragePath(publicUrl: string, bucket: string) {
  const marker = `/storage/v1/object/public/${bucket}/`;
  const index = publicUrl.indexOf(marker);
  if (index === -1) return null;
  return decodeURIComponent(publicUrl.slice(index + marker.length));
}

export function extractBuildPrefixFromPlayUrl(playUrl: string) {
  const path = extractPublicStoragePath(playUrl, FILES_BUCKET);
  if (!path) return null;

  const parts = path.split("/").filter(Boolean);
  if (parts[0] !== "builds" || parts.length < 2) return null;

  const uuidRe =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  // 新格式：builds/{userId}/{buildId}/...
  if (parts.length >= 3 && uuidRe.test(parts[1]) && uuidRe.test(parts[2])) {
    return `builds/${parts[1]}/${parts[2]}`;
  }

  // 舊格式：builds/{buildId}/...
  if (uuidRe.test(parts[1])) {
    return `builds/${parts[1]}`;
  }

  return null;
}

async function listStorageFilesRecursive(
  supabase: SupabaseClient,
  bucket: string,
  prefix: string
): Promise<string[]> {
  const normalizedPrefix = prefix.replace(/\/$/, "");
  const paths: string[] = [];
  const pageSize = 1000;
  let offset = 0;

  while (true) {
    const { data, error } = await supabase.storage
      .from(bucket)
      .list(normalizedPrefix, { limit: pageSize, offset });

    if (error || !data || data.length === 0) {
      break;
    }

    for (const item of data) {
      const itemPath = `${normalizedPrefix}/${item.name}`;

      if (item.id === null) {
        paths.push(
          ...(await listStorageFilesRecursive(supabase, bucket, itemPath))
        );
      } else {
        paths.push(itemPath);
      }
    }

    if (data.length < pageSize) {
      break;
    }
    offset += pageSize;
  }

  return paths;
}

export async function removeStoragePaths(
  supabase: SupabaseClient,
  bucket: string,
  paths: string[]
) {
  if (paths.length === 0) return;

  const chunkSize = 100;
  for (let index = 0; index < paths.length; index += chunkSize) {
    const chunk = paths.slice(index, index + chunkSize);
    await supabase.storage.from(bucket).remove(chunk).catch(() => undefined);
  }
}

export async function removeBuildFolder(
  supabase: SupabaseClient,
  playUrl: string
) {
  const buildPrefix = extractBuildPrefixFromPlayUrl(playUrl);
  if (!buildPrefix) return;

  const paths = await listStorageFilesRecursive(
    supabase,
    FILES_BUCKET,
    buildPrefix
  );
  await removeStoragePaths(supabase, FILES_BUCKET, paths);
}

export async function uploadBuffer(
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
