import type { DictKey } from "@/i18n";

export function resolveDependabotReason(
  reason: string | null | undefined,
  t: (key: DictKey, values?: Record<string, string | number>) => string,
  fallbackKey: DictKey = "dependabotUnavailableBody",
) {
  if (!reason) return t(fallbackKey);

  const normalized = reason.toLowerCase();
  if (normalized.includes("authenticated access")) {
    return t("dependabotRequiresAuth");
  }

  if (normalized.includes("refused dependabot") || normalized.includes("check token scopes")) {
    return t("dependabotForbiddenDetail");
  }

  if (normalized.includes("not enabled") || normalized.includes("feature may be disabled") || normalized.includes("repository data not found")) {
    return t("dependabotRepoUnavailable");
  }

  if (normalized.includes("no commits")) {
    return t("dependabotRepoEmpty");
  }

  if (normalized.includes("no active issues")) {
    return t("dependabotReturnedNoIssues");
  }

  return reason;
}
