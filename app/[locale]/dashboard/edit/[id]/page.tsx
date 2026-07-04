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
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  FileArchive,
  ImageIcon,
  Loader2,
  Pencil,
  Rocket,
  Save,
  Sparkles,
  X,
} from "lucide-react";
import { Link, getPathname } from "@/i18n/navigation";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  PublishMonetizationFields,
  type PublishMonetizationValues,
} from "@/components/dashboard/publish-monetization-fields";
import { fetchManageGame, updateGame } from "@/lib/update-game";
import { DEFAULT_PUBLISH_STATUS, normalizePublishStatus } from "@/lib/game-publish";
import { useApiError } from "@/hooks/use-api-error";
import { UPLOAD_CATEGORIES, type UploadCategory } from "@/lib/games";
import {
  formatMaxSize,
  MAX_COVER_BYTES,
  MAX_DESCRIPTION_LENGTH,
  MAX_TITLE_LENGTH,
  MAX_ZIP_BYTES,
} from "@/lib/upload-limits";
import { cn } from "@/lib/utils";

type FormState = {
  title: string;
  description: string;
  category: UploadCategory | "";
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
  currentCoverAlt,
  changeCoverHint,
  optionalLabel,
  accept,
  file,
  previewUrl,
  icon: Icon,
  onFileSelect,
  onClear,
  optional,
}: {
  label: string;
  hint: string;
  dragDropText: string;
  previewAlt: string;
  currentCoverAlt: string;
  changeCoverHint: string;
  optionalLabel: string;
  accept: string;
  file: File | null;
  previewUrl?: string | null;
  icon: typeof ImageIcon;
  onFileSelect: (file: File) => void;
  onClear: () => void;
  optional?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFile = (selected: File | undefined) => {
    if (!selected) return;
    onFileSelect(selected);
  };

  return (
    <div className="space-y-2 text-center">
      <label className="block text-sm font-medium text-zinc-200">
        {label}
        {optional && (
          <span className="ml-2 text-xs font-normal text-zinc-500">
            {optionalLabel}
          </span>
        )}
      </label>
      <motion.div
        onDrop={(event: DragEvent<HTMLDivElement>) => {
          event.preventDefault();
          setIsDragging(false);
          handleFile(event.dataTransfer.files[0]);
        }}
        onDragOver={(event: DragEvent<HTMLDivElement>) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={(event: DragEvent<HTMLDivElement>) => {
          event.preventDefault();
          setIsDragging(false);
        }}
        onClick={() => inputRef.current?.click()}
        animate={{ scale: isDragging ? 1.01 : 1 }}
        className={cn(
          "relative cursor-pointer overflow-hidden rounded-2xl border-2 border-dashed transition-all duration-300",
          file
            ? "border-cyan-400/30 bg-cyan-500/5"
            : "border-white/10 bg-zinc-900/40 hover:border-white/20 hover:bg-zinc-900/60",
          isDragging &&
            "border-cyan-400/70 bg-cyan-500/10 shadow-[0_0_30px_rgba(34,211,238,0.25)]"
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
          onChange={(event: ChangeEvent<HTMLInputElement>) => {
            handleFile(event.target.files?.[0]);
            event.target.value = "";
          }}
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
        ) : previewUrl ? (
          <div className="flex flex-col items-center gap-4 p-5">
            <div className="relative size-24 overflow-hidden rounded-xl border border-white/10">
              <Image
                src={previewUrl}
                alt={currentCoverAlt}
                fill
                className="object-cover"
              />
            </div>
            <p className="text-xs text-zinc-500">{changeCoverHint}</p>
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

export default function EditGamePage() {
  const t = useTranslations("dashboard");
  const tErrors = useTranslations("errors");
  const tCommon = useTranslations("common");
  const tHome = useTranslations("home");
  const { translateApiError } = useApiError();
  const coverMaxSize = formatMaxSize(MAX_COVER_BYTES);
  const zipMaxSize = formatMaxSize(MAX_ZIP_BYTES);
  const locale = useLocale();
  const params = useParams();
  const gameId = Number.parseInt(String(params.id), 10);

  const [form, setForm] = useState<FormState>({
    title: "",
    description: "",
    category: "",
  });
  const [existingCoverUrl, setExistingCoverUrl] = useState<string | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [gameZip, setGameZip] = useState<File | null>(null);
  const [monetization, setMonetization] = useState<PublishMonetizationValues>({
    publishStatus: DEFAULT_PUBLISH_STATUS,
    tipsEnabled: false,
    suggestedTipAmount: "",
  });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isOrphan, setIsOrphan] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState("");
  const [toast, setToast] = useState<{
    type: "success" | "error";
    title: string;
    message: string;
  } | null>(null);

  const showToast = (
    type: "success" | "error",
    title: string,
    message: string
  ) => {
    setToast({ type, title, message });
    window.setTimeout(() => setToast(null), type === "success" ? 5000 : 6000);
  };

  useEffect(() => {
    if (Number.isNaN(gameId)) {
      setLoadError(t("invalidGameId"));
      setLoading(false);
      return;
    }

    let cancelled = false;

    fetchManageGame(gameId)
      .then(({ game, isOrphan: orphan }) => {
        if (cancelled) return;
        setForm({
          title: game.title,
          description: game.description,
          category: game.category as UploadCategory,
        });
        setExistingCoverUrl(game.cover_url);
        setIsOrphan(orphan);
        setMonetization({
          publishStatus: normalizePublishStatus(game.publish_status),
          tipsEnabled: game.tips_enabled ?? false,
          suggestedTipAmount:
            game.suggested_tip_amount != null
              ? String(game.suggested_tip_amount)
              : "",
        });
      })
      .catch((error) => {
        if (cancelled) return;
        setLoadError(
          error instanceof Error ? error.message : t("readFailed")
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [gameId, t]);

  const handleCoverSelect = useCallback(
    (file: File) => {
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
      if (coverPreview?.startsWith("blob:")) {
        URL.revokeObjectURL(coverPreview);
      }
      setCoverFile(file);
      setCoverPreview(URL.createObjectURL(file));
    },
    [coverPreview, coverMaxSize, tErrors]
  );

  const handleCoverClear = () => {
    if (coverPreview?.startsWith("blob:")) {
      URL.revokeObjectURL(coverPreview);
    }
    setCoverFile(null);
    setCoverPreview(null);
  };

  const handleZipSelect = (file: File) => {
    if (!file.name.toLowerCase().endsWith(".zip")) {
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
    setGameZip(file);
  };

  const submitUpdate = async (publishVersion: boolean) => {
    if (!form.title.trim()) {
      alert(t("alertTitle"));
      return;
    }
    if (!form.description.trim()) {
      alert(t("alertDesc"));
      return;
    }
    if (!form.category) {
      alert(t("alertCategory"));
      return;
    }
    if (publishVersion && !gameZip) {
      showToast("error", t("missingZip"), t("missingZipDesc"));
      return;
    }
    if (monetization.tipsEnabled && !monetization.suggestedTipAmount.trim()) {
      alert(t("alertSuggestedTip"));
      return;
    }

    setIsSubmitting(true);
    const isDraftSave = monetization.publishStatus === "draft";
    setSubmitStatus(
      publishVersion
        ? t("publishingVersion")
        : isDraftSave
          ? t("savingDraft")
          : t("savingChanges")
    );

    try {
      const { game } = await updateGame(
        gameId,
        {
          title: form.title.trim(),
          description: form.description.trim(),
          category: form.category,
          coverFile,
          gameZipFile: gameZip,
          publishVersion,
          publishStatus: monetization.publishStatus,
          tipsEnabled: monetization.tipsEnabled,
          suggestedTipAmount: monetization.suggestedTipAmount,
        },
        setSubmitStatus
      );

      if (publishVersion) {
        setGameZip(null);
      }
      if (coverFile) {
        setExistingCoverUrl(game.cover_url);
        handleCoverClear();
      }

      if (isDraftSave) {
        const previewPath = getPathname({
          locale,
          href: `/game/${game.id}`,
        });
        window.location.replace(`${previewPath}?draftSaved=1`);
        return;
      }

      showToast(
        "success",
        publishVersion ? t("versionPublished") : t("changesSaved"),
        publishVersion
          ? t("versionLiveDesc", { title: game.title })
          : t("infoUpdatedDesc", { title: game.title })
      );

      const livePath = getPathname({
        locale,
        href: `/game/${game.id}`,
      });
      window.setTimeout(() => {
        window.location.replace(`${livePath}?published=1`);
      }, 900);
    } catch (error) {
      const raw = error instanceof Error ? error.message : null;
      const message = translateApiError(raw) ?? raw ?? t("updateFailed");
      showToast("error", t("updateFailed"), message);
    } finally {
      setIsSubmitting(false);
      setSubmitStatus("");
    }
  };

  if (loading) {
    return (
      <div className="dark flex min-h-full flex-col items-center justify-center text-zinc-100">
        <Loader2 className="mb-4 size-10 animate-spin text-cyan-400" />
        <p className="text-sm text-zinc-400">{tCommon("loadingGameData")}</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="dark flex min-h-full flex-col items-center justify-center px-4 text-zinc-100">
        <AlertCircle className="mb-4 size-10 text-rose-400" />
        <h1 className="text-xl font-semibold text-white">
          {tCommon("cannotEdit")}
        </h1>
        <p className="mt-2 text-sm text-zinc-500">{loadError}</p>
        <Link href="/dashboard" className={cn(buttonVariants(), "mt-6")}>
          {tCommon("backDashboard")}
        </Link>
      </div>
    );
  }

  const coverDisplayUrl = coverPreview ?? existingCoverUrl;
  const isDraftEdit = monetization.publishStatus === "draft";

  return (
    <div className="dark relative min-h-full text-zinc-100">
      <header className="sticky top-0 z-40 border-b border-white/5 bg-zinc-950/70 backdrop-blur-xl">
        <div className="relative mx-auto flex h-16 max-w-3xl items-center justify-center px-4 sm:px-6">
          <Link
            href="/dashboard"
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "absolute left-4 gap-1.5 text-zinc-400 hover:text-cyan-300 sm:left-6"
            )}
          >
            <ArrowLeft className="size-4" />
            <span className="hidden sm:inline">{tCommon("backDashboard")}</span>
          </Link>
          <div className="flex items-center justify-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-400 to-violet-600">
              <Pencil className="size-4 text-white" />
            </div>
            <span className="text-sm font-semibold text-white">{t("editGame")}</span>
          </div>
        </div>
      </header>

      <main className="relative mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="mb-8 text-center">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-500/10 px-4 py-1.5 text-xs font-medium text-cyan-300">
              <Sparkles className="size-3.5" />
              {t("updateYourWork")}
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              {t("editGame")}
            </h1>
            <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-zinc-400">
              {t("editDesc")}
            </p>
            {isOrphan && (
              <p className="mx-auto mt-3 max-w-lg rounded-xl border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
                {t("orphanGameHint", { title: form.title || t("editGame") })}
              </p>
            )}
          </div>

          <form
            onSubmit={(event) => event.preventDefault()}
            className={cn(
              "space-y-8 rounded-2xl border border-white/10 bg-zinc-900/50 p-6 text-center",
              "shadow-xl shadow-black/40 backdrop-blur-sm sm:p-8"
            )}
          >
            <section className="space-y-5">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-cyan-400">
                {t("basicInfo")}
              </h2>

              <div className="space-y-2">
                <label htmlFor="title" className="block text-sm font-medium text-zinc-200">
                  {t("gameTitle")}
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
                  className={cn(inputClassName, "h-11")}
                  disabled={isSubmitting}
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="description"
                  className="block text-sm font-medium text-zinc-200"
                >
                  {t("gameDesc")}
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
                  className={cn(inputClassName, "resize-none py-3 leading-relaxed")}
                  disabled={isSubmitting}
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="category" className="block text-sm font-medium text-zinc-200">
                  {t("gameCategory")}
                </label>
                <select
                  id="category"
                  value={form.category}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      category: event.target.value as UploadCategory | "",
                    }))
                  }
                  className={cn(inputClassName, "h-11 appearance-none pr-10")}
                  disabled={isSubmitting}
                >
                  <option value="" disabled>
                    {t("selectCategory")}
                  </option>
                  {UPLOAD_CATEGORIES.map((category) => (
                    <option key={category} value={category} className="bg-zinc-900">
                      {tHome(`categories.${category}`)}
                    </option>
                  ))}
                </select>
              </div>
            </section>

            <section className="space-y-5">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-violet-400">
                {t("fileUpdate")}
              </h2>

              <DropZone
                label={t("coverImage")}
                hint={t("coverHint", { size: coverMaxSize })}
                dragDropText={tCommon("dragDrop")}
                previewAlt={tCommon("coverPreview")}
                currentCoverAlt={tCommon("currentCover")}
                changeCoverHint={tCommon("changeCoverHint")}
                optionalLabel={tCommon("optional")}
                accept=".png,.jpg,.jpeg,image/png,image/jpeg"
                file={coverFile}
                previewUrl={coverDisplayUrl}
                icon={ImageIcon}
                onFileSelect={handleCoverSelect}
                onClear={handleCoverClear}
                optional
              />

              <DropZone
                label={t("versionUpdate")}
                hint={t("zipHint", { size: zipMaxSize })}
                dragDropText={tCommon("dragDrop")}
                previewAlt={tCommon("coverPreview")}
                currentCoverAlt={tCommon("currentCover")}
                changeCoverHint={tCommon("changeCoverHint")}
                optionalLabel={tCommon("optional")}
                accept=".zip,application/zip"
                file={gameZip}
                icon={FileArchive}
                onFileSelect={handleZipSelect}
                onClear={() => setGameZip(null)}
                optional
              />
            </section>

            <PublishMonetizationFields
              values={monetization}
              onChange={setMonetization}
              disabled={isSubmitting}
            />

            <div className="flex flex-col gap-3 border-t border-white/5 pt-6 sm:flex-row">
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="relative flex-1"
              >
                <Button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => submitUpdate(false)}
                  className={cn(
                    "group relative h-12 w-full gap-2 overflow-hidden rounded-xl text-base font-semibold",
                    "border border-white/10 bg-white/5 text-zinc-100 backdrop-blur-sm",
                    "transition-all duration-500 hover:border-cyan-400/40 hover:bg-cyan-500/10 hover:text-white",
                    "hover:shadow-[0_0_20px_rgba(6,182,212,0.25)]"
                  )}
                >
                  {isSubmitting && !gameZip ? (
                    <>
                      <Loader2 className="size-5 animate-spin" />
                      {submitStatus ||
                        (isDraftEdit ? t("savingDraft") : tCommon("saving"))}
                    </>
                  ) : (
                    <>
                      <Save className="size-5" />
                      {isDraftEdit ? t("saveDraft") : t("saveChanges")}
                    </>
                  )}
                </Button>
              </motion.div>

              <motion.div
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="relative flex-1"
              >
                <div className="absolute -inset-1 rounded-xl bg-gradient-to-r from-cyan-400 via-violet-500 to-fuchsia-500 opacity-50 blur-lg transition-opacity duration-500 group-hover:opacity-80" />
                <Button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => submitUpdate(true)}
                  className={cn(
                    "group relative h-12 w-full gap-2 overflow-hidden rounded-xl text-base font-semibold",
                    "border-0 bg-gradient-to-r from-cyan-500 via-violet-600 to-fuchsia-600 text-white",
                    "animate-pulse shadow-xl shadow-violet-500/25",
                    "before:absolute before:inset-0 before:translate-x-[-100%] before:bg-gradient-to-r before:from-transparent before:via-white/25 before:to-transparent before:transition-transform before:duration-700 hover:before:translate-x-[100%]",
                    "hover:animate-none hover:from-cyan-400 hover:via-violet-500 hover:to-fuchsia-500 hover:drop-shadow-[0_0_18px_rgba(6,182,212,0.45)]"
                  )}
                >
                  {isSubmitting && gameZip ? (
                    <>
                      <Loader2 className="size-5 animate-spin" />
                      {submitStatus || tCommon("publishing")}
                    </>
                  ) : (
                    <>
                      <Rocket className="size-5" />
                      {t("publishNewVersion")}
                    </>
                  )}
                </Button>
              </motion.div>
            </div>
          </form>
        </motion.div>
      </main>

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
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
