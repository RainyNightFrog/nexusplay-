"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import {
  Bold,
  ImagePlus,
  Italic,
  List,
  ListOrdered,
  Loader2,
  Strikethrough,
  Underline as UnderlineIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { GameDetailsEmojiPicker } from "@/components/dashboard/game-details-emoji-picker";
import { FORUM_LIMITS } from "@/lib/forum";
import { cn } from "@/lib/utils";

type ForumRichTextEditorProps = {
  value: string;
  onChange: (html: string) => void;
  disabled?: boolean;
  placeholder?: string;
  id?: string;
  maxLength?: number;
  minHeightClass?: string;
  onUploadError?: (message: string) => void;
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
        active && "bg-violet-500/15 text-violet-300"
      )}
    >
      {children}
    </Button>
  );
}

function ToolbarDivider() {
  return <span className="mx-0.5 h-5 w-px bg-white/10" aria-hidden="true" />;
}

export function ForumRichTextEditor({
  value,
  onChange,
  disabled,
  placeholder,
  id,
  maxLength = FORUM_LIMITS.content,
  minHeightClass = "min-h-[160px]",
  onUploadError,
}: ForumRichTextEditorProps) {
  const t = useTranslations("forum");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const resolvedPlaceholder = placeholder ?? t("contentPlaceholder");

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        codeBlock: false,
        blockquote: false,
        horizontalRule: false,
      }),
      Underline,
      Image.configure({
        HTMLAttributes: {
          class: "forum-inline-image",
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
        ...(id ? { id } : {}),
        class:
          `game-details-content forum-editor prose prose-invert prose-sm max-w-none ${minHeightClass} px-4 py-3 text-center text-zinc-100 focus:outline-none [&_p]:text-zinc-300 [&_strong]:text-white [&_em]:text-zinc-200`,
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

  const insertEmoji = (emoji: string) => {
    editor?.chain().focus().insertContent(emoji).run();
  };

  const handleImageSelect = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !editor) return;

    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/forum/upload-image", {
        method: "POST",
        body: formData,
      });
      const data = (await response.json()) as { url?: string; error?: string };

      if (!response.ok || !data.url) {
        throw new Error(data.error ?? t("imageUploadFailed"));
      }

      editor.chain().focus().setImage({ src: data.url, alt: "" }).run();
    } catch (error) {
      onUploadError?.(
        error instanceof Error ? error.message : t("imageUploadFailed")
      );
    } finally {
      setUploadingImage(false);
    }
  };

  const overLimit = stats.htmlLength > maxLength;

  return (
    <div className="mx-auto w-full space-y-2 text-center">
      <div
        className={cn(
          "overflow-hidden rounded-2xl border border-white/10 bg-[#0d0d0f] transition-all duration-300",
          "focus-within:border-violet-400/40 focus-within:shadow-[0_0_24px_rgba(167,139,250,0.15)]",
          "focus-within:ring-2 focus-within:ring-violet-500/15"
        )}
      >
        <div className="flex flex-wrap items-center justify-center gap-0.5 border-b border-white/8 bg-zinc-950/80 px-2 py-1.5">
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

          <ToolbarDivider />

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

          <ToolbarDivider />

          <GameDetailsEmojiPicker
            disabled={disabled || !editor}
            onPick={insertEmoji}
          />
          <ToolbarButton
            label={t("insertImage")}
            disabled={disabled || !editor || uploadingImage}
            onClick={() => fileInputRef.current?.click()}
          >
            {uploadingImage ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <ImagePlus className="size-3.5" />
            )}
          </ToolbarButton>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp"
            className="hidden"
            onChange={(event) => void handleImageSelect(event)}
          />
        </div>

        <EditorContent editor={editor} />

        <div className="flex flex-wrap items-center justify-center gap-3 border-t border-white/8 bg-zinc-950/60 px-3 py-2 text-[11px] text-zinc-500">
          <span>
            {t("richTextCharCount", { count: stats.textLength })}
          </span>
          <span className={cn(overLimit && "text-rose-400")}>
            {stats.htmlLength}/{maxLength}
          </span>
        </div>
      </div>
    </div>
  );
}
