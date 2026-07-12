"use client";

type AdminPanelHeaderProps = {
  title: string;
  description?: string;
  actions?: React.ReactNode;
};

/** 標題置中；右側可放重新整理等按鈕，不影響標題置中 */
export function AdminPanelHeader({
  title,
  description,
  actions,
}: AdminPanelHeaderProps) {
  return (
    <div className="relative border-b border-white/8 pb-5">
      <div className="text-center">
        <h2 className="text-lg font-semibold text-white">{title}</h2>
        {description ? (
          <p className="mx-auto mt-1.5 max-w-2xl text-sm leading-relaxed text-zinc-500">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className="mt-3 flex flex-wrap items-center justify-center gap-2 sm:absolute sm:right-0 sm:top-0 sm:mt-0">
          {actions}
        </div>
      ) : null}
    </div>
  );
}

export const adminPanelCenteredCardsClass =
  "[&_[data-slot=card-header]:not(:has(button))]:text-center [&_[data-slot=card-title]:not(:has(button))]:flex [&_[data-slot=card-title]:not(:has(button))]:justify-center";
