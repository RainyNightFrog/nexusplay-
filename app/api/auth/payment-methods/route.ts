import { NextResponse } from "next/server";
import { resolveUserProfile } from "@/lib/auth-profile";
import { readCreatorPayoutRow } from "@/lib/creator-payout-service";
import {
  createPaymentMethodSetupIntent,
  detachCustomerPaymentMethod,
} from "@/lib/stripe-customer-service";
import {
  isPaymentsLive,
  isStripeConfigured,
  listCustomerPaymentMethods,
} from "@/lib/stripe-connect";
import { createAuthServerClient } from "@/lib/supabase/server-auth";
import { createServerSupabase } from "@/lib/supabase-server";

async function loadCards(userId: string, email: string | undefined) {
  const stripeConfigured = isStripeConfigured();
  const paymentsLive = isPaymentsLive();
  const serverSupabase = createServerSupabase();
  const row = await readCreatorPayoutRow(serverSupabase, userId);

  const cards: Array<{
    id: string;
    brand: string;
    last4: string;
    expMonth: number;
    expYear: number;
  }> = [];

  if (stripeConfigured && paymentsLive && row?.stripe_customer_id) {
    const methods = await listCustomerPaymentMethods(row.stripe_customer_id);
    for (const method of methods.data) {
      if (method.card) {
        cards.push({
          id: method.id,
          brand: method.card.brand,
          last4: method.card.last4,
          expMonth: method.card.exp_month,
          expYear: method.card.exp_year,
        });
      }
    }
  }

  return { stripeConfigured, paymentsLive, cards };
}

export async function GET() {
  try {
    const authClient = await createAuthServerClient();
    const {
      data: { user },
    } = await authClient.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "請先登入" }, { status: 401 });
    }

    const payload = await loadCards(user.id, user.email);
    return NextResponse.json(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : "讀取付款方式失敗";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST() {
  try {
    const authClient = await createAuthServerClient();
    const {
      data: { user },
    } = await authClient.auth.getUser();

    if (!user?.email) {
      return NextResponse.json({ error: "請先登入" }, { status: 401 });
    }

    const profile = await resolveUserProfile(authClient, user);
    const result = await createPaymentMethodSetupIntent(
      user.id,
      user.email,
      profile.display_name
    );

    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "建立 SetupIntent 失敗";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const authClient = await createAuthServerClient();
    const {
      data: { user },
    } = await authClient.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "請先登入" }, { status: 401 });
    }

    const paymentMethodId = new URL(request.url).searchParams
      .get("paymentMethodId")
      ?.trim();

    if (!paymentMethodId) {
      return NextResponse.json({ error: "缺少 paymentMethodId" }, { status: 400 });
    }

    const result = await detachCustomerPaymentMethod({
      userId: user.id,
      paymentMethodId,
    });

    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    const payload = await loadCards(user.id, user.email);
    return NextResponse.json(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : "移除付款方式失敗";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
