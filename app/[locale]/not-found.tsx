import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { buttonVariants } from "@/components/ui/button";

export default async function NotFound() {
  const t = await getTranslations("common");
  const th = await getTranslations("home");

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center text-zinc-100">
      <h1 className="text-2xl font-bold text-white">404</h1>
      <p className="mt-2 text-zinc-400">{t("404Desc")}</p>
      <Link href="/" className={buttonVariants({ className: "mt-6" })}>
        {th("browseGames")}
      </Link>
    </div>
  );
}
