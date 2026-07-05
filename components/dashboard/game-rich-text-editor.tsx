"use client";

import { useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  Bold,
  Heading2,
  Italic,
  List,
  ListOrdered,
  Quote,
  Strikethrough,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type GameRichTextEditorProps = {
  value: string;
  onChange: (html: string) => void;
  disabled?: boolean;
  placeholder?: string;
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

export function GameRichTextEditor({
  value,
  onChange,
  disabled,
  placeholder = "撰寫遊戲攻略、故事背景、改版日誌…",
}: GameRichTextEditorProps) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: value || "",
    editable: !disabled,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          "prose prose-invert prose-sm max-w-none min-h-[180px] px-4 py-3 text-zinc-100 focus:outline-none [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-white [&_p]:text-zinc-300 [&_a]:text-cyan-400",
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

  return (
    <div className="space-y-2">
      <div className="space-y-1 text-center">
        <p className="text-sm font-medium text-zinc-200">遊戲詳細介紹</p>
        <p className="text-xs text-zinc-500">
          支援富文本格式：標題、清單、引用等
        </p>
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
            label="粗體"
            disabled={disabled || !editor}
            active={editor?.isActive("bold")}
            onClick={() => editor?.chain().focus().toggleBold().run()}
          >
            <Bold className="size-3.5" />
          </ToolbarButton>
          <ToolbarButton
            label="斜體"
            disabled={disabled || !editor}
            active={editor?.isActive("italic")}
            onClick={() => editor?.chain().focus().toggleItalic().run()}
          >
            <Italic className="size-3.5" />
          </ToolbarButton>
          <ToolbarButton
            label="刪除線"
            disabled={disabled || !editor}
            active={editor?.isActive("strike")}
            onClick={() => editor?.chain().focus().toggleStrike().run()}
          >
            <Strikethrough className="size-3.5" />
          </ToolbarButton>
          <ToolbarButton
            label="標題"
            disabled={disabled || !editor}
            active={editor?.isActive("heading", { level: 2 })}
            onClick={() =>
              editor?.chain().focus().toggleHeading({ level: 2 }).run()
            }
          >
            <Heading2 className="size-3.5" />
          </ToolbarButton>
          <ToolbarButton
            label="項目清單"
            disabled={disabled || !editor}
            active={editor?.isActive("bulletList")}
            onClick={() => editor?.chain().focus().toggleBulletList().run()}
          >
            <List className="size-3.5" />
          </ToolbarButton>
          <ToolbarButton
            label="編號清單"
            disabled={disabled || !editor}
            active={editor?.isActive("orderedList")}
            onClick={() => editor?.chain().focus().toggleOrderedList().run()}
          >
            <ListOrdered className="size-3.5" />
          </ToolbarButton>
          <ToolbarButton
            label="引用"
            disabled={disabled || !editor}
            active={editor?.isActive("blockquote")}
            onClick={() => editor?.chain().focus().toggleBlockquote().run()}
          >
            <Quote className="size-3.5" />
          </ToolbarButton>
        </div>

        <div className="relative">
          {!value && !editor?.getText().trim() && (
            <p className="pointer-events-none absolute inset-x-4 top-3 text-sm text-zinc-600">
              {placeholder}
            </p>
          )}
          <EditorContent editor={editor} />
        </div>
      </div>
    </div>
  );
}
