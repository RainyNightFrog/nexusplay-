import { NextResponse } from "next/server";
import {
  createDirectUploadBuildId,
  signDirectUploadSession,
} from "@/lib/direct-upload-session";
import { resolveUserRole, hasCreatorDashboardAccess } from "@/lib/auth-profile";
import {
  checkRateLimit,
  getClientIp,
  rateLimitResponse,
} from "@/lib/rate-limit";
import { createAuthServerClient } from "@/lib/supabase/server-auth";
import { assertTrustedBrowserOrigin } from "@/lib/request-origin";

export async function POST(request: Request) {
  try {
    const originDenied = assertTrustedBrowserOrigin(request);
    if (originDenied) return originDenied;

    const ip = getClientIp(request);
    const limit = checkRateLimit(`games:upload-session:${ip}`, 20, 60_000);
    if (!limit.allowed) {
      return rateLimitResponse(limit.retryAfterSec);
    }

    const authClient = await createAuthServerClient();
    const {
      data: { user },
    } = await authClient.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "請先登入" }, { status: 401 });
    }

    const role = await resolveUserRole(authClient, user);
    if (!hasCreatorDashboardAccess(user, role)) {
      return NextResponse.json(
        { error: "需要創作者身分才能上傳遊戲" },
        { status: 403 }
      );
    }

    const buildId = createDirectUploadBuildId();
    const session = signDirectUploadSession({
      userId: user.id,
      buildId,
    });

    return NextResponse.json({
      buildId: session.buildId,
      token: session.token,
      exp: session.exp,
      userId: user.id,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "建立上傳工作階段失敗";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
