import { ArrowRight } from "lucide-react";
import { useState } from "react";
import { useApp } from "@/contexts/useApp";
import { cn } from "@/lib/utils";
import {
  FIELD_SCORE_SCALE,
  PROMO_FLEET,
  STATUS_DOT,
  STATUS_TEXT,
  describeSignals,
  fleetRepoAt,
  statusLabelKey,
  statusOf,
  type PromoStatus,
} from "./promoFleet";
import type { HandlePreviewState } from "./promoHandle";

type Filter = "all" | PromoStatus;
const FILTERS: Filter[] = ["all", "critical", "warning", "healthy"];

interface PromoQueueCardProps {
  handle: HandlePreviewState;
  onRawChange: (raw: string) => void;
  onApply: () => void;
  hover: number | null;
  onHover: (index: number | null) => void;
}

export function PromoQueueCard({ handle, onRawChange, onApply, hover, onHover }: PromoQueueCardProps) {
  const { t } = useApp();
  const [filter, setFilter] = useState<Filter>("all");

  const count = (value: Filter) =>
    PROMO_FLEET.filter((repo) => value === "all" || statusOf(repo.score) === value).length;
  const isShown = (index: number) => filter === "all" || statusOf(fleetRepoAt(index).score) === filter;
  const filterLabel = (value: Filter) => (value === "all" ? t("promoQueueFilterAll") : t(statusLabelKey(value)));

  return (
    <aside
      aria-labelledby="promo-queue-title"
      className="relative rounded-xl border border-border/70 bg-surface-1/85 shadow-2xl shadow-background/40 backdrop-blur-md"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 px-4 py-3">
        <div>
          <h2 id="promo-queue-title" className="font-headline text-title font-semibold text-foreground">
            {t("promoQueueTitle")}
          </h2>
          <p className="font-mono text-micro text-foreground-subtle">{t("promoQueueSubtitle")}</p>
        </div>
        <div className="flex gap-0.5 rounded-md bg-surface-2 p-0.5" role="group" aria-label={t("promoQueueFilterLabel")}>
          {FILTERS.map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={filter === value}
              onClick={() => setFilter(value)}
              className="rounded px-2 py-1 text-micro font-semibold text-foreground-subtle transition-colors aria-pressed:bg-surface-1 aria-pressed:text-foreground aria-pressed:shadow-sm"
            >
              {filterLabel(value)} <span className="font-mono opacity-60">{count(value)}</span>
            </button>
          ))}
        </div>
      </div>

      <form
        className="border-b border-border/70 px-4 py-3"
        onSubmit={(event) => {
          event.preventDefault();
          onApply();
        }}
      >
        <label htmlFor="promo-handle" className="sr-only">
          {t("promoQueueHandleLabel")}
        </label>
        <div
          className={cn(
            "flex items-center gap-1.5 rounded-lg border bg-background/60 px-2.5 transition-colors focus-within:border-primary",
            handle.error ? "border-critical" : "border-border",
          )}
        >
          <span aria-hidden="true" className="font-mono text-sm text-foreground-subtle">
            @
          </span>
          <input
            id="promo-handle"
            value={handle.raw}
            onChange={(event) => onRawChange(event.target.value)}
            placeholder={t("promoQueueHandlePlaceholder")}
            aria-invalid={handle.error || undefined}
            aria-describedby="promo-handle-status"
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            className="h-9 min-w-0 flex-1 bg-transparent font-mono text-sm text-foreground outline-none placeholder:text-foreground-subtle"
          />
          <button
            type="submit"
            className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-micro font-semibold text-foreground-muted transition-colors hover:bg-surface-2 hover:text-foreground"
          >
            {t("promoQueueHandleApply")}
            <ArrowRight className="size-3" aria-hidden="true" />
          </button>
        </div>
        <p
          id="promo-handle-status"
          aria-live="polite"
          className={cn("mt-2 text-micro leading-snug", handle.error ? "text-critical" : "text-foreground-subtle")}
        >
          {handle.error
            ? t("promoQueueHandleInvalid")
            : handle.sample
              ? t("promoQueueHandleSample", { handle: handle.applied })
              : t("promoQueueHandlePreview", { handle: handle.applied })}
        </p>
      </form>

      <ol>
        {PROMO_FLEET.map((repo, index) => {
          const status = statusOf(repo.score);
          if (!isShown(index)) return null;
          return (
            <li
              key={repo.name}
              tabIndex={0}
              onMouseEnter={() => onHover(index)}
              onMouseLeave={() => onHover(null)}
              onFocus={() => onHover(index)}
              onBlur={() => onHover(null)}
              className={cn(
                "grid grid-cols-[1.25rem_auto_auto_1fr_auto] items-center gap-3 border-b border-border/60 px-4 py-2.5 outline-none transition-colors last:border-b-0 focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-primary",
                hover === index ? "bg-surface-2" : "",
              )}
            >
              <span className="font-mono text-micro text-foreground-subtle">{String(index + 1).padStart(2, "0")}</span>
              <span className={cn("block size-2 rounded-full ring-2 ring-background", STATUS_DOT[status])} aria-hidden="true" />
              <span className="grid size-6 place-items-center rounded-sm border border-border/70 font-mono text-[0.6rem] font-semibold text-foreground-muted">
                {repo.mark}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-foreground">
                  <span className="font-normal text-foreground-subtle">@{handle.applied}/</span>
                  {repo.name}
                </span>
                <span className="mt-1 flex items-center gap-2">
                  <span className="h-[3px] w-20 overflow-hidden rounded-full bg-surface-2">
                    <span
                      className={cn("block h-full rounded-full", STATUS_DOT[status])}
                      style={{ width: `${Math.min(100, (repo.score / FIELD_SCORE_SCALE) * 100)}%` }}
                    />
                  </span>
                  <span className="truncate text-[0.7rem] text-foreground-subtle">{describeSignals(repo, t)}</span>
                </span>
              </span>
              <span className={cn("font-mono text-base font-semibold tabular-nums", STATUS_TEXT[status])}>{repo.score}</span>
            </li>
          );
        })}
      </ol>

      <p className="flex items-center justify-between gap-3 rounded-b-xl border-t border-border/70 bg-surface-2/60 px-4 py-2.5 text-[0.72rem] text-foreground-subtle">
        <span>{t("promoQueueHoverHint")}</span>
        <span className="font-mono max-sm:hidden">{t("promoQueueScale", { max: FIELD_SCORE_SCALE })}</span>
      </p>
    </aside>
  );
}
