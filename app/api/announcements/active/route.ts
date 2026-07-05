import { NextResponse } from "next/server";
import { getActivePlatformAnnouncements } from "@/lib/platform-announcements";

export async function GET() {
  try {
    const announcements = await getActivePlatformAnnouncements();
    return NextResponse.json({ announcements });
  } catch (error) {
    const message = error instanceof Error ? error.message : "讀取公告失敗";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
