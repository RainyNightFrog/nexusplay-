import { NextResponse } from "next/server";
import {
  isAllowedWebSubTopic,
  parseWebSubNotificationBody,
  parseWebSubVerificationParams,
} from "@/lib/websub-callback";
import {
  logWebSubNotification,
  markWebSubSubscriptionUnsubscribed,
  markWebSubSubscriptionVerified,
} from "@/lib/websub-subscribe-service";

export async function GET(request: Request) {
  const params = parseWebSubVerificationParams(request);
  if (!params) {
    return NextResponse.json({ error: "Invalid WebSub verification request" }, { status: 400 });
  }

  if (!isAllowedWebSubTopic(params.topic)) {
    return NextResponse.json({ error: "Topic not allowed" }, { status: 403 });
  }

  if (params.mode === "subscribe") {
    try {
      await markWebSubSubscriptionVerified(params.topic, params.leaseSeconds);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Verification failed";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  } else {
    try {
      await markWebSubSubscriptionUnsubscribed(params.topic);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unsubscribe failed";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  return new NextResponse(params.challenge, {
    status: 200,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";
  const body = await request.text();
  const notification = parseWebSubNotificationBody(body);

  if (!notification) {
    return NextResponse.json({ error: "Invalid WebSub notification" }, { status: 400 });
  }

  if (!isAllowedWebSubTopic(notification.topic)) {
    return NextResponse.json({ error: "Topic not allowed" }, { status: 403 });
  }

  try {
    if (notification.kind === "unsubscribe") {
      await markWebSubSubscriptionUnsubscribed(notification.topic);
    } else {
      await logWebSubNotification({
        topicUrl: notification.topic,
        contentType,
      });
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Notification failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
