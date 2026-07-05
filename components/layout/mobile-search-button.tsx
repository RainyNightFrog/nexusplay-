"use client";

import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Search } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type MobileSearchButtonProps = {
  className?: string;
};

export function MobileSearchButton({ className }: MobileSearchButtonProps) {
  const t = useTranslations("nav");

  return (
    <Link
      href="/search"
      className={cn(
        buttonVariants({ variant: "outline", size: "sm" }),
        "size-9 border-white/10 bg-white/5 p-0 text-zinc-300 hover:text-white md:hidden",
        className
      )}
      aria-label={t("searchOpen")}
    >
      <Search className="size-4" />
    </Link>
  );
}
