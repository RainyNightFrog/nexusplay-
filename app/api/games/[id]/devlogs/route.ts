import { NextResponse } from "next/server";
import {
  createGameDevlog,
  listGameDevlogs,
} from "@/lib/devlog-service";
import { sanitizePlainText } from "@/lib/sanitize-plain";
import { sanitizeRichHtml } from "@/lib/sanitize-rich-html";
import {
  MAX_DEVLOG_HTML_LENGTH,
  MAX_DEVLOG_TITLE_LENGTH,
} from "@/lib/devlog-service";
import { createAuthServerClient } from "@/lib/supabase/server-auth";
import { createServerSupabase } from "@/lib/supabase-server";
import {
  checkRateLimit,
  getClientIp,
  rateLimitResponse,
} from "@/lib/rate-limit";

function parseGameId(raw: string) {
  const gameId = Number.parseInt(raw, 10);
  return Number.isNaN(gameId) ? null : gameId;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ip = getClientIp(request);
    const limit = checkRateLimit(`devlogs:get:${ip}`, 120, 60_000);
    if (!limit.allowed) {
      return rateLimitResponse(limit.retryAfterSec);
    }

    const { id } = await params;
    const gameId = parseGameId(id);
    if (!gameId) {
      return NextResponse.json({ error: "無效的遊戲 ID" }, { status: 400 });
    }

    const devlogs = await listGameDevlogs(gameId);
    return NextResponse.json({
      devlogs: devlogs.map((entry) => ({
        id: entry.id,
        title: entry.title,
        contentHtml: entry.contentHtml,
        publishedAt: entry.publishedAt,
        creatorId: entry.creatorId,
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "讀取開發日誌失敗";
    return NextResponse.json({ error: message, devlogs: [] }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ip = getClientIp(request);
    const limit = checkRateLimit(`devlogs:post:${ip}`, 20, 60_000);
    if (!limit.allowed) {
      return rateLimitResponse(limit.retryAfterSec);
    }

    const { id } = await params;
    const gameId = parseGameId(id);
    if (!gameId) {
      return NextResponse.json({ error: "無效的遊戲 ID" }, { status: 400 });
    }

    const authClient = await createAuthServerClient();
    const {
      data: { user },
    } = await authClient.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "請先登入" }, { status: 401 });
    }

    const body = (await request.json()) as {
      title?: string;
      contentHtml?: string;
      content?: string;
    };

    const title = sanitizePlainText(body.title ?? "", MAX_DEVLOG_TITLE_LENGTH);
    const rawHtml = body.contentHtml ?? body.content ?? "";
    const contentHtml = sanitizeRichHtml(rawHtml, MAX_DEVLOG_HTML_LENGTH);

    const entry = await createGameDevlog(
      {
        gameId,
        creatorId: user.id,
        title,
        contentHtml,
      },
      createServerSupabase()
    );

    return NextResponse.json(
      {
        devlog: {
          id: entry.id,
          title: entry.title,
          contentHtml: entry.contentHtml,
          publishedAt: entry.publishedAt,
          creatorId: entry.creatorId,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "發布開發日誌失敗";
    const status =
      message.includes("只有") ||
      message.includes("請輸入") ||
      message.includes("找不到")
        ? 400
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
