import { NextResponse } from "next/server";
import { listPlatformSupporters } from "@/lib/platform-supporters-service";
import {
  checkRateLimit,
  getClientIp,
  rateLimitResponse,
} from "@/lib/rate-limit";
import { createServerSupabase } from "@/lib/supabase-server";

export async function GET(request: Request) {
  try {
    const ip = getClientIp(request);
    const limit = checkRateLimit(`supporters:get:${ip}`, 60, 60_000);
    if (!limit.allowed) {
      return rateLimitResponse(limit.retryAfterSec);
    }

    const data = await listPlatformSupporters(createServerSupabase());

    return NextResponse.json(data, {
      headers: {
        // 升級支持者後牆面需盡快反映，避免 CDN／瀏覽器長時間快取舊名單
        "Cache-Control": "private, no-store, max-age=0",
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "讀取平台支持者失敗";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
