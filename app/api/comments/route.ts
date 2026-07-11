import { NextResponse } from "next/server";

/**
 * @deprecated 請改用 `/api/games/[id]/comments`
 * 保留此路由以避免舊版前端或外部連結 404。
 */
export async function GET() {
  return NextResponse.json(
    {
      error: "此路由已停用，請使用 /api/games/{gameId}/comments",
      migration: "/api/games/[id]/comments",
    },
    { status: 410 }
  );
}

export async function POST() {
  return NextResponse.json(
    {
      error: "此路由已停用，請使用 POST /api/games/{gameId}/comments",
      migration: "/api/games/[id]/comments",
    },
    { status: 410 }
  );
}
