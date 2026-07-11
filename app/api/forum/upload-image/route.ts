import { NextResponse } from "next/server";
import { isValidGalleryImage } from "@/lib/game-page-content";
import { COVERS_BUCKET, uploadBuffer } from "@/lib/game-storage";
import { createAuthServerClient } from "@/lib/supabase/server-auth";
import { formatMaxSize, MAX_COVER_BYTES } from "@/lib/upload-limits";

const MAX_FORUM_IMAGES = 4;

export async function POST(request: Request) {
  try {
    const authClient = await createAuthServerClient();
    const {
      data: { user },
    } = await authClient.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "請先登入才能上傳圖片" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "請選擇圖片檔案" }, { status: 400 });
    }

    if (!isValidGalleryImage(file)) {
      return NextResponse.json(
        { error: "圖片僅支援 .png、.jpg、.webp 格式" },
        { status: 400 }
      );
    }

    if (file.size > MAX_COVER_BYTES) {
      return NextResponse.json(
        {
          error: `單張圖片不可超過 ${formatMaxSize(MAX_COVER_BYTES)}（目前 ${formatMaxSize(file.size)}）`,
        },
        { status: 400 }
      );
    }

    const buffer = await file.arrayBuffer();
    const upload = await uploadBuffer(
      authClient,
      COVERS_BUCKET,
      `forum-${file.name}`,
      buffer,
      file.type || "image/jpeg"
    );

    return NextResponse.json({
      url: upload.publicUrl,
      maxImages: MAX_FORUM_IMAGES,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "圖片上傳失敗";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
