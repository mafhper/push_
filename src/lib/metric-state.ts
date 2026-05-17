export function isZeroMetricValue(value: unknown) {
  if (typeof value === "number") return value === 0;
  if (typeof value === "string") return value.trim() === "0";
  return false;
}
