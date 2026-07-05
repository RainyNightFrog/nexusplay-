import { NextResponse } from "next/server";
import {
  billingAddressFromRow,
  hasBillingAddress,
  sanitizeBillingInput,
  type BillingAddress,
} from "@/lib/billing-address";
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

    const supabase = createServerSupabase();
    const { data, error } = await supabase
      .from("profiles")
      .select(
        "billing_name, billing_line1, billing_line2, billing_city, billing_region, billing_postal, billing_country"
      )
      .eq("id", user.id)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    const billing = data
      ? billingAddressFromRow(data as Record<string, unknown>)
      : sanitizeBillingInput({});

    return NextResponse.json({
      billing,
      complete: hasBillingAddress(billing),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "讀取帳單地址失敗";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const authClient = await createAuthServerClient();
    const {
      data: { user },
    } = await authClient.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "請先登入" }, { status: 401 });
    }

    const body = (await request.json()) as Partial<BillingAddress>;
    const billing = sanitizeBillingInput(body);

    const supabase = createServerSupabase();
    const { error } = await supabase
      .from("profiles")
      .update(billing)
      .eq("id", user.id);

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({
      billing,
      complete: hasBillingAddress(billing),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "儲存帳單地址失敗";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
