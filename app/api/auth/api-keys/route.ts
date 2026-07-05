import { NextResponse } from "next/server";
import { resolveUserRole, hasCreatorDashboardAccess } from "@/lib/auth-profile";
import {
  createUserApiKey,
  listUserApiKeys,
  revokeUserApiKey,
} from "@/lib/api-key-service";
import { createAuthServerClient } from "@/lib/supabase/server-auth";

async function authorizeCreator() {
  const authClient = await createAuthServerClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  if (!user) {
    return { error: NextResponse.json({ error: "請先登入" }, { status: 401 }) };
  }

  const role = await resolveUserRole(authClient, user);
  if (!hasCreatorDashboardAccess(user, role)) {
    return {
      error: NextResponse.json({ error: "需要創作者身分" }, { status: 403 }),
    };
  }

  return { user };
}

export async function GET() {
  try {
    const auth = await authorizeCreator();
    if ("error" in auth && auth.error) return auth.error;

    const keys = await listUserApiKeys(auth.user!.id);
    return NextResponse.json({ keys });
  } catch (error) {
    const message = error instanceof Error ? error.message : "讀取 API 金鑰失敗";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await authorizeCreator();
    if ("error" in auth && auth.error) return auth.error;

    const body = (await request.json()) as { name?: string };
    const created = await createUserApiKey(auth.user!.id, body.name ?? "");

    return NextResponse.json({
      key: {
        id: created.id,
        name: created.name,
        key_prefix: created.key_prefix,
        secret: created.secret,
        created_at: created.created_at,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "建立 API 金鑰失敗";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const auth = await authorizeCreator();
    if ("error" in auth && auth.error) return auth.error;

    const keyId = new URL(request.url).searchParams.get("id");
    if (!keyId) {
      return NextResponse.json({ error: "缺少 id" }, { status: 400 });
    }

    await revokeUserApiKey(auth.user!.id, keyId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "撤銷 API 金鑰失敗";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
