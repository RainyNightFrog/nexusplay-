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
        "Cache-Control": "public, max-age=10, stale-while-revalidate=20",
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "讀取平台支持者失敗";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
