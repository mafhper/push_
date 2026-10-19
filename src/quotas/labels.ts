import type { DictKey } from "@/i18n";
import type { QuotaFamilyId, QuotaOrigin, QuotaStatus, QuotaUnit } from "./types";

/**
 * Copy keys for the quota surfaces. Kept here so the settings cards and the
 * alerts banner label the same family (and the same status) identically —
 * two maps would drift the day one of them gains a family.
 */
export const QUOTA_FAMILY_LABEL_KEYS: Record<QuotaFamilyId, DictKey> = {
  actionsMinutes: "quotaActionsMinutes",
  actionsStorage: "quotaActionsStorage",
  sharedStorage: "quotaSharedStorage",
  packages: "quotaPackages",
};

export const QUOTA_STATUS_LABEL_KEYS: Record<QuotaStatus, DictKey> = {
  normal: "quotaStatusNormal",
  warning: "quotaStatusWarning",
  critical: "quotaStatusCritical",
  exceeded: "quotaStatusExceeded",
  unknown: "quotaStatusUnknown",
};

export const QUOTA_UNIT_LABEL_KEYS: Record<QuotaUnit, DictKey> = {
  minutes: "quotaUnitMinutes",
  mb: "quotaUnitMb",
  gbHours: "quotaUnitGbHours",
};

export const QUOTA_ORIGIN_LABEL_KEYS: Record<QuotaOrigin, DictKey> = {
  billing: "quotaOriginBilling",
  legacy: "quotaOriginLegacy",
};
