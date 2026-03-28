import { readFileSync } from "node:fs";
import { failIfAny, readText, toRelative, walk } from "./common.mjs";

const errors = [];
const siteConfig = readText("src/config/site.ts");

if (/label:\s*"/.test(siteConfig) || /meta:\s*"/.test(siteConfig)) {
  errors.push("src/config/site.ts still uses hardcoded route labels or meta values");
}

const sourceFiles = walk("src", (file) => /\.(ts|tsx)$/.test(file));
for (const file of sourceFiles) {
  const relative = toRelative(file);
  const text = readFileSync(file, "utf8");

  if (!relative.startsWith("src/i18n/") && /from ["']@\/i18n\/locales\//.test(text)) {
    errors.push(`${relative} imports locale files directly`);
  }

  if (relative !== "src/i18n/dictionaries.ts" && /from ["']@\/i18n\/dictionaries["']/.test(text)) {
    errors.push(`${relative} imports the compatibility dictionary shim directly`);
  }
}

const englishSourceFiles = walk("src", (file) => {
  const relative = toRelative(file);
  return /\.(ts|tsx)$/.test(file)
    && !relative.includes("/i18n/locales/")
    && !relative.includes(".test.")
    && !relative.startsWith("src/test/");
});

const mixedLanguageMarkers = [
  /configura[cç][aã]o/i,
  /\breposit[oó]ri[oa]s?\b/i,
  /\balertas\b/i,
  /\bcarregando\b/i,
  /\bnenhum\b/i,
  /\bsess[aã]o\b/i,
  /\bseguran[cç]a\b/i,
  /\bvis[aã]o\b/i,
  /\bp[úu]blico\b/i,
  /\bfallo\b/i,
  /\bcargando\b/i,
  /\bning[uú]n\b/i,
  /\bseguridad\b/i,
  /\bsesi[oó]n\b/i,
];

for (const file of englishSourceFiles) {
  const relative = toRelative(file);
  const text = readFileSync(file, "utf8");
  for (const pattern of mixedLanguageMarkers) {
    if (pattern.test(text)) {
      errors.push(`${relative} still contains non-English source copy matched by ${pattern}`);
      break;
    }
  }
}

for (const file of ["README.md", "README.pt-BR.md", "README.es.md", ".github/workflows/pages.yml"]) {
  const text = readText(file);
  if (/\bbun\s+(install|run)\b/i.test(text)) {
    errors.push(`${file} still references Bun`);
  }
}

failIfAny(errors);
