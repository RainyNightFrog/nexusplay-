import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { writeAdminLog } from "@/lib/admin-service";
import { listAdminAccounts, setAdminFlag } from "@/lib/admin-users-service";

export async function GET() {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const admins = await listAdminAccounts();
    return NextResponse.json({ admins });
  } catch (error) {
    const message = error instanceof Error ? error.message : "讀取管理員列表失敗";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const body = (await request.json()) as {
      email?: string;
      userId?: string;
    };

    if (!body.email?.trim() && !body.userId?.trim()) {
      return NextResponse.json({ error: "請提供 email 或 userId" }, { status: 400 });
    }

    const { createServerSupabase } = await import("@/lib/supabase-server");
    const supabase = createServerSupabase();

    let userId = body.userId?.trim() ?? "";
    if (!userId && body.email) {
      let page = 1;
      const target = body.email.trim().toLowerCase();
      while (true) {
        const { data, error } = await supabase.auth.admin.listUsers({
          page,
          perPage: 200,
        });
        if (error) throw error;
        const match = (data.users ?? []).find(
          (user) => user.email?.toLowerCase() === target
        );
        if (match) {
          userId = match.id;
          break;
        }
        if ((data.users?.length ?? 0) < 200) break;
        page += 1;
      }
    }

    if (!userId) {
      return NextResponse.json({ error: "找不到此用戶" }, { status: 404 });
    }

    const result = await setAdminFlag({
      userId,
      isAdmin: true,
      actorEmail: body.email ?? null,
    });

    await writeAdminLog(
      auth.supabase!,
      auth.user!.id,
      "grant_admin",
      `user=${userId} email=${result.email ?? ""}`
    );

    return NextResponse.json({ admin: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "指派管理員失敗";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const userId = new URL(request.url).searchParams.get("userId")?.trim();
    if (!userId) {
      return NextResponse.json({ error: "缺少 userId" }, { status: 400 });
    }

    if (userId === auth.user!.id) {
      return NextResponse.json({ error: "不能撤銷自己的管理員權限" }, { status: 400 });
    }

    const result = await setAdminFlag({ userId, isAdmin: false });

    await writeAdminLog(
      auth.supabase!,
      auth.user!.id,
      "revoke_admin",
      `user=${userId}`
    );

    return NextResponse.json({ admin: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "撤銷管理員失敗";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
