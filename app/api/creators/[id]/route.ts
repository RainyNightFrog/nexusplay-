import { NextResponse } from "next/server";
import { loadPublicCreatorProfile } from "@/lib/creator-public-service";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id?.trim()) {
      return NextResponse.json({ error: "無效的創作者 ID" }, { status: 400 });
    }

    const creator = await loadPublicCreatorProfile(id.trim());
    if (!creator) {
      return NextResponse.json({ error: "找不到創作者或頁面未公開" }, { status: 404 });
    }

    return NextResponse.json({ creator });
  } catch (error) {
    const message = error instanceof Error ? error.message : "讀取創作者失敗";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
