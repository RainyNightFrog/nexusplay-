import type { SupabaseClient } from "@supabase/supabase-js";

export const COVERS_BUCKET = "game-covers";
export const FILES_BUCKET = "game-files";

export function sanitizeFileName(name: string) {
  return name.replace(/[^\w.\-()]/g, "_");
}

export function buildStoragePath(fileName: string) {
  return `${crypto.randomUUID()}-${sanitizeFileName(fileName)}`;
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

  const match = path.match(/^builds\/([^/]+)\//);
  return match ? `builds/${match[1]}` : null;
}

async function listStorageFilesRecursive(
  supabase: SupabaseClient,
  bucket: string,
  prefix: string
): Promise<string[]> {
  const normalizedPrefix = prefix.replace(/\/$/, "");
  const { data, error } = await supabase.storage
    .from(bucket)
    .list(normalizedPrefix, { limit: 1000 });

  if (error || !data) {
    return [];
  }

  const paths: string[] = [];

  for (const item of data) {
    const itemPath = `${normalizedPrefix}/${item.name}`;

    if (item.id === null) {
      paths.push(...(await listStorageFilesRecursive(supabase, bucket, itemPath)));
    } else {
      paths.push(itemPath);
    }
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
