import { NextResponse } from "next/server";
import { extractAndUploadGameBuild } from "@/lib/extract-game-zip";
import { resolveUserRole } from "@/lib/auth-profile";
import { parseMonetizationFromFormData } from "@/lib/game-publish";
import { UPLOAD_CATEGORIES } from "@/lib/games";
import { sanitizePlainText } from "@/lib/sanitize";
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

const COVERS_BUCKET = "game-covers";
const FILES_BUCKET = "game-files";

function sanitizeFileName(name: string) {
  return name.replace(/[^\w.\-()]/g, "_");
}

function buildStoragePath(fileName: string) {
  return `${crypto.randomUUID()}-${sanitizeFileName(fileName)}`;
}

async function uploadBuffer(
  bucket: string,
  fileName: string,
  buffer: ArrayBuffer,
  contentType: string
) {
  const supabase = createServerSupabase();
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

export async function POST(request: Request) {
  try {
    const authClient = await createAuthServerClient();
    const {
      data: { user },
    } = await authClient.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "請先登入" }, { status: 401 });
    }

    const role = await resolveUserRole(authClient, user);

    if (role !== "creator") {
      return NextResponse.json(
        { error: "需要創作者身分才能上傳遊戲" },
        { status: 403 }
      );
    }

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
    const coverFile = formData.get("cover");
    const gameZipFile = formData.get("gameZip");

    if (!title) {
      return NextResponse.json({ error: "請輸入遊戲名稱" }, { status: 400 });
    }
    if (!description) {
      return NextResponse.json({ error: "請輸入遊戲簡介" }, { status: 400 });
    }
    if (!category) {
      return NextResponse.json({ error: "請選擇遊戲分類" }, { status: 400 });
    }
    if (!(UPLOAD_CATEGORIES as readonly string[]).includes(category)) {
      return NextResponse.json({ error: "無效的遊戲分類" }, { status: 400 });
    }
    if (!(coverFile instanceof File)) {
      return NextResponse.json({ error: "請上傳遊戲封面圖" }, { status: 400 });
    }
    if (!(gameZipFile instanceof File)) {
      return NextResponse.json({ error: "請上傳遊戲壓縮檔" }, { status: 400 });
    }

    const validCoverTypes = ["image/png", "image/jpeg", "image/jpg"];
    if (!validCoverTypes.includes(coverFile.type)) {
      return NextResponse.json(
        { error: "封面圖僅支援 .png、.jpg 格式" },
        { status: 400 }
      );
    }
    if (!gameZipFile.name.toLowerCase().endsWith(".zip")) {
      return NextResponse.json(
        { error: "遊戲檔案僅支援 .zip 壓縮檔" },
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
    if (gameZipFile.size > MAX_ZIP_BYTES) {
      return NextResponse.json(
        {
          error: `遊戲 zip 不可超過 ${formatMaxSize(MAX_ZIP_BYTES)}（目前 ${formatMaxSize(gameZipFile.size)}）`,
        },
        { status: 400 }
      );
    }

    const monetization = parseMonetizationFromFormData(formData);
    if (!monetization.ok) {
      return NextResponse.json({ error: monetization.error }, { status: 400 });
    }

    const supabase = createServerSupabase();
    let coverPath: string | null = null;
    let buildPaths: string[] = [];

    try {
      const coverBuffer = await coverFile.arrayBuffer();
      const coverUpload = await uploadBuffer(
        COVERS_BUCKET,
        coverFile.name,
        coverBuffer,
        coverFile.type || "image/jpeg"
      );
      coverPath = coverUpload.path;

      const zipBuffer = await gameZipFile.arrayBuffer();
      const buildUpload = await extractAndUploadGameBuild(supabase, zipBuffer);
      buildPaths = buildUpload.uploadedPaths;

      // creator_id 必須由伺服器從 session 寫入，不可由前端 FormData 傳入
      const { data, error } = await supabase
        .from("games")
        .insert({
          title,
          description,
          category,
          cover_url: coverUpload.publicUrl,
          game_url: buildUpload.playUrl,
          creator_id: user.id,
          publish_status: monetization.data.publish_status,
          tips_enabled: monetization.data.tips_enabled,
          suggested_tip_amount: monetization.data.suggested_tip_amount,
        })
        .select()
        .single();

      if (error) {
        throw new Error(`資料庫寫入失敗：${error.message}`);
      }

      return NextResponse.json({ game: data });
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
      throw error;
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "上傳過程發生未知錯誤";

    if (
      message.includes("fetch failed") ||
      message.includes("Failed to fetch") ||
      message.includes("ENOTFOUND") ||
      message.includes("getaddrinfo")
    ) {
      return NextResponse.json(
        {
          error:
            "無法連線 Supabase：Project URL 可能錯誤或專案 DNS 尚未生效。請到 Supabase → Settings → Data API 複製「Project URL」，貼到 .env.local 後重啟。也可開啟 /api/supabase/health 查看診斷。",
        },
        { status: 502 }
      );
    }

    if (message.includes("maximum allowed size")) {
      return NextResponse.json(
        {
          error: `檔案超過 Supabase 大小上限（Free 方案單檔最大 50 MB）。請壓縮 zip 後再試，或升級 Pro 方案提高上限。`,
        },
        { status: 413 }
      );
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
