import { Moon, Sun } from "lucide-react";
import { normalizeTheme } from "@/contexts/app-context";
import { useApp } from "@/contexts/useApp";

/**
 * Neutral light/dark switch for the promo footer.
 *
 * It edits `gl_settings.theme` — the same key the app reads — so the choice
 * survives the trip between `/` and `/app` and comes back on the next visit.
 *
 * Only the neutral pair is offered here; the five accent themes stay in the
 * app's settings screen. From an accent the switch goes to light, and the way
 * back lands on neutral dark: it never claims to restore the accent.
 *
 * Accessibility contract: the icon is the only visible content, so `aria-label`
 * and `title` name the destination, while `aria-pressed` mirrors the light
 * member of the pair (`true` while the light theme is active). The control is
 * at least 44px in both axes, and the palette swap is instant — no color
 * transition, so the theme cannot animate under the pointer.
 */
export function PromoThemeToggle() {
  const { settings, updateSettings, t } = useApp();
  const isLight = normalizeTheme(settings.theme) === "light";
  const Icon = isLight ? Moon : Sun;
  const label = isLight ? t("promoThemeSwitchToDark") : t("promoThemeSwitchToLight");

  return (
    <button
      type="button"
      onClick={() => updateSettings({ theme: isLight ? "dark" : "light" })}
      aria-label={label}
      title={label}
      aria-pressed={isLight}
      className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-border bg-surface-1 px-4 text-sm font-semibold text-foreground hover:bg-surface-2 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <Icon className="size-4" aria-hidden="true" />
    </button>
  );
}
