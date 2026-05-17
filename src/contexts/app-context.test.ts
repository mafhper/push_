import { describe, expect, it, vi } from "vitest";
import { detectTheme, normalizeTheme } from "@/contexts/app-context";

describe("app theme detection", () => {
  it("detects the light theme from browser preference", () => {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn((query: string) => ({
      matches: query === "(prefers-color-scheme: light)",
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
      })),
    });

    expect(detectTheme()).toBe("light");
  });

  it("normalizes legacy and invalid theme values to supported themes", () => {
    expect(normalizeTheme("light")).toBe("light");
    expect(normalizeTheme("dark")).toBe("dark");
    expect(normalizeTheme("phosphor-green")).toBe("phosphor-green");
    expect(normalizeTheme("golden-matrix")).toBe("golden-matrix");
    expect(normalizeTheme("blue-calm")).toBe("blue-calm");
    expect(normalizeTheme("green-ish")).toBe("green-ish");
    expect(normalizeTheme("brown-earth")).toBe("brown-earth");
    expect(normalizeTheme("terminal")).toBe("dark");
    expect(normalizeTheme("contrast")).toBe("dark");
    expect(normalizeTheme("")).toBe("dark");
  });
});
