"use client";

import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AdminPanelHeader,
  adminPanelCenteredCardsClass,
} from "@/components/admin/admin-panel-header";
import { cn } from "@/lib/utils";

type AdminPanelFrameProps = {
  title: string;
  description?: string;
  onRefresh?: () => void;
  refreshing?: boolean;
  refreshLabel: string;
  actions?: React.ReactNode;
  error?: string | null;
  children: React.ReactNode;
  className?: string;
  /** 區塊標題置中；含左右排版或按鈕的列不受影響 */
  centerContent?: boolean;
};

export function AdminPanelFrame({
  title,
  description,
  onRefresh,
  refreshing = false,
  refreshLabel,
  actions,
  error,
  children,
  className,
  centerContent = true,
}: AdminPanelFrameProps) {
  const headerActions =
    actions || onRefresh ? (
      <>
        {actions}
        {onRefresh ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={refreshing}
            className="gap-2 border-white/10"
          >
            <RefreshCw
              className={cn("size-4", refreshing && "animate-spin")}
            />
            {refreshLabel}
          </Button>
        ) : null}
      </>
    ) : undefined;

  return (
    <div
      className={cn(
        "rounded-2xl border border-white/10 bg-zinc-900/50 p-5 sm:p-6 md:p-8",
        className
      )}
    >
      <AdminPanelHeader
        title={title}
        description={description}
        actions={headerActions}
      />

      {error ? (
        <p
          className={cn(
            "mt-4 text-sm text-rose-400",
            centerContent && "text-center"
          )}
        >
          {error}
        </p>
      ) : null}

      <div
        className={cn(
          "space-y-6",
          error ? "mt-4" : "mt-6",
          centerContent && adminPanelCenteredCardsClass
        )}
      >
        {children}
      </div>
    </div>
  );
}
