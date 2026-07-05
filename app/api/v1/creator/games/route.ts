import { NextResponse } from "next/server";
import { authorizeCreatorApiRequest, listCreatorGamesForUser } from "@/lib/creator-api-auth";
import { uploadCreatorGameFromFormData } from "@/lib/game-upload-service";

export async function GET(request: Request) {
  try {
    const auth = await authorizeCreatorApiRequest(request);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const ownedOnly =
      new URL(request.url).searchParams.get("ownedOnly") === "true";

    const games = await listCreatorGamesForUser(auth.userId, { ownedOnly });

    return NextResponse.json({
      games,
      meta: { count: games.length, auth: auth.via },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "讀取遊戲失敗";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await authorizeCreatorApiRequest(request, { apiKeyOnly: true });
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const contentType = request.headers.get("content-type") ?? "";
    if (!contentType.includes("multipart/form-data")) {
      return NextResponse.json(
        { error: "請使用 multipart/form-data 上傳（欄位同 /api/games/upload）" },
        { status: 415 }
      );
    }

    const formData = await request.formData();
    const result = await uploadCreatorGameFromFormData({
      creatorId: auth.userId,
      formData,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json(
      {
        game: result.game,
        meta: { auth: auth.via },
      },
      { status: 201 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "上傳遊戲失敗";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
