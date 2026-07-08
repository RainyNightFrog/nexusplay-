"use client";

import { useEffect, useMemo } from "react";
import { useTranslations } from "next-intl";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import {
  Bold,
  Code,
  Heading2,
  Heading3,
  Italic,
  Link2,
  List,
  ListOrdered,
  Minus,
  Quote,
  Redo2,
  Strikethrough,
  Underline as UnderlineIcon,
  Undo2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { GameDetailsEmojiPicker } from "@/components/dashboard/game-details-emoji-picker";
import { MAX_DETAILS_HTML_LENGTH } from "@/lib/game-metadata";
import { cn } from "@/lib/utils";

type GameRichTextEditorProps = {
  value: string;
  onChange: (html: string) => void;
  disabled?: boolean;
  placeholder?: string;
  showTitle?: boolean;
};

function ToolbarButton({
  active,
  onClick,
  disabled,
  children,
  label,
}: {
  active?: boolean;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
  label: string;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      disabled={disabled}
      aria-label={label}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className={cn(
        "size-8 text-zinc-400 hover:text-white",
        active && "bg-cyan-500/15 text-cyan-300"
      )}
    >
      {children}
    </Button>
  );
}

function ToolbarDivider() {
  return <span className="mx-0.5 h-5 w-px bg-white/10" aria-hidden="true" />;
}

export function GameRichTextEditor({
  value,
  onChange,
  disabled,
  placeholder,
  showTitle = true,
}: GameRichTextEditorProps) {
  const t = useTranslations("dashboard");
  const resolvedPlaceholder = placeholder ?? t("richTextPlaceholder");

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        autolink: true,
        defaultProtocol: "https",
        HTMLAttributes: {
          target: "_blank",
          rel: "noopener noreferrer",
        },
      }),
      Placeholder.configure({
        placeholder: resolvedPlaceholder,
        emptyEditorClass: "is-editor-empty",
      }),
    ],
    content: value || "",
    editable: !disabled,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          "game-details-content prose prose-invert prose-sm max-w-none min-h-[220px] px-4 py-3 text-zinc-100 focus:outline-none [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-white [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-white [&_p]:text-zinc-300 [&_a]:text-cyan-400 [&_a]:underline [&_code]:rounded [&_code]:bg-white/10 [&_code]:px-1 [&_code]:py-0.5 [&_pre]:rounded-xl [&_pre]:bg-black/40 [&_pre]:p-3 [&_blockquote]:border-l-cyan-400/50 [&_blockquote]:text-zinc-400",
      },
    },
    onUpdate: ({ editor: currentEditor }) => {
      onChange(currentEditor.getHTML());
    },
  });

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(!disabled);
  }, [disabled, editor]);

  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    if (value !== current && value !== (current === "<p></p>" ? "" : current)) {
      editor.commands.setContent(value || "", { emitUpdate: false });
    }
  }, [editor, value]);

  const stats = useMemo(() => {
    const textLength = editor?.getText().length ?? 0;
    const htmlLength = value.length;
    return { textLength, htmlLength };
  }, [editor, value]);

  const setLink = () => {
    if (!editor) return;

    const previousUrl = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt(t("richTextLinkPrompt"), previousUrl ?? "https://");

    if (url === null) return;

    if (url.trim() === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }

    editor
      .chain()
      .focus()
      .extendMarkRange("link")
      .setLink({ href: url.trim() })
      .run();
  };

  const insertEmoji = (emoji: string) => {
    editor?.chain().focus().insertContent(emoji).run();
  };

  return (
    <div className="space-y-2">
      <div className="space-y-1 text-center">
        {showTitle && (
          <p className="text-sm font-medium text-zinc-200">
            {t("metadataSectionAbout")}
          </p>
        )}
        <p className="text-xs text-zinc-500">{t("richTextDesc")}</p>
      </div>

      <div
        className={cn(
          "overflow-hidden rounded-2xl border border-white/10 bg-[#0d0d0f] transition-all duration-500",
          "focus-within:border-cyan-400/40 focus-within:shadow-[0_0_32px_rgba(34,211,238,0.18)]",
          "focus-within:ring-2 focus-within:ring-cyan-500/15"
        )}
      >
        <div className="flex flex-wrap items-center justify-center gap-0.5 border-b border-white/8 bg-zinc-950/80 px-2 py-1.5">
          <ToolbarButton
            label={t("richTextUndo")}
            disabled={disabled || !editor || !editor.can().undo()}
            onClick={() => editor?.chain().focus().undo().run()}
          >
            <Undo2 className="size-3.5" />
          </ToolbarButton>
          <ToolbarButton
            label={t("richTextRedo")}
            disabled={disabled || !editor || !editor.can().redo()}
            onClick={() => editor?.chain().focus().redo().run()}
          >
            <Redo2 className="size-3.5" />
          </ToolbarButton>

          <ToolbarDivider />

          <ToolbarButton
            label={t("richTextBold")}
            disabled={disabled || !editor}
            active={editor?.isActive("bold")}
            onClick={() => editor?.chain().focus().toggleBold().run()}
          >
            <Bold className="size-3.5" />
          </ToolbarButton>
          <ToolbarButton
            label={t("richTextItalic")}
            disabled={disabled || !editor}
            active={editor?.isActive("italic")}
            onClick={() => editor?.chain().focus().toggleItalic().run()}
          >
            <Italic className="size-3.5" />
          </ToolbarButton>
          <ToolbarButton
            label={t("richTextUnderline")}
            disabled={disabled || !editor}
            active={editor?.isActive("underline")}
            onClick={() => editor?.chain().focus().toggleUnderline().run()}
          >
            <UnderlineIcon className="size-3.5" />
          </ToolbarButton>
          <ToolbarButton
            label={t("richTextStrike")}
            disabled={disabled || !editor}
            active={editor?.isActive("strike")}
            onClick={() => editor?.chain().focus().toggleStrike().run()}
          >
            <Strikethrough className="size-3.5" />
          </ToolbarButton>
          <ToolbarButton
            label={t("richTextInlineCode")}
            disabled={disabled || !editor}
            active={editor?.isActive("code")}
            onClick={() => editor?.chain().focus().toggleCode().run()}
          >
            <Code className="size-3.5" />
          </ToolbarButton>

          <ToolbarDivider />

          <ToolbarButton
            label={t("richTextHeading2")}
            disabled={disabled || !editor}
            active={editor?.isActive("heading", { level: 2 })}
            onClick={() =>
              editor?.chain().focus().toggleHeading({ level: 2 }).run()
            }
          >
            <Heading2 className="size-3.5" />
          </ToolbarButton>
          <ToolbarButton
            label={t("richTextHeading3")}
            disabled={disabled || !editor}
            active={editor?.isActive("heading", { level: 3 })}
            onClick={() =>
              editor?.chain().focus().toggleHeading({ level: 3 }).run()
            }
          >
            <Heading3 className="size-3.5" />
          </ToolbarButton>
          <ToolbarButton
            label={t("richTextBulletList")}
            disabled={disabled || !editor}
            active={editor?.isActive("bulletList")}
            onClick={() => editor?.chain().focus().toggleBulletList().run()}
          >
            <List className="size-3.5" />
          </ToolbarButton>
          <ToolbarButton
            label={t("richTextOrderedList")}
            disabled={disabled || !editor}
            active={editor?.isActive("orderedList")}
            onClick={() => editor?.chain().focus().toggleOrderedList().run()}
          >
            <ListOrdered className="size-3.5" />
          </ToolbarButton>
          <ToolbarButton
            label={t("richTextQuote")}
            disabled={disabled || !editor}
            active={editor?.isActive("blockquote")}
            onClick={() => editor?.chain().focus().toggleBlockquote().run()}
          >
            <Quote className="size-3.5" />
          </ToolbarButton>
          <ToolbarButton
            label={t("richTextHorizontalRule")}
            disabled={disabled || !editor}
            onClick={() => editor?.chain().focus().setHorizontalRule().run()}
          >
            <Minus className="size-3.5" />
          </ToolbarButton>

          <ToolbarDivider />

          <ToolbarButton
            label={t("richTextLink")}
            disabled={disabled || !editor}
            active={editor?.isActive("link")}
            onClick={setLink}
          >
            <Link2 className="size-3.5" />
          </ToolbarButton>
          <GameDetailsEmojiPicker
            disabled={disabled || !editor}
            onPick={insertEmoji}
          />
        </div>

        <EditorContent editor={editor} />

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/8 bg-zinc-950/60 px-3 py-2 text-[11px] text-zinc-500">
          <span>{t("richTextCharCount", { count: stats.textLength })}</span>
          <span>
            {t("richTextHtmlSize", {
              current: stats.htmlLength.toLocaleString(),
              max: MAX_DETAILS_HTML_LENGTH.toLocaleString(),
            })}
          </span>
        </div>
      </div>
    </div>
  );
}
