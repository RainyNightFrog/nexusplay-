import { NextResponse } from "next/server";
import {
  PRODUCTION_SITE_URL,
  mergeAuthRedirectAllowList,
} from "@/lib/auth-redirect-urls";

const PROJECT_REF = "icydkixwynxizrgfzelq";

type SupabaseAuthConfig = {
  message?: string;
  site_url?: string;
  uri_allow_list?: string;
};

async function getAuthConfig(accessToken: string) {
  const response = await fetch(
    `https://api.supabase.com/v1/projects/${PROJECT_REF}/config/auth`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  const text = await response.text();
  const data = JSON.parse(text) as SupabaseAuthConfig;
  if (!response.ok) {
    throw new Error(data.message ?? `Supabase API ${response.status}`);
  }
  return data;
}

async function patchAuthConfig(
  accessToken: string,
  body: Record<string, unknown>
) {
  const response = await fetch(
    `https://api.supabase.com/v1/projects/${PROJECT_REF}/config/auth`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }
  );
  const text = await response.text();
  const data = JSON.parse(text) as { message?: string };
  if (!response.ok) {
    throw new Error(data.message ?? `Supabase API ${response.status}`);
  }
  return data;
}

export async function patchSupabaseAuthUrls(
  accessToken: string,
  siteUrl = PRODUCTION_SITE_URL
) {
  const current = await getAuthConfig(accessToken);
  const uriAllowList = mergeAuthRedirectAllowList(
    current.uri_allow_list,
    siteUrl
  );

  await patchAuthConfig(accessToken, {
    site_url: siteUrl,
    uri_allow_list: uriAllowList,
  });

  return getAuthConfig(accessToken);
}

export async function POST(request: Request) {
  const cronSecret = process.env.CRON_SECRET?.trim();
  const authHeader = request.headers.get("authorization");
  const bearer = authHeader?.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length).trim()
    : "";

  if (!cronSecret || bearer !== cronSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      accessToken?: string;
      siteUrl?: string;
    };

    const accessToken =
      body.accessToken?.trim() ?? process.env.SUPABASE_ACCESS_TOKEN?.trim();

    if (!accessToken) {
      return NextResponse.json(
        { error: "Missing Supabase access token" },
        { status: 400 }
      );
    }

    const siteUrl = body.siteUrl?.trim() || PRODUCTION_SITE_URL;
    const updated = await patchSupabaseAuthUrls(accessToken, siteUrl);

    return NextResponse.json({
      ok: true,
      siteUrl: updated.site_url,
      redirectUrls: updated.uri_allow_list,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Patch failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
