"use client";

import { cn } from "@/lib/utils";

type RequiredFieldLabelProps = {
  children: React.ReactNode;
  required?: boolean;
  optional?: boolean;
  className?: string;
};

export function RequiredFieldLabel({
  children,
  required,
  optional,
  className,
}: RequiredFieldLabelProps) {
  return (
    <span
      className={cn(
        "inline-flex flex-wrap items-center justify-center gap-1.5",
        className
      )}
    >
      {children}
      {required && (
        <span className="rounded-full bg-rose-500/15 px-1.5 py-0.5 text-[10px] font-medium text-rose-300">
          必填
        </span>
      )}
      {optional && (
        <span className="text-[10px] text-zinc-600">選填</span>
      )}
    </span>
  );
}
