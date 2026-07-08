import { NextResponse } from "next/server";
import { listVirtualContacts } from "@/lib/virtual-dm-service";
import { createAuthServerClient } from "@/lib/supabase/server-auth";
import { createServerSupabase } from "@/lib/supabase-server";

export async function GET() {
  try {
    const authClient = await createAuthServerClient();
    const {
      data: { user },
    } = await authClient.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "請先登入" }, { status: 401 });
    }

    const contacts = await listVirtualContacts(createServerSupabase(), user.id);
    return NextResponse.json({ contacts });
  } catch (error) {
    const message = error instanceof Error ? error.message : "讀取通訊錄失敗";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
