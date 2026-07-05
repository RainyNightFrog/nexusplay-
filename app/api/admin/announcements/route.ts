import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { writeAdminLog } from "@/lib/admin-service";
import {
  createPlatformAnnouncement,
  deactivatePlatformAnnouncement,
  listAllPlatformAnnouncements,
} from "@/lib/platform-announcements";

export async function GET() {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const announcements = await listAllPlatformAnnouncements();
    return NextResponse.json({
      announcements: announcements.map((row) => ({
        id: row.id,
        message: row.message,
        href: row.href,
        severity: row.severity,
        active: row.active,
        createdAt: row.created_at,
        startsAt: row.starts_at,
        endsAt: row.ends_at,
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "讀取公告失敗";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const body = (await request.json()) as {
      message?: string;
      href?: string;
      severity?: "info" | "warning" | "success";
      startsAt?: string;
      endsAt?: string;
    };

    if (!body.message?.trim()) {
      return NextResponse.json({ error: "請輸入公告內容" }, { status: 400 });
    }

    const announcement = await createPlatformAnnouncement({
      message: body.message,
      href: body.href,
      severity: body.severity,
      startsAt: body.startsAt,
      endsAt: body.endsAt,
    });

    await writeAdminLog(
      auth.supabase!,
      auth.user!.id,
      "create_announcement",
      announcement.id
    );

    return NextResponse.json({ announcement }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "建立公告失敗";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const id = new URL(request.url).searchParams.get("id")?.trim();
    if (!id) {
      return NextResponse.json({ error: "缺少 id" }, { status: 400 });
    }

    await deactivatePlatformAnnouncement(id);
    await writeAdminLog(auth.supabase!, auth.user!.id, "deactivate_announcement", id);

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "停用公告失敗";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
