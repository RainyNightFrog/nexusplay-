"use client";

import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  AI_CONTENT_TYPES,
  AI_CONTENT_TYPE_LABELS,
  type AiContentType,
} from "@/lib/game-metadata";
import { cn } from "@/lib/utils";
import { RequiredFieldLabel } from "@/components/dashboard/required-field-label";

export type AiDisclosureValues = {
  aiDisclosed: boolean | null;
  aiContentTypes: AiContentType[];
};

type AiDisclosureFieldsProps = {
  values: AiDisclosureValues;
  onChange: (values: AiDisclosureValues) => void;
  disabled?: boolean;
  requiredForPublic?: boolean;
  fieldErrors?: {
    aiDisclosure?: boolean;
    aiContentTypes?: boolean;
  };
};

function RadioOption({
  selected,
  label,
  onClick,
  disabled,
}: {
  selected: boolean;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm transition-all duration-300",
        "disabled:cursor-not-allowed disabled:opacity-50",
        selected
          ? "border-violet-400/50 bg-violet-500/10 text-violet-100 shadow-[0_0_24px_rgba(167,139,250,0.2)]"
          : "border-white/10 bg-zinc-900/40 text-zinc-400 hover:border-white/20 hover:text-zinc-200"
      )}
    >
      <span
        className={cn(
          "flex size-4 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
          selected ? "border-violet-400 bg-violet-500" : "border-zinc-600"
        )}
      >
        {selected && <span className="size-1.5 rounded-full bg-white" />}
      </span>
      {label}
    </button>
  );
}

export function AiDisclosureFields({
  values,
  onChange,
  disabled,
  requiredForPublic,
  fieldErrors,
}: AiDisclosureFieldsProps) {
  const t = useTranslations("dashboard");

  const toggleContentType = (type: AiContentType) => {
    const next = values.aiContentTypes.includes(type)
      ? values.aiContentTypes.filter((item) => item !== type)
      : [...values.aiContentTypes, type];
    onChange({ ...values, aiContentTypes: next });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1 text-center">
        <div className="flex flex-wrap items-center justify-center gap-2">
          <p className="text-sm font-medium text-zinc-200">
            <RequiredFieldLabel required={requiredForPublic}>
              AI 生成內容誠實宣告
            </RequiredFieldLabel>
          </p>
          <Badge className="gap-1 border-0 bg-gradient-to-r from-cyan-500/20 to-violet-500/20 text-cyan-200">
            <Sparkles className="size-3" />
            新的
          </Badge>
        </div>
        <p className="text-center text-xs text-zinc-500">
          此專案是否包含 AI 生成內容（美術、程式碼或語音）？即使經過人工編輯也請如實申報。
        </p>
      </div>

      <div
        className={cn(
          "grid gap-2 sm:grid-cols-2",
          fieldErrors?.aiDisclosure && "rounded-xl ring-2 ring-rose-400/40 p-1"
        )}
      >
        <RadioOption
          selected={values.aiDisclosed === true}
          label="是 — 本專案包含生成式 AI 的輸出結果"
          disabled={disabled}
          onClick={() =>
            onChange({ ...values, aiDisclosed: true })
          }
        />
        <RadioOption
          selected={values.aiDisclosed === false}
          label="否 — 本專案不包含生成式 AI 的輸出"
          disabled={disabled}
          onClick={() =>
            onChange({ aiDisclosed: false, aiContentTypes: [] })
          }
        />
      </div>

      {fieldErrors?.aiDisclosure && (
        <p className="text-center text-xs text-rose-300" role="alert">
          {t("alertAiDisclosure")}
        </p>
      )}

      <AnimatePresence>
        {values.aiDisclosed === true && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div
              className={cn(
                "space-y-3 rounded-2xl border border-violet-400/20 bg-violet-500/5 p-4",
                fieldErrors?.aiContentTypes && "ring-2 ring-rose-400/40"
              )}
            >
              <p className="text-center text-xs font-medium text-violet-200">
                使用的是哪種 AI 生成內容？（必填，可多選）
              </p>
              {fieldErrors?.aiContentTypes && (
                <p className="text-center text-xs text-rose-300" role="alert">
                  {t("alertAiContentTypes")}
                </p>
              )}
              <div className="grid gap-2 sm:grid-cols-2">
                {AI_CONTENT_TYPES.map((type) => (
                  <label
                    key={type}
                    className="flex cursor-pointer items-center gap-3 rounded-xl border border-white/8 bg-zinc-950/50 px-3 py-2.5 transition-colors hover:border-violet-400/30"
                  >
                    <Checkbox
                      checked={values.aiContentTypes.includes(type)}
                      disabled={disabled}
                      onCheckedChange={() => toggleContentType(type)}
                      className="border-white/20 data-checked:border-violet-400 data-checked:bg-violet-500"
                    />
                    <span className="text-sm text-zinc-300">
                      {AI_CONTENT_TYPE_LABELS[type]}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
