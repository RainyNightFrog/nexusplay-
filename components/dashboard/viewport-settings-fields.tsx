"use client";

import { useTranslations } from "next-intl";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  DEFAULT_VIEWPORT_HEIGHT,
  DEFAULT_VIEWPORT_WIDTH,
  MAX_VIEWPORT_HEIGHT,
  MAX_VIEWPORT_WIDTH,
  MIN_VIEWPORT,
} from "@/lib/game-metadata";
import { cn } from "@/lib/utils";

export type ViewportSettingsValues = {
  viewportWidth: number;
  viewportHeight: number;
  fullscreenButton: boolean;
};

type ViewportSettingsFieldsProps = {
  values: ViewportSettingsValues;
  onChange: (values: ViewportSettingsValues) => void;
  disabled?: boolean;
};

const inputClassName = cn(
  "h-10 w-24 rounded-xl border border-white/10 bg-zinc-950/80 px-3 text-center text-sm text-zinc-100",
  "outline-none transition-all duration-300",
  "focus:border-cyan-400/50 focus:shadow-[0_0_20px_rgba(34,211,238,0.25)] focus:ring-2 focus:ring-cyan-500/20"
);

export function ViewportSettingsFields({
  values,
  onChange,
  disabled,
}: ViewportSettingsFieldsProps) {
  const t = useTranslations("dashboard");

  const updateDimension = (
    key: "viewportWidth" | "viewportHeight",
    raw: string
  ) => {
    const parsed = Number.parseInt(raw, 10);
    if (Number.isNaN(parsed)) return;

    const max =
      key === "viewportWidth" ? MAX_VIEWPORT_WIDTH : MAX_VIEWPORT_HEIGHT;
    onChange({
      ...values,
      [key]: Math.min(max, Math.max(MIN_VIEWPORT, parsed)),
    });
  };

  return (
    <div className="space-y-4 rounded-2xl border border-white/8 bg-zinc-950/40 p-5">
      <div className="space-y-1 text-center">
        <p className="text-sm font-medium text-zinc-200">{t("viewportTitle")}</p>
        <p className="text-xs text-zinc-500">
          {t("viewportDesc", {
            width: DEFAULT_VIEWPORT_WIDTH,
            height: DEFAULT_VIEWPORT_HEIGHT,
          })}
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <div className="space-y-1.5 text-center">
          <Label htmlFor="viewport-width" className="text-xs text-zinc-400">
            {t("viewportWidth")}
          </Label>
          <div className="flex items-center gap-2">
            <input
              id="viewport-width"
              type="number"
              min={MIN_VIEWPORT}
              max={MAX_VIEWPORT_WIDTH}
              value={values.viewportWidth}
              disabled={disabled}
              onChange={(event) =>
                updateDimension("viewportWidth", event.target.value)
              }
              className={inputClassName}
            />
            <span className="text-xs text-zinc-500">px</span>
          </div>
        </div>

        <span className="mt-5 text-lg text-zinc-600">×</span>

        <div className="space-y-1.5 text-center">
          <Label htmlFor="viewport-height" className="text-xs text-zinc-400">
            {t("viewportHeight")}
          </Label>
          <div className="flex items-center gap-2">
            <input
              id="viewport-height"
              type="number"
              min={MIN_VIEWPORT}
              max={MAX_VIEWPORT_HEIGHT}
              value={values.viewportHeight}
              disabled={disabled}
              onChange={(event) =>
                updateDimension("viewportHeight", event.target.value)
              }
              className={inputClassName}
            />
            <span className="text-xs text-zinc-500">px</span>
          </div>
        </div>
      </div>

      <label className="flex cursor-pointer items-center justify-center gap-3 rounded-xl border border-white/8 bg-zinc-900/50 px-4 py-3 transition-colors hover:border-violet-400/30">
        <Checkbox
          checked={values.fullscreenButton}
          disabled={disabled}
          onCheckedChange={(checked) =>
            onChange({
              ...values,
              fullscreenButton: checked === true,
            })
          }
          className="border-white/20 data-checked:border-violet-400 data-checked:bg-violet-500"
        />
        <span className="text-sm text-zinc-300">{t("viewportFullscreen")}</span>
      </label>
    </div>
  );
}
