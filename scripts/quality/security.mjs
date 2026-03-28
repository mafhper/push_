import { walk, failIfAny, toRelative } from "./common.mjs";
import { readFileSync } from "node:fs";

const files = walk("src", (file) => /\.(ts|tsx)$/.test(file));
const errors = [];

for (const file of files) {
  const relative = toRelative(file);
  const text = readFileSync(file, "utf8");

  if (text.includes("dangerouslySetInnerHTML")) {
    errors.push(`${relative} uses dangerouslySetInnerHTML`);
  }

  const blankTargets = [...text.matchAll(/<a[^>]*target=["']_blank["'][^>]*>/g)];
  for (const match of blankTargets) {
    if (!/rel=["']noopener noreferrer["']/.test(match[0])) {
      errors.push(`${relative} has target="_blank" without rel="noopener noreferrer"`);
    }
  }

  if (relative !== "src/i18n/index.ts" && /navigator\.language|navigator\.languages/.test(text)) {
    errors.push(`${relative} accesses navigator language directly`);
  }

  for (const match of text.matchAll(/(?:localStorage|sessionStorage)\.setItem\(\s*["'`]([^"'`]+)["'`]/g)) {
    if (/(token|auth|session|jwt|refresh)/i.test(match[1])) {
      errors.push(`${relative} persists sensitive storage key "${match[1]}"`);
    }
  }

  for (const match of text.matchAll(/use(?:Local|Session)Storage(?:<[^>]+>)?\(\s*["'`]([^"'`]+)["'`]/g)) {
    if (/(token|auth|session|jwt|refresh)/i.test(match[1])) {
      errors.push(`${relative} uses sensitive persisted key "${match[1]}"`);
    }
  }
}

failIfAny(errors);
