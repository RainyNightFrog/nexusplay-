import { createTranslator } from "use-intl/core";
import de from "@/messages/de.json";
import en from "@/messages/en.json";
import es from "@/messages/es.json";
import fr from "@/messages/fr.json";
import ja from "@/messages/ja.json";
import ko from "@/messages/ko.json";
import pt from "@/messages/pt.json";
import th from "@/messages/th.json";
import vi from "@/messages/vi.json";
import zhCN from "@/messages/zh-CN.json";
import zhHK from "@/messages/zh-HK.json";
import { defaultLocale, locales, type AppLocale } from "@/i18n/routing";

const messageCatalogs = {
  "zh-HK": zhHK,
  "zh-CN": zhCN,
  en,
  ja,
  ko,
  es,
  fr,
  de,
  pt,
  th,
  vi,
} as const;

export type ForumDigestEmailCopy = {
  subject: string;
  title: string;
  periodLabel: string;
  viewDiscussion: string;
  emptyPosts: string;
  unsubscribeLink: string;
};

export function normalizeAppLocale(value: string | null | undefined): AppLocale {
  if (value && (locales as readonly string[]).includes(value)) {
    return value as AppLocale;
  }
  return defaultLocale;
}

export function resolveForumDigestEmailCopy(locale: AppLocale): ForumDigestEmailCopy {
  const messages = messageCatalogs[locale] ?? messageCatalogs[defaultLocale];
  const t = createTranslator({
    locale,
    messages,
    namespace: "forumDigestEmail",
  });

  return {
    subject: t("subject"),
    title: t("title"),
    periodLabel: t("periodLabel"),
    viewDiscussion: t("viewDiscussion"),
    emptyPosts: t("emptyPosts"),
    unsubscribeLink: t("unsubscribeLink"),
  };
}
