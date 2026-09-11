import { cn } from "@/lib/utils";
import { useApp } from "@/contexts/useApp";
import type { DataDetailMode } from "@/types";

const MODES: DataDetailMode[] = ["balanced", "detailed", "full"];

export function ViewModeSelector({
  value,
  onChange,
  className,
}: {
  value: DataDetailMode;
  onChange: (mode: DataDetailMode) => void;
  className?: string;
}) {
  const { t } = useApp();
  const labels: Record<DataDetailMode, string> = {
    balanced: t("detailBalanced"),
    detailed: t("detailDetailed"),
    full: t("detailFull"),
  };

  return (
    <div
      className={cn(
        "flex items-center gap-1 rounded-lg border border-border/50 bg-surface-1/50 p-1",
        className,
      )}
    >
      {MODES.map((mode) => (
        <button
          key={mode}
          type="button"
          onClick={() => onChange(mode)}
          className={cn(
            "rounded-md px-2.5 py-1 text-[10px] font-semibold transition-colors",
            value === mode
              ? "bg-primary text-primary-foreground"
              : "text-foreground-subtle hover:text-foreground",
          )}
        >
          {labels[mode]}
        </button>
      ))}
    </div>
  );
}