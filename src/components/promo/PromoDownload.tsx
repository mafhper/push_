import { ArrowRight, ArrowUpRight } from "lucide-react";
import { Link } from "react-router";
import { APP_VERSION, SITE_REPOSITORY_URL } from "@/config/site";
import { useApp } from "@/contexts/useApp";

export function PromoDownload() {
  const { t } = useApp();

  return (
    <section id="download" className="scroll-mt-20 border-t border-border/70 bg-surface-1/40">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-16 md:flex-row md:items-end md:justify-between md:px-8">
        <div className="max-w-2xl">
          <p className="font-mono text-micro font-semibold uppercase tracking-[0.18em] text-primary">
            {t("promoDownloadKicker")}
          </p>
          <h2 className="mt-3 font-headline text-3xl font-semibold leading-tight text-foreground sm:text-4xl">
            {t("promoDownloadTitle")}
          </h2>
          <p className="mt-4 text-base leading-7 text-foreground-muted">
            {t("promoDownloadBody", { version: APP_VERSION })}
          </p>
          <p className="mt-3 text-sm leading-6 text-foreground-subtle">{t("promoDownloadNote")}</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            to="/app"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {t("promoDownloadPrimary")}
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
          <a
            href={SITE_REPOSITORY_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-border px-5 text-sm font-semibold text-foreground transition-colors hover:bg-surface-2"
          >
            {t("promoDownloadSecondary")}
            <ArrowUpRight className="size-4" aria-hidden="true" />
          </a>
        </div>
      </div>
    </section>
  );
}
