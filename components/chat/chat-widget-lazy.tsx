"use client";

import dynamic from "next/dynamic";

const ChatWidget = dynamic(
  () =>
    import("@/components/chat/chat-widget").then((module) => ({
      default: module.ChatWidget,
    })),
  { ssr: false, loading: () => null }
);

export function ChatWidgetLazy() {
  return <ChatWidget />;
}
