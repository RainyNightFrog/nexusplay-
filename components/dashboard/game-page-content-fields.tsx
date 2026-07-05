"use client";

import { useRef, useState, type ChangeEvent } from "react";
import Image from "next/image";
import { ImageIcon, X } from "lucide-react";
import { MAX_GALLERY_IMAGES } from "@/lib/game-page-content";
import { MAX_COVER_BYTES, formatMaxSize } from "@/lib/upload-limits";
import { cn } from "@/lib/utils";

type GalleryUploadFieldsProps = {
  label: string;
  hint: string;
  optionalLabel: string;
  existingUrls: string[];
  newFiles: File[];
  onExistingRemove: (url: string) => void;
  onFilesAdd: (files: File[]) => void;
  onFileRemove: (index: number) => void;
  disabled?: boolean;
};

function filePreviewUrl(file: File) {
  return URL.createObjectURL(file);
}

export function GalleryUploadFields({
  label,
  hint,
  optionalLabel,
  existingUrls,
  newFiles,
  onExistingRemove,
  onFilesAdd,
  onFileRemove,
  disabled,
}: GalleryUploadFieldsProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const totalCount = existingUrls.length + newFiles.length;
  const canAddMore = totalCount < MAX_GALLERY_IMAGES;

  const handleSelect = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (!selected.length) return;

    const valid = selected.filter((file) => {
      const okType = ["image/png", "image/jpeg", "image/jpg", "image/webp"].includes(
        file.type
      );
      const okSize = file.size <= MAX_COVER_BYTES;
      return okType && okSize;
    });

    const remaining = MAX_GALLERY_IMAGES - totalCount;
    onFilesAdd(valid.slice(0, remaining));
  };

  return (
    <div className="space-y-3">
      <div className="text-center">
        <p className="text-sm font-medium text-zinc-200">
          {label}{" "}
          <span className="text-zinc-500">{optionalLabel}</span>
        </p>
        <p className="mt-1 text-xs text-zinc-500">{hint}</p>
      </div>

      {(existingUrls.length > 0 || newFiles.length > 0) && (
        <div className="flex flex-wrap justify-center gap-3">
          {existingUrls.map((url) => (
            <div
              key={url}
              className="relative size-24 overflow-hidden rounded-xl border border-white/10"
            >
              <Image src={url} alt="" fill className="object-cover" unoptimized />
              <button
                type="button"
                disabled={disabled}
                onClick={() => onExistingRemove(url)}
                className="absolute right-1 top-1 rounded-full bg-black/70 p-1 text-zinc-200 hover:text-white"
                aria-label="Remove"
              >
                <X className="size-3.5" />
              </button>
            </div>
          ))}
          {newFiles.map((file, index) => (
            <div
              key={`${file.name}-${index}`}
              className="relative size-24 overflow-hidden rounded-xl border border-cyan-400/30"
            >
              <Image
                src={filePreviewUrl(file)}
                alt=""
                fill
                className="object-cover"
                unoptimized
              />
              <button
                type="button"
                disabled={disabled}
                onClick={() => onFileRemove(index)}
                className="absolute right-1 top-1 rounded-full bg-black/70 p-1 text-zinc-200 hover:text-white"
                aria-label="Remove"
              >
                <X className="size-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {canAddMore && (
        <button
          type="button"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
          className={cn(
            "mx-auto flex w-full max-w-md flex-col items-center gap-2 rounded-xl",
            "border border-dashed border-white/15 bg-white/5 px-4 py-6",
            "text-sm text-zinc-400 transition-colors hover:border-cyan-400/30 hover:text-zinc-200"
          )}
        >
          <ImageIcon className="size-8 text-zinc-500" />
          <span>
            {totalCount}/{MAX_GALLERY_IMAGES} · {formatMaxSize(MAX_COVER_BYTES)}
          </span>
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
        multiple
        className="hidden"
        onChange={handleSelect}
      />
    </div>
  );
}

type DevlogPublishFieldsProps = {
  titleLabel: string;
  contentLabel: string;
  imagesLabel: string;
  hint: string;
  title: string;
  content: string;
  imageFiles: File[];
  onTitleChange: (value: string) => void;
  onContentChange: (value: string) => void;
  onImagesAdd: (files: File[]) => void;
  onImageRemove: (index: number) => void;
  disabled?: boolean;
};

export function DevlogPublishFields({
  titleLabel,
  contentLabel,
  imagesLabel,
  hint,
  title,
  content,
  imageFiles,
  onTitleChange,
  onContentChange,
  onImagesAdd,
  onImageRemove,
  disabled,
}: DevlogPublishFieldsProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-4 rounded-xl border border-violet-400/20 bg-violet-500/5 p-4">
      <div className="text-center">
        <p className="text-sm font-semibold text-violet-200">{hint}</p>
      </div>
      <div className="space-y-2">
        <label className="block text-center text-sm font-medium text-zinc-200">
          {titleLabel}
        </label>
        <input
          type="text"
          value={title}
          maxLength={120}
          disabled={disabled}
          onChange={(event) => onTitleChange(event.target.value)}
          className={cn(
            "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5",
            "text-center text-sm text-zinc-100 outline-none",
            "focus:border-violet-400/40 focus:ring-2 focus:ring-violet-500/20"
          )}
        />
      </div>
      <div className="space-y-2">
        <label className="block text-center text-sm font-medium text-zinc-200">
          {contentLabel}
        </label>
        <textarea
          value={content}
          rows={4}
          maxLength={4000}
          disabled={disabled}
          onChange={(event) => onContentChange(event.target.value)}
          className={cn(
            "w-full resize-none rounded-xl border border-white/10 bg-white/5 px-4 py-3",
            "text-center text-sm leading-relaxed text-zinc-100 outline-none",
            "focus:border-violet-400/40 focus:ring-2 focus:ring-violet-500/20"
          )}
        />
      </div>
      <div className="space-y-2">
        <p className="text-center text-sm font-medium text-zinc-200">
          {imagesLabel}
        </p>
        {imageFiles.length > 0 && (
          <div className="flex flex-wrap justify-center gap-2">
            {imageFiles.map((file, index) => (
              <div
                key={`${file.name}-${index}`}
                className="relative size-20 overflow-hidden rounded-lg border border-white/10"
              >
                <Image
                  src={URL.createObjectURL(file)}
                  alt=""
                  fill
                  className="object-cover"
                  unoptimized
                />
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => onImageRemove(index)}
                  className="absolute right-1 top-1 rounded-full bg-black/70 p-1"
                >
                  <X className="size-3.5 text-white" />
                </button>
              </div>
            ))}
          </div>
        )}
        <button
          type="button"
          disabled={disabled || imageFiles.length >= 4}
          onClick={() => inputRef.current?.click()}
          className="mx-auto block text-xs text-violet-300 hover:text-violet-200"
        >
          + {imagesLabel}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
          multiple
          className="hidden"
          onChange={(event) => {
            const files = Array.from(event.target.files ?? []);
            event.target.value = "";
            onImagesAdd(files.slice(0, 4 - imageFiles.length));
          }}
        />
      </div>
    </div>
  );
}
