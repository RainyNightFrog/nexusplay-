import { NextResponse } from "next/server";
import { authorizeCreatorApiRequest } from "@/lib/creator-api-auth";
import {
  deleteCreatorGameForUser,
  patchCreatorGameJson,
  type CreatorGameJsonPatch,
} from "@/lib/creator-game-api-service";

type RouteParams = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const auth = await authorizeCreatorApiRequest(request, { apiKeyOnly: true });
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { id } = await params;
    const gameId = Number.parseInt(id, 10);
    if (Number.isNaN(gameId)) {
      return NextResponse.json({ error: "無效的遊戲 ID" }, { status: 400 });
    }

    const body = (await request.json()) as CreatorGameJsonPatch;
    const result = await patchCreatorGameJson({
      creatorId: auth.userId,
      gameId,
      patch: body,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({ game: result.game, meta: { auth: auth.via } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "更新遊戲失敗";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  try {
    const auth = await authorizeCreatorApiRequest(_request, { apiKeyOnly: true });
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { id } = await params;
    const gameId = Number.parseInt(id, 10);
    if (Number.isNaN(gameId)) {
      return NextResponse.json({ error: "無效的遊戲 ID" }, { status: 400 });
    }

    const result = await deleteCreatorGameForUser({
      creatorId: auth.userId,
      gameId,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({ ok: true, id: gameId, meta: { auth: auth.via } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "刪除遊戲失敗";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
