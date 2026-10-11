import { LoaderCircle } from 'lucide-react';

export function BackgroundRefreshIndicator() {
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-full border border-border/60 bg-surface-1/90 px-3 py-1.5 text-micro font-medium text-foreground-subtle shadow-xs backdrop-blur-xs"
    >
      <LoaderCircle size={12} className="animate-spin text-primary" />
      Updating...
    </div>
  );
}