import { useId } from "react";
import { Minus, Plus } from "lucide-react";
import { useApp } from "@/contexts/useApp";
import {
  ATTENTION_ALERT_CAP_MAX,
  clampAlertCap,
  normalizeAttentionSettings,
  previewAttention,
} from "@/lib/attention";
import { cn } from "@/lib/utils";
import type { AttentionSettings, OverviewRepoSnapshot } from "@/types";

interface AttentionSettingsControlsProps {
  /** Repositories the preview counts; empty while the snapshot is loading. */
  repos: OverviewRepoSnapshot[];
  /**
   * Console cards provide the horizontal inset themselves (one row per line);
   * the public card is already padded, so its rows stay flush.
   */
  padded?: boolean;
}

/**
 * The three queue-emphasis controls and their live preview.
 *
 * Shared by the console settings chapter and the published settings page, so
 * the two runtimes cannot offer different behaviour. The controls write through
 * `updateSettings`, which persists `gl_settings` on the device: nothing here
 * needs a token, a network call or a refetch, and the published runtime
 * reorders the snapshot it already downloaded.
 */
export function AttentionSettingsControls({ repos, padded = true }: AttentionSettingsControlsProps) {
  const { settings, updateSettings, t } = useApp();
  const criticalId = useId();
  const criticalBodyId = useId();
  const failedId = useId();
  const failedBodyId = useId();
  const capBodyId = useId();
  const attention = normalizeAttentionSettings(settings.attention);
  const preview = previewAttention(repos, attention);

  const patch = (next: Partial<AttentionSettings>) => {
    updateSettings({ attention: { ...attention, ...next } });
  };

  return (
    <div className="divide-y divide-border/40">
      <div className={cn("grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 py-3.5", padded && "px-4")}>
        <div className="min-w-0">
          <p id={criticalId} className="text-sm font-medium text-foreground">
            {t("settingsAttentionCriticalAlerts")}
          </p>
          <p className="mt-1 text-sm leading-relaxed text-foreground-subtle">
            <span id={criticalBodyId}>{t("settingsAttentionCriticalAlertsBody")}</span>
          </p>
        </div>
        <Switch
          checked={attention.criticalAlerts}
          labelId={criticalId}
          describedById={criticalBodyId}
          onToggle={() => patch({ criticalAlerts: !attention.criticalAlerts })}
        />
      </div>

      <div className={cn("grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 py-3.5", padded && "px-4")}>
        <div className="min-w-0">
          <p id={failedId} className="text-sm font-medium text-foreground">
            {t("settingsAttentionFailedRuns")}
          </p>
          <p className="mt-1 text-sm leading-relaxed text-foreground-subtle">
            <span id={failedBodyId}>{t("settingsAttentionFailedRunsBody")}</span>
          </p>
        </div>
        <Switch
          checked={attention.failedRuns}
          labelId={failedId}
          describedById={failedBodyId}
          onToggle={() => patch({ failedRuns: !attention.failedRuns })}
        />
      </div>

      <div className={cn("flex flex-wrap items-center justify-between gap-x-4 gap-y-3 py-3.5", padded && "px-4")}>
        <div className="w-full min-w-0 sm:w-auto sm:flex-1">
          <p className="text-sm font-medium text-foreground">{t("settingsAttentionAlertCap")}</p>
          <p className="mt-1 text-sm leading-relaxed text-foreground-subtle">
            <span id={capBodyId}>{t("settingsAttentionAlertCapBody")}</span>
          </p>
        </div>
        <div
          role="group"
          aria-label={t("settingsAttentionAlertCap")}
          aria-describedby={capBodyId}
          className="flex h-9 shrink-0 items-center overflow-hidden rounded-lg border border-border/60 bg-surface-2/60"
        >
          <button
            type="button"
            aria-label={t("promoScoreLess")}
            disabled={attention.alertCap <= 0}
            onClick={() => patch({ alertCap: clampAlertCap(attention.alertCap - 1) })}
            className="grid size-9 place-items-center text-foreground-subtle transition-colors hover:text-foreground disabled:opacity-40 disabled:hover:text-foreground-subtle focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <Minus size={16} aria-hidden="true" />
          </button>
          <span aria-live="polite" aria-atomic="true" className="w-16 text-center font-mono text-sm tabular-nums text-foreground">
            {t("settingsAttentionAlertCapValue", { count: attention.alertCap })}
          </span>
          <button
            type="button"
            aria-label={t("promoScoreMore")}
            disabled={attention.alertCap >= ATTENTION_ALERT_CAP_MAX}
            onClick={() => patch({ alertCap: clampAlertCap(attention.alertCap + 1) })}
            className="grid size-9 place-items-center text-foreground-subtle transition-colors hover:text-foreground disabled:opacity-40 disabled:hover:text-foreground-subtle focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <Plus size={16} aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className={cn("py-3.5", padded && "px-4")}>
        <p className="text-micro font-semibold uppercase tracking-wider text-foreground-subtle">
          {t("settingsAttentionPreviewLabel")}
        </p>
        <p
          aria-live="polite"
          aria-atomic="true"
          data-testid="attention-preview"
          className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-foreground"
        >
          <span className="inline-flex items-center gap-1.5">
            <span className="font-mono font-semibold tabular-nums">{preview.critical}</span>{" "}
            <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-critical" />
            <span className="text-micro font-semibold uppercase tracking-wider text-foreground-subtle">
              {t("promoStatusCritical")}
            </span>
          </span>{" "}
          <span aria-hidden="true" className="text-foreground-subtle/60">
            ·
          </span>{" "}
          <span className="inline-flex items-center gap-1.5">
            <span className="font-mono font-semibold tabular-nums">{preview.warning}</span>{" "}
            <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-warning" />
            <span className="text-micro font-semibold uppercase tracking-wider text-foreground-subtle">
              {t("promoStatusWarning")}
            </span>
          </span>
        </p>
        <p className="mt-1.5 text-sm leading-relaxed text-foreground-subtle">
          {t("settingsAttentionHonesty")}
        </p>
      </div>
    </div>
  );
}

/**
 * A 24×44 track inside a 44px hit area, so the target holds on touch as well
 * as with a mouse. The thumb travels 20px between the two positions, so the
 * state reads from position, not from colour alone.
 *
 * Non-text contrast, measured 2026-10-20 across the seven themes: thumb against
 * track is at least 4.11:1 (checked) and 3.88:1 (unchecked), which clears 1.4.11.
 * The unchecked track against the card is 1.24–1.39:1 — `surface-3` sits close
 * to the reading surface by design, so the track boundary is **not** a 3:1 edge;
 * what identifies the control is the thumb, which does clear it. Do not read
 * this as a clean pass on the boundary.
 */
function Switch({
  checked,
  labelId,
  describedById,
  onToggle,
}: {
  checked: boolean;
  labelId: string;
  describedById: string;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-labelledby={labelId}
      aria-describedby={describedById}
      onClick={onToggle}
      className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <span
        aria-hidden="true"
        className={cn(
          "relative block h-6 w-11 rounded-full transition-colors motion-reduce:transition-none",
          checked ? "bg-primary" : "bg-surface-3",
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            "absolute left-0.5 top-0.5 size-5 rounded-full shadow-xs transition-[transform,background-color] motion-reduce:transition-none",
            checked ? "translate-x-5 bg-background" : "bg-foreground-subtle",
          )}
        />
      </span>
    </button>
  );
}
