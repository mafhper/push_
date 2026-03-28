export const technicalGlossary = {
  push: "push",
  commit: "commit",
  merge: "merge",
  fork: "fork",
  branch: "branch",
  workflow: "workflow",
  token: "token",
} as const;

export type TechnicalTerm = keyof typeof technicalGlossary;
