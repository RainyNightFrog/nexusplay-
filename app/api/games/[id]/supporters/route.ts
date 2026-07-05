import { NextResponse } from "next/server";
import { listGameSupporters } from "@/lib/game-supporters-service";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const gameId = Number.parseInt(id, 10);

    if (Number.isNaN(gameId)) {
      return NextResponse.json({ error: "無效的遊戲 ID" }, { status: 400 });
    }

    const supporters = await listGameSupporters(gameId);
    return NextResponse.json({ supporters });
  } catch (error) {
    const message = error instanceof Error ? error.message : "讀取支持者失敗";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
