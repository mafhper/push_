import { ArrowUpRight, Check, Minus } from "lucide-react";
import { Link } from "react-router";
import { SITE_REPOSITORY_URL } from "@/config/site";
import { useApp } from "@/contexts/useApp";
import type { DictKey } from "@/i18n";
import { cn } from "@/lib/utils";

type Cell = boolean | DictKey;

const COLUMNS: { key: "public" | "local" | "desktop"; name: DictKey; where: DictKey }[] = [
  { key: "public", name: "promoRuntimePublic", where: "promoRuntimePublicWhere" },
  { key: "local", name: "promoRuntimeLocal", where: "promoRuntimeLocalWhere" },
  { key: "desktop", name: "promoRuntimeDesktop", where: "promoRuntimeDesktopWhere" },
];

const ROWS: { labelKey: DictKey; cells: [Cell, Cell, Cell] }[] = [
  {
    labelKey: "promoRuntimeSetup",
    cells: ["promoRuntimeSetupPublic", "promoRuntimeSetupLocal", "promoRuntimeSetupDesktop"],
  },
  { labelKey: "promoRuntimePublicRepos", cells: [true, true, true] },
  { labelKey: "promoRuntimePrivateRepos", cells: [false, true, true] },
  {
    labelKey: "promoRuntimeFreshness",
    cells: ["promoRuntimeFreshnessPublic", "promoRuntimeLive", "promoRuntimeLive"],
  },
  { labelKey: "promoRuntimeDependabot", cells: [false, true, true] },
  {
    labelKey: "promoRuntimeToken",
    cells: ["promoRuntimeTokenPublic", "promoRuntimeTokenLocal", "promoRuntimeTokenDesktop"],
  },
  { labelKey: "promoRuntimeSession", cells: [false, false, true] },
  { labelKey: "promoRuntimeNative", cells: [false, false, true] },
];

export function PromoRuntimes() {
  const { t } = useApp();

  return (
    <section id="runtimes" className="mx-auto max-w-6xl scroll-mt-24 px-6 py-16 sm:py-20 md:px-8">
      <div className="max-w-3xl">
        <p className="font-mono text-micro font-semibold uppercase tracking-[0.18em] text-primary">
          {t("promoRuntimesKicker")}
        </p>
        <h2 className="mt-3 font-headline text-3xl font-semibold leading-tight text-foreground sm:text-4xl">
          {t("promoRuntimesTitle")}
        </h2>
        <p className="mt-4 text-base leading-7 text-foreground-muted">{t("promoRuntimesBody")}</p>
      </div>

      {/* `relative` keeps the absolutely positioned pieces inside this table
          (the "Recommended" tag and the screen-reader caption) from widening the
          page on narrow viewports; the scroll container still scrolls. */}
      <div className="relative mt-10 overflow-x-auto">
        <table className="w-full min-w-[46rem] border-collapse text-left text-sm">
          <caption className="sr-only">{t("promoRuntimesCaption")}</caption>
          <thead>
            <tr>
              <th scope="col" className="w-[26%] pb-4 align-bottom font-normal">
                <span className="font-mono text-micro uppercase tracking-[0.16em] text-foreground-subtle">
                  {t("promoRuntimeCapability")}
                </span>
              </th>
              {COLUMNS.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  className={cn(
                    "relative px-5 pb-4 pt-5 align-bottom font-normal",
                    column.key === "desktop" && "rounded-t-xl bg-surface-1 shadow-[inset_0_3px_0_hsl(var(--primary))]",
                  )}
                >
                  {column.key === "desktop" && (
                    <span className="absolute right-4 top-4 font-mono text-[0.6rem] uppercase tracking-[0.16em] text-primary">
                      {t("promoRuntimeRecommended")}
                    </span>
                  )}
                  <span className="block text-lg font-semibold text-foreground">{t(column.name)}</span>
                  <span className="text-xs text-foreground-subtle">{t(column.where)}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row) => (
              <tr key={row.labelKey} className="border-t border-border/70">
                <th scope="row" className="py-3.5 pr-4 font-medium text-foreground-muted">
                  {t(row.labelKey)}
                </th>
                {row.cells.map((cell, index) => (
                  <td
                    key={index}
                    className={cn("px-5 py-3.5", index === 2 && "bg-surface-1 font-medium")}
                  >
                    {typeof cell === "boolean" ? <FlagCell value={cell} /> : <span className="text-foreground-muted">{t(cell)}</span>}
                  </td>
                ))}
              </tr>
            ))}
            <tr className="border-t border-border/70">
              <td />
              <td className="px-5 pb-6 pt-4">
                <Link
                  to="/app"
                  className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border px-3 text-xs font-semibold text-foreground transition-colors hover:bg-surface-2"
                >
                  {t("promoRuntimeCtaPublic")}
                  <ArrowUpRight className="size-3.5" aria-hidden="true" />
                </Link>
              </td>
              <td className="px-5 pb-6 pt-4">
                <a
                  href={SITE_REPOSITORY_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border px-3 text-xs font-semibold text-foreground transition-colors hover:bg-surface-2"
                >
                  {t("promoRuntimeCtaLocal")}
                  <ArrowUpRight className="size-3.5" aria-hidden="true" />
                </a>
              </td>
              <td className="rounded-b-xl bg-surface-1 px-5 pb-6 pt-4">
                <a
                  href="#download"
                  className="inline-flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  {t("promoRuntimeCtaDesktop")}
                </a>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="mt-12 grid gap-4 border-t border-border/70 pt-8 md:grid-cols-12">
        <p className="font-mono text-micro uppercase tracking-[0.16em] text-foreground-subtle md:col-span-3">
          {t("promoRuntimeNeverTitle")}
        </p>
        <p className="font-mono text-sm text-foreground-subtle line-through decoration-critical decoration-2 md:col-span-9">
          {t("promoRuntimeNeverItems")}
        </p>
        <p className="text-sm leading-6 text-foreground-subtle md:col-span-9 md:col-start-4">{t("promoRuntimeNeverBody")}</p>
      </div>
    </section>
  );
}

function FlagCell({ value }: { value: boolean }) {
  const { t } = useApp();
  if (value) {
    return (
      <span className="inline-flex items-center gap-2 text-success">
        <Check className="size-4" strokeWidth={2.5} aria-hidden="true" />
        <span className="sr-only">{t("promoRuntimeYes")}</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center text-foreground-subtle">
      <Minus className="size-4" aria-hidden="true" />
      <span className="sr-only">{t("promoRuntimeNo")}</span>
    </span>
  );
}
