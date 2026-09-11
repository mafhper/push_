import type { HealthCategoryDefinition, HealthCategoryId } from "./types";

export const HEALTH_CATEGORIES: HealthCategoryDefinition[] = [
  { id: "governance", label: "Governance", weight: 15 },
  { id: "ci", label: "CI / Automation", weight: 20 },
  { id: "security", label: "Security", weight: 20 },
  { id: "dependencies", label: "Dependencies", weight: 10 },
  { id: "release", label: "Release Engineering", weight: 15 },
  { id: "deployment", label: "Deployment", weight: 10 },
  { id: "hygiene", label: "Repository Hygiene", weight: 10 },
];

const totalWeight = HEALTH_CATEGORIES.reduce((sum, category) => sum + category.weight, 0);

export function assertWeightsTotalHundred(): void {
  if (totalWeight !== 100) {
    throw new Error(`Health category weights must total 100, got ${totalWeight}`);
  }
}

export function getCategoryDefinition(id: HealthCategoryId): HealthCategoryDefinition {
  const definition = HEALTH_CATEGORIES.find((category) => category.id === id);
  if (!definition) {
    throw new Error(`Unknown health category: ${id}`);
  }
  return definition;
}