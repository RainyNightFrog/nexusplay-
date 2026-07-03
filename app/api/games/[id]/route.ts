import { NextResponse } from "next/server";
import { getGameById } from "@/lib/games-service";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const numericId = Number.parseInt(id, 10);

    if (Number.isNaN(numericId)) {
      return NextResponse.json({ error: "無效的遊戲 ID" }, { status: 400 });
    }

    const game = await getGameById(numericId);

    if (!game) {
      return NextResponse.json({ error: "找不到此遊戲" }, { status: 404 });
    }

    return NextResponse.json({ game });
  } catch (error) {
    const message = error instanceof Error ? error.message : "讀取遊戲失敗";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
