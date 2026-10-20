import { ArrowRight, ArrowUpRight } from "lucide-react";
import { useMemo, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router";
import { APP_VERSION, SITE_REPOSITORY_URL } from "@/config/site";
import { useApp } from "@/contexts/useApp";
import { cn } from "@/lib/utils";
import { PressureField, type FieldSource } from "./PressureField";
import { PromoQueueCard } from "./PromoQueueCard";
import {
  PROMO_FLEET,
  SCORE_THRESHOLDS,
  STATUS_DOT,
  STATUS_TEXT,
  fieldAmplitude,
  statusOf,
} from "./promoFleet";
import { INITIAL_HANDLE_PREVIEW, applyHandlePreview, editHandlePreview, type HandlePreviewState } from "./promoHandle";

export function PromoHero() {
  const { t } = useApp();
  const heroRef = useRef<HTMLElement | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  const [handle, setHandle] = useState<HandlePreviewState>(INITIAL_HANDLE_PREVIEW);

  const sources = useMemo<FieldSource[]>(
    () =>
      PROMO_FLEET.map((repo, index) => ({
        x: repo.at[0],
        y: repo.at[1],
        amp: fieldAmplitude(repo.score, hover === index),
      })),
    [hover],
  );

  return (
    <section ref={heroRef} className="relative overflow-hidden border-b border-border/70 bg-promo-hero-bg">
      <PressureField
        sources={sources}
        pointerTarget={heroRef}
        className="[mask-image:radial-gradient(ellipse_46%_46%_at_28%_44%,transparent_26%,black_82%)] max-lg:[mask-image:linear-gradient(to_bottom,transparent_6%,black_58%)]"
      />

      <div aria-hidden="true" className="pointer-events-none absolute inset-0 hidden lg:block">
        {PROMO_FLEET.map((repo, index) => {
          const status = statusOf(repo.score);
          const active = hover === index;
          const flip = repo.at[0] > 0.75;
          return (
            <div
              key={repo.name}
              className={cn("absolute transition-opacity duration-300", active ? "opacity-100" : "opacity-70")}
              style={{
                left: `${repo.at[0] * 100}%`,
                top: `${repo.at[1] * 100}%`,
                transform: flip ? "translate(calc(-100% + 6px), -50%)" : "translate(-6px, -50%)",
              }}
            >
              <span className={cn("relative flex items-center gap-2", flip && "flex-row-reverse")}>
                <span className="relative grid size-3 place-items-center">
                  {active && <span className={cn("absolute inset-0 rounded-full opacity-60", STATUS_DOT[status])} />}
                  <span className={cn("size-2 rounded-full ring-2 ring-promo-hero-bg", STATUS_DOT[status])} />
                </span>
                <span
                  className={cn(
                    "min-w-0 max-w-[10rem] truncate rounded-sm px-1 font-mono text-[0.68rem] leading-tight transition-colors",
                    active ? "bg-foreground text-background" : "bg-promo-hero-bg/70 text-foreground-muted",
                  )}
                >
                  <b className={cn("font-semibold", active ? "" : STATUS_TEXT[status])}>{repo.score}</b> {repo.name}
                </span>
              </span>
            </div>
          );
        })}
      </div>

      <div className="relative z-10 mx-auto grid max-w-6xl gap-12 px-6 pb-14 pt-14 sm:px-8 lg:grid-cols-[1.02fr_1fr] lg:items-center lg:gap-14 lg:pb-20 lg:pt-20">
        <div className="max-w-2xl">
          <p className="flex flex-wrap items-center gap-3 font-mono text-micro uppercase tracking-[0.16em] text-foreground-muted">
            <span className="rounded-sm border border-border px-1.5 py-0.5 text-foreground">v{APP_VERSION}</span>
            {t("promoHeroBadge")}
          </p>
          <h1 className="mt-6 font-headline text-4xl font-semibold leading-[0.98] text-foreground sm:text-5xl lg:text-6xl">
            {t("promoHeroTitleLead")}{" "}
            <span className="block">
              {t("promoHeroTitleMid")} <span className="text-critical">{t("promoHeroTitleAccent")}</span>
            </span>
          </h1>
          <p className="mt-6 max-w-[34rem] text-base leading-7 text-foreground-muted sm:text-lg sm:leading-8">
            {t("promoHeroBody")}
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              to="/app"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              {t("promoHeroPrimaryCta")}
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
            <a
              href={SITE_REPOSITORY_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-border bg-promo-hero-bg/40 px-5 text-sm font-semibold text-foreground backdrop-blur-sm transition-colors hover:bg-surface-1/80"
            >
              {t("promoHeroSecondaryCta")}
              <ArrowUpRight className="size-4" aria-hidden="true" />
            </a>
          </div>
          <p className="mt-5 max-w-[32rem] text-sm leading-6 text-foreground-muted">{t("promoHeroFootnote")}</p>
        </div>

        <PromoQueueCard
          handle={handle}
          onRawChange={(raw) => setHandle((state) => editHandlePreview(state, raw))}
          onApply={() => setHandle((state) => applyHandlePreview(state, state.raw))}
          hover={hover}
          onHover={setHover}
        />
      </div>

      <PromoLegend handle={handle} />
    </section>
  );
}

/**
 * The appositive after the middle dot ("· Dependabot") is supplementary detail.
 * Keeping it in its own span lets it drop before the label itself needs room:
 * below `xl` it is not rendered, and above it stays attached to its shorthand.
 */
function splitLegendLabel(label: string): { shorthand: string; detail: string | null } {
  const separator = " · ";
  const index = label.indexOf(separator);
  if (index < 0) return { shorthand: label, detail: null };
  return { shorthand: label.slice(0, index), detail: label.slice(index + separator.length) };
}

function LegendItem({ icon, label }: { icon: ReactNode; label: string }) {
  const { shorthand, detail } = splitLegendLabel(label);
  return (
    <span className="flex items-center gap-2">
      {icon}
      <span className="min-w-0">
        <span className="whitespace-nowrap">{shorthand}</span>
        {detail ? (
          <span className="hidden whitespace-nowrap xl:inline">
            {" · "}
            {detail}
          </span>
        ) : null}
      </span>
    </span>
  );
}

export function PromoLegend({ handle }: { handle: HandlePreviewState }) {
  const { t } = useApp();
  return (
    <div className="relative z-10 border-t border-border/70 bg-promo-hero-bg/80 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-6 py-3 font-mono text-micro text-foreground-muted sm:px-8">
        <span className="text-foreground">{t("promoHeroLegendTitle")}</span>
        <span>{t("promoHeroLegendInterval")}</span>
        <LegendItem
          icon={
            <span
              aria-hidden="true"
              className="inline-block h-3 w-5 shrink-0 rounded-sm border border-critical/60 text-critical"
              style={{ backgroundImage: "repeating-linear-gradient(45deg, currentColor 0 1px, transparent 1px 4px)" }}
            />
          }
          label={t("promoHeroLegendCritical", { threshold: SCORE_THRESHOLDS.critical })}
        />
        <LegendItem
          icon={<span aria-hidden="true" className="inline-block h-0.5 w-5 shrink-0 bg-warning" />}
          label={t("promoHeroLegendWarning", { threshold: SCORE_THRESHOLDS.warning })}
        />
        <LegendItem
          icon={<span aria-hidden="true" className="inline-block h-px w-5 shrink-0 bg-foreground-muted" />}
          label={t("promoHeroLegendHealthy")}
        />
        <span className="ml-auto max-md:hidden">
          {handle.sample
            ? t("promoHeroLegendSample", { handle: handle.applied })
            : t("promoHeroLegendPreview", { handle: handle.applied })}
        </span>
      </div>
    </div>
  );
}
