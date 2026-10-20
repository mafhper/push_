import { Link } from "react-router";
import { SITE_REPOSITORY_URL } from "@/config/site";
import { useApp } from "@/contexts/useApp";
import { PromoThemeToggle } from "./PromoThemeToggle";

/**
 * Footer for the promo surface: secondary destinations on the left, the
 * neutral theme switch on the right. Both runtimes mount `PromoLayout`, so
 * this is the single implementation — no per-runtime copy.
 *
 * Links are 44px tall and carry the same focus ring as the app; there is no
 * color transition anywhere in the footer, so a theme swap is instant.
 */
const LINK_CLASS =
  "inline-flex min-h-11 items-center rounded-sm text-sm font-medium text-foreground-muted hover:text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

export function PromoFooter() {
  const { t } = useApp();

  return (
    <footer className="border-t border-border bg-background">
      <div className="mx-auto flex max-w-5xl flex-col gap-4 px-6 py-6 sm:flex-row sm:items-center sm:justify-between">
        <nav aria-label={t("promoFooterNav")} className="flex flex-wrap items-center gap-x-6">
          <Link to="/app" className={LINK_CLASS}>
            {t("dashboard")}
          </Link>
          <a href="#download" className={LINK_CLASS}>
            {t("promoDownloadKicker")}
          </a>
          <a href={SITE_REPOSITORY_URL} target="_blank" rel="noopener noreferrer" className={LINK_CLASS}>
            {t("promoVisitGitHub")}
          </a>
        </nav>

        <PromoThemeToggle />
      </div>
    </footer>
  );
}
