"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
} from "react";
import { useLocale, useTranslations } from "next-intl";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  FileArchive,
  Gamepad2,
  ImageIcon,
  Loader2,
  Sparkles,
  Upload,
  X,
} from "lucide-react";
import { Link, getPathname } from "@/i18n/navigation";
import { SiteHeader } from "@/components/layout/site-header";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  PublishMonetizationFields,
  type PublishMonetizationValues,
} from "@/components/dashboard/publish-monetization-fields";
import { PublishStatusFields } from "@/components/dashboard/publish-status-fields";
import { PlatformAuthNotice } from "@/components/dashboard/platform-auth-notice";
import { RequiredFieldLabel } from "@/components/dashboard/required-field-label";
import {
  GamePublishMetadataFields,
  DEFAULT_GAME_PUBLISH_METADATA,
} from "@/components/dashboard/game-publish-metadata-fields";
import { uploadGame } from "@/lib/upload-game";
import { DEFAULT_PUBLISH_STATUS } from "@/lib/game-publish";
import {
  getPublishValidationIssues,
  type PublishValidationField,
} from "@/lib/publish-form-validation";
import { scrollToFirstValidationField } from "@/lib/scroll-to-validation-field";
import { useApiError } from "@/hooks/use-api-error";
import {
  clearPersistedGameUploadDraft,
  restoreGameUploadDraft,
  useGameFormDraft,
} from "@/hooks/use-game-form-draft";
import type { GameGenre } from "@/lib/game-metadata";
import type { GamePublishMetadata } from "@/lib/game-metadata";
import {
  formatMaxSize,
  MAX_COVER_BYTES,
  MAX_DESCRIPTION_LENGTH,
  MAX_TITLE_LENGTH,
  MAX_ZIP_BYTES,
  PRODUCTION_UPLOAD_BYTES,
} from "@/lib/upload-limits";
import { isZipFileAsync, validateGameZipFile, ZIP_FILE_ACCEPT } from "@/lib/zip-file-validation";
import { cn } from "@/lib/utils";

type FormState = {
  title: string;
  description: string;
  genre: GameGenre | "";
};

const inputClassName = cn(
  "w-full rounded-xl border border-white/10 bg-white/5 px-4 text-center text-sm text-zinc-100",
  "placeholder:text-zinc-500 backdrop-blur-md outline-none transition-all duration-200",
  "focus:border-cyan-400/40 focus:bg-white/8 focus:ring-2 focus:ring-cyan-500/20"
);

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function DropZone({
  label,
  hint,
  dragDropText,
  previewAlt,
  accept,
  file,
  previewUrl,
  icon: Icon,
  onFileSelect,
  onClear,
  required,
  hasError,
}: {
  label: React.ReactNode;
  hint: string;
  dragDropText: string;
  previewAlt: string;
  accept: string;
  file: File | null;
  previewUrl?: string | null;
  icon: typeof ImageIcon;
  onFileSelect: (file: File) => void;
  onClear: () => void;
  required?: boolean;
  hasError?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFile = (selected: File | undefined) => {
    if (!selected) return;
    onFileSelect(selected);
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    handleFile(event.dataTransfer.files[0]);
  };

  const onDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
  };

  const onInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    handleFile(event.target.files?.[0]);
    event.target.value = "";
  };

  return (
    <div className="space-y-2 text-center">
      <label className="block text-sm font-medium text-zinc-200">
        <RequiredFieldLabel required={required} optional={!required}>
          {label}
        </RequiredFieldLabel>
      </label>
      <motion.div
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onClick={() => !file && inputRef.current?.click()}
        animate={{
          scale: isDragging ? 1.01 : 1,
        }}
        className={cn(
          "relative overflow-hidden rounded-2xl border-2 border-dashed transition-all duration-300",
          hasError && "border-rose-400/50 ring-2 ring-rose-400/20",
          file
            ? "border-cyan-400/30 bg-cyan-500/5"
            : "border-white/10 bg-zinc-900/40 hover:border-white/20 hover:bg-zinc-900/60",
          isDragging &&
            "border-cyan-400/70 bg-cyan-500/10 shadow-[0_0_30px_rgba(34,211,238,0.25)]",
          !file && "cursor-pointer"
        )}
      >
        {isDragging && (
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-transparent to-violet-500/10" />
        )}

        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={onInputChange}
        />

        {file ? (
          <div className="flex flex-col items-center gap-4 p-5 sm:flex-row sm:justify-center">
            {previewUrl ? (
              <div className="relative size-20 shrink-0 overflow-hidden rounded-xl border border-white/10">
                <Image
                  src={previewUrl}
                  alt={previewAlt}
                  fill
                  className="object-cover"
                />
              </div>
            ) : (
              <div className="flex size-20 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-violet-500/10">
                <Icon className="size-8 text-violet-400" />
              </div>
            )}
            <div className="min-w-0 flex-1 text-center sm:max-w-xs">
              <p className="truncate text-sm font-medium text-white">
                {file.name}
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                {formatFileSize(file.size)}
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={(event) => {
                event.stopPropagation();
                onClear();
              }}
              className="shrink-0 text-zinc-400 hover:text-white"
            >
              <X className="size-4" />
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center px-6 py-10 text-center">
            <div
              className={cn(
                "mb-4 flex size-14 items-center justify-center rounded-2xl border border-white/10 bg-white/5 transition-colors",
                isDragging && "border-cyan-400/40 bg-cyan-500/15"
              )}
            >
              <Icon
                className={cn(
                  "size-7 text-zinc-500 transition-colors",
                  isDragging && "text-cyan-400"
                )}
              />
            </div>
            <p className="text-sm font-medium text-zinc-200">{dragDropText}</p>
            <p className="mt-1.5 text-xs text-zinc-500">{hint}</p>
          </div>
        )}
      </motion.div>
    </div>
  );
}

export default function UploadPage() {
  const t = useTranslations("dashboard");
  const tErrors = useTranslations("errors");
  const tCommon = useTranslations("common");
  const { translateApiError } = useApiError();
  const locale = useLocale();
  const coverMaxSize = formatMaxSize(MAX_COVER_BYTES);
  const zipMaxSize = formatMaxSize(MAX_ZIP_BYTES);
  const zipProductionSize = formatMaxSize(PRODUCTION_UPLOAD_BYTES);
  const [form, setForm] = useState<FormState>({
    title: "",
    description: "",
    genre: "",
  });
  const [metadata, setMetadata] = useState<GamePublishMetadata>(
    DEFAULT_GAME_PUBLISH_METADATA
  );
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [gameZip, setGameZip] = useState<File | null>(null);
  const [monetization, setMonetization] = useState<PublishMonetizationValues>({
    publishStatus: DEFAULT_PUBLISH_STATUS,
    tipsEnabled: false,
    suggestedTipAmount: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState("");
  const [toast, setToast] = useState<{
    type: "success" | "error";
    title: string;
    message: string;
  } | null>(null);
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<PublishValidationField, boolean>>
  >({});
  const [validationMessages, setValidationMessages] = useState<string[]>([]);
  const [draftReady, setDraftReady] = useState(false);

  useEffect(() => {
    const draft = restoreGameUploadDraft();
    if (draft) {
      setForm(draft.form);
      setMetadata(draft.metadata);
      setMonetization(draft.monetization);
    }
    setDraftReady(true);
  }, []);

  useGameFormDraft({
    mode: "upload",
    ready: draftReady,
    form,
    metadata,
    monetization,
  });

  const showToast = (
    type: "success" | "error",
    title: string,
    message: string
  ) => {
    setToast({ type, title, message });
    window.setTimeout(() => setToast(null), type === "success" ? 5000 : 6000);
  };

  const handleCoverSelect = useCallback((file: File) => {
    const validTypes = ["image/png", "image/jpeg", "image/jpg"];
    if (!validTypes.includes(file.type)) {
      showToast("error", tErrors("invalidFormat"), tErrors("coverFormat"));
      return;
    }
    if (file.size > MAX_COVER_BYTES) {
      showToast(
        "error",
        tErrors("fileTooLarge"),
        tErrors("coverTooLarge", { size: coverMaxSize })
      );
      return;
    }
    if (coverPreview) URL.revokeObjectURL(coverPreview);
    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
  }, [coverPreview, coverMaxSize, tErrors]);

  const handleCoverClear = () => {
    if (coverPreview) URL.revokeObjectURL(coverPreview);
    setCoverFile(null);
    setCoverPreview(null);
  };

  const handleZipSelect = async (file: File) => {
    const valid = await isZipFileAsync(file);
    if (!valid) {
      showToast("error", tErrors("invalidFormat"), tErrors("zipFormat"));
      return;
    }
    if (file.size > MAX_ZIP_BYTES) {
      showToast(
        "error",
        tErrors("fileTooLarge"),
        tErrors("zipTooLarge", {
          size: zipMaxSize,
          current: formatMaxSize(file.size),
        })
      );
      return;
    }
    if (file.size > PRODUCTION_UPLOAD_BYTES) {
      showToast(
        "error",
        tErrors("fileTooLarge"),
        tErrors("zipProductionTooLarge", {
          size: zipProductionSize,
          current: formatMaxSize(file.size),
        })
      );
      return;
    }

    const structure = await validateGameZipFile(file);
    if (!structure.ok) {
      showToast("error", tErrors("invalidFormat"), structure.error);
      return;
    }

    setGameZip(file);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const issues = getPublishValidationIssues({
      mode: "upload",
      publishStatus: monetization.publishStatus,
      title: form.title,
      description: form.description,
      genre: form.genre,
      hasCover: Boolean(coverFile),
      hasGameZip: Boolean(gameZip),
      aiDisclosed: metadata.aiDisclosed,
      aiContentTypes: metadata.aiContentTypes,
      tipsEnabled: monetization.tipsEnabled,
      suggestedTipAmount: monetization.suggestedTipAmount,
    });

    if (issues.length > 0) {
      const nextErrors = Object.fromEntries(
        issues.map((issue) => [issue.field, true])
      ) as Partial<Record<PublishValidationField, boolean>>;
      setFieldErrors(nextErrors);
      setValidationMessages(issues.map((issue) => t(issue.messageKey)));
      scrollToFirstValidationField(issues[0].field);
      showToast(
        "error",
        t("validationSummary"),
        issues.map((issue) => t(issue.messageKey)).join("、")
      );
      return;
    }

    setFieldErrors({});
    setValidationMessages([]);

    setIsSubmitting(true);
    setSubmitStatus(t("preparingUpload"));

    try {
      const { game } = await uploadGame(
        {
          title: form.title.trim(),
          description: form.description.trim(),
          category: form.genre,
          coverFile,
          gameZipFile: gameZip!,
          publishStatus: monetization.publishStatus,
          tipsEnabled: monetization.tipsEnabled,
          suggestedTipAmount: monetization.suggestedTipAmount,
          metadata,
        },
        setSubmitStatus
      );

      console.log("[RainyNightFrog] 遊戲上傳成功:", game);

      clearPersistedGameUploadDraft();

      const isDraft = monetization.publishStatus === "draft";

      if (isDraft) {
        const previewPath = getPathname({
          locale,
          href: `/game/${game.id}`,
        });
        window.location.replace(`${previewPath}?draftSaved=1`);
        return;
      }

      showToast(
        "success",
        t("publicLiveSuccess"),
        t("publicLiveSuccessDesc", { title: game.title, id: game.id })
      );

      handleCoverClear();
      setGameZip(null);

      const livePath = getPathname({
        locale,
        href: `/game/${game.id}`,
      });
      window.setTimeout(() => {
        window.location.replace(`${livePath}?published=1`);
      }, 900);
    } catch (error) {
      const raw = error instanceof Error ? error.message : null;
      const message = translateApiError(raw) ?? raw ?? t("uploadFailed");
      console.error("[RainyNightFrog] 遊戲上傳失敗:", error);
      showToast("error", t("uploadFailed"), message);
    } finally {
      setIsSubmitting(false);
      setSubmitStatus("");
    }
  };

  const isDraftUpload = monetization.publishStatus === "draft";
  const isPublicUpload = !isDraftUpload;

  return (
    <div className="dark relative min-h-full text-zinc-100">
      {/* Header */}
      <SiteHeader>
          <Link
            href="/dashboard"
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "gap-1.5 text-zinc-400 hover:text-cyan-300"
            )}
          >
            <ArrowLeft className="size-4" />
            <span className="hidden sm:inline">{tCommon("backDashboard")}</span>
          </Link>

          <div className="flex min-w-0 flex-1 items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-400 to-violet-600">
              <Gamepad2 className="size-4 text-white" />
            </div>
            <span className="truncate text-sm font-semibold text-white">
              {t("creatorHub")}
            </span>
          </div>
      </SiteHeader>

      <main className="relative mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="mb-8 text-center">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-500/10 px-4 py-1.5 text-xs font-medium text-violet-300">
              <Sparkles className="size-3.5" />
              {t("publishYourWork")}
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              {t("uploadNewGame")}
            </h1>
            <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-zinc-400">
              {t("uploadDesc")}
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className={cn(
              "space-y-8 rounded-2xl border border-white/10 bg-zinc-900/50 p-6 text-center",
              "shadow-xl shadow-black/40 backdrop-blur-sm sm:p-8"
            )}
          >
            {/* Basic fields */}
            <section className="space-y-5">
              <h2 className="text-center text-sm font-semibold uppercase tracking-wider text-cyan-400">
                {t("basicInfo")}
              </h2>

              <div className="space-y-2">
                <label
                  htmlFor="title"
                  className="block text-center text-sm font-medium text-zinc-200"
                >
                  <RequiredFieldLabel required>
                    {t("gameTitle")}
                  </RequiredFieldLabel>
                </label>
                <input
                  id="title"
                  type="text"
                  value={form.title}
                  maxLength={MAX_TITLE_LENGTH}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, title: event.target.value }))
                  }
                  placeholder={t("gameTitlePlaceholder")}
                  className={cn(
                    inputClassName,
                    "h-11",
                    fieldErrors.title && "border-rose-400/50 ring-2 ring-rose-400/20"
                  )}
                  disabled={isSubmitting}
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="description"
                  className="block text-center text-sm font-medium text-zinc-200"
                >
                  <RequiredFieldLabel required={isPublicUpload} optional={isDraftUpload}>
                    {t("gameDesc")}
                  </RequiredFieldLabel>
                </label>
                <textarea
                  id="description"
                  value={form.description}
                  maxLength={MAX_DESCRIPTION_LENGTH}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      description: event.target.value,
                    }))
                  }
                  placeholder={t("gameDescPlaceholder")}
                  rows={4}
                  className={cn(
                    inputClassName,
                    "resize-none py-3 leading-relaxed",
                    fieldErrors.description &&
                      "border-rose-400/50 ring-2 ring-rose-400/20"
                  )}
                  disabled={isSubmitting}
                />
              </div>
            </section>

            <GamePublishMetadataFields
              genre={form.genre}
              metadata={metadata}
              onGenreChange={(genre) =>
                setForm((prev) => ({ ...prev, genre }))
              }
              onMetadataChange={setMetadata}
              disabled={isSubmitting}
              isPublicPublish={isPublicUpload}
              fieldErrors={{
                genre: fieldErrors.genre,
                aiDisclosure: fieldErrors.aiDisclosure,
                aiContentTypes: fieldErrors.aiContentTypes,
              }}
            />

            {/* File uploads */}
            <section className="space-y-5">
              <h2 className="text-center text-sm font-semibold uppercase tracking-wider text-violet-400">
                {t("fileUpload")}
              </h2>

              <div id="field-cover">
              <DropZone
                label={t("coverImage")}
                hint={t("coverHint", { size: coverMaxSize })}
                dragDropText={tCommon("dragDrop")}
                previewAlt={tCommon("coverPreview")}
                accept=".png,.jpg,.jpeg,image/png,image/jpeg"
                file={coverFile}
                previewUrl={coverPreview}
                icon={ImageIcon}
                onFileSelect={handleCoverSelect}
                onClear={handleCoverClear}
                required={isPublicUpload}
                hasError={fieldErrors.cover}
              />
              </div>

              <div id="field-game-zip">
              <DropZone
                label={t("gameZip")}
                hint={t("zipHint", { productionSize: zipProductionSize })}
                dragDropText={tCommon("dragDrop")}
                previewAlt={tCommon("coverPreview")}
                accept={ZIP_FILE_ACCEPT}
                file={gameZip}
                icon={FileArchive}
                onFileSelect={handleZipSelect}
                onClear={() => setGameZip(null)}
                required
                hasError={fieldErrors.gameZip}
              />
              </div>
            </section>

            <PublishMonetizationFields
              values={monetization}
              onChange={setMonetization}
              disabled={isSubmitting}
            />

            {validationMessages.length > 0 && (
              <div className="rounded-xl border border-rose-400/25 bg-rose-500/10 px-4 py-3 text-center text-xs text-rose-200">
                <p className="font-medium">{t("validationSummary")}</p>
                <p className="mt-1 text-rose-200/90">{validationMessages.join("、")}</p>
              </div>
            )}

            <PlatformAuthNotice />
            <div className="border-t border-white/5 pt-6">
              <PublishStatusFields
                value={monetization.publishStatus}
                onChange={(publishStatus) =>
                  setMonetization((prev) => ({ ...prev, publishStatus }))
                }
                disabled={isSubmitting}
                className="mb-6"
              />
              <Button
                type="submit"
                disabled={isSubmitting}
                className={cn(
                  "h-12 w-full gap-2 rounded-xl text-base font-semibold",
                  "border-0 bg-gradient-to-r from-cyan-500 via-violet-600 to-fuchsia-600 text-white",
                  "shadow-xl shadow-violet-500/25 hover:from-cyan-400 hover:via-violet-500 hover:to-fuchsia-500",
                  "disabled:opacity-70"
                )}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="size-5 animate-spin" />
                    {submitStatus ||
                      (isDraftUpload ? t("savingDraft") : tCommon("publishing"))}
                  </>
                ) : (
                  <>
                    <Upload className="size-5" />
                    {isDraftUpload ? t("saveDraft") : t("publishGame")}
                  </>
                )}
              </Button>
              <p className="mt-3 text-center text-xs text-zinc-600">
                {t("publishStatusNote")}
              </p>
            </div>
          </form>
        </motion.div>
      </main>

      {/* Toast notifications */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className={cn(
              "fixed bottom-6 left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2",
              "rounded-2xl border bg-zinc-900/95 p-5 backdrop-blur-md",
              toast.type === "success"
                ? "border-emerald-400/30 shadow-2xl shadow-emerald-500/10"
                : "border-rose-400/30 shadow-2xl shadow-rose-500/10"
            )}
          >
            <div className="flex items-start justify-center gap-4 text-center">
              <div
                className={cn(
                  "flex size-11 shrink-0 items-center justify-center rounded-xl",
                  toast.type === "success"
                    ? "bg-emerald-500/15"
                    : "bg-rose-500/15"
                )}
              >
                {toast.type === "success" ? (
                  <CheckCircle2 className="size-6 text-emerald-400" />
                ) : (
                  <AlertCircle className="size-6 text-rose-400" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-white">{toast.title}</p>
                <p className="mt-1 text-sm text-zinc-400">{toast.message}</p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => setToast(null)}
                className="shrink-0 text-zinc-500 hover:text-white"
              >
                <X className="size-4" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
