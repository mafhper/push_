import { useState } from "react";
import { TriangleAlert } from "lucide-react";
import { useApp } from "@/contexts/useApp";
import { cn } from "@/lib/utils";
import {
  ACCOUNT_LOCAL_KEYS,
  ACCOUNT_LOCAL_PREFIXES,
  clearAccountLocalData,
} from "@/services/account-data";

type PendingAction = "keepToken" | "keepRepos" | "clearData";

type MixedAccountBannerProps = {
  /** Account the current token belongs to. */
  login: string;
  /** Owners among the selection that are not `login`. */
  owners: readonly string[];
  /** How many selected repositories belong to those owners. */
  repoCount: number;
  /**
   * `full` is the persistent banner in the access chapter, with the three
   * reconciliation actions. `compact` is the warning where the wrong numbers
   * actually appear (the quota chapter), with a link back to the actions.
   */
  variant?: "full" | "compact";
  /** Called after an action succeeds, so the page can keep the status line visible. */
  onResolved?: (message: string) => void;
  testId?: string;
};

/**
 * One token, two accounts (PU14).
 *
 * The selection is stored per installation, so a token swap leaves the previous
 * account's repositories selected. This banner never reconciles by itself: it
 * names the mismatch and offers three explicit paths, each behind a
 * confirmation. Deleting local data is the only destructive one, and it lists
 * exactly what it removes.
 */
export function MixedAccountBanner({
  login,
  owners,
  repoCount,
  variant = "full",
  onResolved,
  testId,
}: MixedAccountBannerProps) {
  const { t, logout, clearSelection } = useApp();
  const [pending, setPending] = useState<PendingAction | null>(null);
  const ownersLabel = owners.join(", ");

  const body = t("mixedAccountBody", { login, count: repoCount, owners: ownersLabel });

  if (variant === "compact") {
    return (
      <div
        data-testid={testId ?? "quota-account-mismatch"}
        className="rounded-xl border border-warning/30 bg-warning/5 px-4 py-3.5"
      >
        <div className="flex items-start gap-2">
          <TriangleAlert size={14} className="mt-0.5 shrink-0 text-warning" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-foreground">{t("mixedAccountTitle")}</p>
            <p className="mt-1 text-[13px] leading-relaxed text-foreground-subtle">{body}</p>
            <button
              type="button"
              onClick={() => {
                document.getElementById("settings-access")?.scrollIntoView?.({ behavior: "smooth", block: "start" });
              }}
              className="mt-1.5 text-[12px] font-medium text-primary transition-opacity hover:opacity-80"
            >
              {t("quotaForeignReposAction")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const actions: { id: PendingAction; label: string; hint: string; confirm: string }[] = [
    {
      id: "keepToken",
      label: t("mixedAccountKeepToken"),
      hint: t("mixedAccountKeepTokenHint"),
      confirm: t("mixedAccountConfirmKeepToken"),
    },
    {
      id: "keepRepos",
      label: t("mixedAccountKeepRepos"),
      hint: t("mixedAccountKeepReposHint", { owners: ownersLabel }),
      confirm: t("mixedAccountConfirmKeepRepos"),
    },
    {
      id: "clearData",
      label: t("mixedAccountClearData"),
      hint: t("mixedAccountClearDataHint"),
      confirm: t("mixedAccountConfirmClearData"),
    },
  ];

  function confirmPending() {
    if (!pending) return;
    if (pending === "keepToken") {
      clearSelection();
      onResolved?.(t("mixedAccountResolved", { login }));
    } else if (pending === "keepRepos") {
      onResolved?.(t("mixedAccountTokenRemoved", { owners: ownersLabel }));
      logout();
    } else {
      // `clearSelection` removes the keys instead of writing empty values, so
      // the deletion below has nothing to restore.
      clearSelection();
      clearAccountLocalData();
      onResolved?.(t("mixedAccountResolved", { login }));
    }
    setPending(null);
  }

  const pendingAction = actions.find((action) => action.id === pending) ?? null;

  return (
    <div
      data-testid={testId ?? "mixed-account-banner"}
      className="rounded-xl border border-warning/30 bg-warning/5 px-4 py-3.5"
    >
      <div className="flex items-start gap-2">
        <TriangleAlert size={14} className="mt-0.5 shrink-0 text-warning" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground">{t("mixedAccountTitle")}</p>
          <p className="mt-1 text-[13px] leading-relaxed text-foreground-subtle">{body}</p>

          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            {actions.map((action) => (
              <button
                key={action.id}
                type="button"
                onClick={() => setPending(action.id)}
                aria-expanded={pending === action.id}
                className={cn(
                  "rounded-lg border px-3 py-2 text-left transition-colors",
                  action.id === "clearData"
                    ? "border-critical/30 bg-critical/5 hover:border-critical/50"
                    : "border-border/60 bg-surface-2/50 hover:border-primary/40",
                  pending === action.id && "ring-1 ring-primary/40",
                )}
              >
                <span className={cn(
                  "block text-[13px] font-semibold",
                  action.id === "clearData" ? "text-critical" : "text-foreground",
                )}>
                  {action.label}
                </span>
                <span className="mt-0.5 block text-[11px] leading-relaxed text-foreground-subtle">{action.hint}</span>
              </button>
            ))}
          </div>

          {pendingAction && (
            <div
              role="group"
              aria-label={pendingAction.confirm}
              className="mt-3 rounded-lg border border-border/60 bg-surface-1/70 p-3"
            >
              <p className="text-[13px] font-medium text-foreground">{pendingAction.confirm}</p>

              {pendingAction.id === "clearData" && (
                <>
                  <p className="mt-1 text-[11px] font-semibold uppercase tracking-wider text-foreground-subtle">
                    {t("mixedAccountClearDataKeys")}
                  </p>
                  <ul className="mt-1 grid gap-0.5 font-mono text-[11px] text-foreground-subtle/80 sm:grid-cols-2">
                    {ACCOUNT_LOCAL_KEYS.map((key) => <li key={key}>{key}</li>)}
                    {ACCOUNT_LOCAL_PREFIXES.map((prefix) => <li key={prefix}>{prefix}*</li>)}
                  </ul>
                </>
              )}

              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={confirmPending}
                  className={cn(
                    "inline-flex h-8 items-center rounded-md px-3 text-[13px] font-semibold transition-colors",
                    pendingAction.id === "clearData"
                      ? "bg-critical/15 text-critical hover:bg-critical/20"
                      : "bg-primary text-primary-foreground hover:opacity-90",
                  )}
                >
                  {t("mixedAccountConfirm")}
                </button>
                <button
                  type="button"
                  onClick={() => setPending(null)}
                  className="inline-flex h-8 items-center rounded-md border border-border/60 bg-surface-2/70 px-3 text-[13px] font-medium text-foreground-subtle transition-colors hover:text-foreground"
                >
                  {t("mixedAccountCancel")}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
