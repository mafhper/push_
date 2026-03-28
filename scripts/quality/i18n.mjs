import { extractFlatEntries, failIfAny, readText } from "./common.mjs";

const localeFiles = {
  en: "src/i18n/locales/en.ts",
  "pt-BR": "src/i18n/locales/pt-BR.ts",
  es: "src/i18n/locales/es.ts",
};

const reservedTermBans = {
  "pt-BR": [
    /\bmesclar\b/i,
    /\bmesclado\b/i,
    /\bfluxo de trabalho\b/i,
    /\bramo\b/i,
    /\bbifurca[cç][aã]o\b/i,
  ],
  es: [
    /\bmezclar\b/i,
    /\bmezclado\b/i,
    /\bflujo de trabajo\b/i,
    /\brama\b/i,
    /\bbifurcaci[oó]n\b/i,
  ],
};

const referenceEntries = extractFlatEntries(localeFiles.en);
const referenceKeys = [...referenceEntries.keys()];
const errors = [];

for (const [locale, file] of Object.entries(localeFiles)) {
  const entries = extractFlatEntries(file);
  const missing = referenceKeys.filter((key) => !entries.has(key));
  const extra = [...entries.keys()].filter((key) => !referenceEntries.has(key));

  if (missing.length > 0) {
    errors.push(`${file} is missing keys: ${missing.join(", ")}`);
  }

  if (extra.length > 0) {
    errors.push(`${file} has extra keys: ${extra.join(", ")}`);
  }

  if (locale !== "en") {
    const content = readText(file);
    for (const pattern of reservedTermBans[locale] ?? []) {
      if (pattern.test(content)) {
        errors.push(`${file} translates a reserved Git term matched by ${pattern}`);
      }
    }
  }
}

failIfAny(errors);
