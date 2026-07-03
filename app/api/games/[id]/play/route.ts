import { NextResponse } from "next/server";
import { incrementGamePlays } from "@/lib/games-service";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const numericId = Number.parseInt(id, 10);

    if (Number.isNaN(numericId)) {
      return NextResponse.json({ error: "無效的遊戲 ID" }, { status: 400 });
    }

    await incrementGamePlays(numericId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "更新遊玩次數失敗";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
