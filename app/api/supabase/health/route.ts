import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";

export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const hasPublishable = Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const hasSecret = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);

  let dnsOk = false;
  let dnsError = "";

  try {
    await fetch(`${url}/rest/v1/`, {
      method: "HEAD",
      headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "" },
    });
    dnsOk = true;
  } catch (error) {
    dnsError =
      error instanceof Error
        ? error.cause?.toString() ?? error.message
        : "未知錯誤";
    if (dnsError.includes("ENOTFOUND") || dnsError.includes("getaddrinfo")) {
      dnsError = "DNS 無法解析此 Project URL（網域不存在）";
    }
  }

  let dbOk = false;
  let dbError = "";

  if (dnsOk) {
    try {
      const supabase = createServerSupabase();
      const { error } = await supabase.from("games").select("id").limit(1);
      if (error) {
        dbError = error.message;
      } else {
        dbOk = true;
      }
    } catch (error) {
      dbError = error instanceof Error ? error.message : "資料庫連線失敗";
    }
  }

  return NextResponse.json({
    url,
    hasPublishable,
    hasSecret,
    dnsOk,
    dnsError,
    dbOk,
    dbError,
  });
}
