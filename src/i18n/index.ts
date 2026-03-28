import { technicalGlossary } from "@/i18n/glossary";
import { en, type MessageDictionary } from "@/i18n/locales/en";
import { ptBR } from "@/i18n/locales/pt-BR";
import { es } from "@/i18n/locales/es";

export const dict = {
  en,
  "pt-BR": ptBR,
  es,
} as const;

export type Language = keyof typeof dict;
export type DictKey = keyof MessageDictionary;

export const languageLabels: Record<Language, string> = {
  en: "English",
  "pt-BR": "Português (Brasil)",
  es: "Español",
};

export function resolveLanguage(value?: string | null): Language {
  const normalized = value?.trim().toLowerCase() ?? "";
  if (normalized.startsWith("pt")) return "pt-BR";
  if (normalized.startsWith("es")) return "es";
  return "en";
}

export function detectBrowserLanguage(): Language {
  if (typeof navigator === "undefined") return "en";
  return resolveLanguage(navigator.languages?.[0] || navigator.language);
}

export function translate(language: Language, key: DictKey): string {
  return dict[language]?.[key] || dict.en[key] || key;
}

export function interpolate(message: string, values?: Record<string, string | number>): string {
  if (!values) return message;
  return Object.entries(values).reduce((text, [key, value]) => {
    const pattern = new RegExp(`\\{${key}\\}`, "g");
    return text.replace(pattern, String(value));
  }, message);
}

export function getIntlLocale(language: Language): string {
  if (language === "pt-BR") return "pt-BR";
  if (language === "es") return "es-ES";
  return "en-US";
}

export function formatDate(value: string | number | Date, language: Language, options?: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat(getIntlLocale(language), options).format(new Date(value));
}

export function formatDateTime(value: string | number | Date, language: Language, options?: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat(getIntlLocale(language), {
    dateStyle: "medium",
    timeStyle: "short",
    ...options,
  }).format(new Date(value));
}

export { technicalGlossary };
