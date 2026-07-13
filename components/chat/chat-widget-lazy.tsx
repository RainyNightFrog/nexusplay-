"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { deferClientTask } from "@/lib/defer-client";

const ChatWidget = dynamic(
  () =>
    import("@/components/chat/chat-widget").then((module) => ({
      default: module.ChatWidget,
    })),
  { ssr: false, loading: () => null }
);

export function ChatWidgetLazy() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    return deferClientTask(() => setReady(true));
  }, []);

  if (!ready) return null;
  return <ChatWidget />;
}
