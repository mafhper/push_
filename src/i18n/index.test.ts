import { describe, expect, it } from "vitest";
import { dict, resolveLanguage, technicalGlossary, translate } from "@/i18n";

describe("i18n", () => {
  it("resolves supported browser locales", () => {
    expect(resolveLanguage("en-US")).toBe("en");
    expect(resolveLanguage("pt-BR")).toBe("pt-BR");
    expect(resolveLanguage("pt-PT")).toBe("pt-BR");
    expect(resolveLanguage("es-ES")).toBe("es");
    expect(resolveLanguage("fr-FR")).toBe("en");
  });

  it("keeps locale dictionaries aligned", () => {
    const baseKeys = Object.keys(dict.en).sort();
    expect(Object.keys(dict["pt-BR"]).sort()).toEqual(baseKeys);
    expect(Object.keys(dict.es).sort()).toEqual(baseKeys);
  });

  it("preserves reserved technical terms", () => {
    expect(technicalGlossary.push).toBe("push");
    expect(technicalGlossary.commit).toBe("commit");
    expect(dict["pt-BR"].workflow).toBe("Workflow");
    expect(dict.es.workflow).toBe("Workflow");
    expect(dict["pt-BR"].lastPushLabel).toContain("push");
    expect(dict.es.lastPushLabel).toContain("push");
  });

  it("falls back safely when a key is not present", () => {
    expect(translate("en", "__missing_key__" as never)).toBe("__missing_key__");
  });
});
