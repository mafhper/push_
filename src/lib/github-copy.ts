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

  if (normalized.includes("no active issues")) {
    return t("dependabotReturnedNoIssues");
  }

  return reason;
}
