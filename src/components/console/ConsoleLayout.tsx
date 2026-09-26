import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router';
import { Activity } from 'lucide-react';
import { GlobalDashboard } from '@/components/console/GlobalDashboard';
import { Inspector } from '@/components/console/Inspector';
import { TriageQueue } from '@/components/console/TriageQueue';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet';
import { useApp } from '@/contexts/useApp';
import { cn } from '@/lib/utils';
import {
  SIDEBAR_COLLAPSE_AT,
  SIDEBAR_DEFAULT_WIDTH,
  SIDEBAR_KEYBOARD_STEP,
  SIDEBAR_MAX_WIDTH,
  SIDEBAR_MIN_WIDTH,
  SIDEBAR_RAIL_WIDTH,
  clampSidebarWidth,
  sidebarLabelOpacity,
} from '@/components/console/sidebar-geometry';
import type { ScoredRepo } from '@/lib/attention';
import type { SidebarMode } from '@/types';

interface ConsoleLayoutProps {
  repos: ScoredRepo[];
  runtime?: 'local' | 'public';
}

interface DragState {
  pointerId: number;
  startX: number;
  startWidth: number;
}

export function ConsoleLayout({ repos, runtime = 'local' }: ConsoleLayoutProps) {
  const { settings, updateSettings, t } = useApp();
  const [searchParams, setSearchParams] = useSearchParams();
  const canShowWorkspace = useMediaQuery('(min-width: 768px)');
  const canUseExpandedSidebar = useMediaQuery('(min-width: 1024px)');
  const repoId = searchParams.get('repo');
  const selectedRepo = repoId ? repos.find((entry) => entry.repo.id.toString() === repoId) ?? null : null;
  const desktopRepo = selectedRepo;
  const compact = settings.sidebarMode === 'compact' || !canUseExpandedSidebar;
  // Live width while dragging; the committed value lives in settings so the
  // chosen width survives a reload.
  const [dragWidth, setDragWidth] = useState<number | null>(null);
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef<DragState | null>(null);
  const storedWidth = settings.sidebarWidth == null ? SIDEBAR_DEFAULT_WIDTH : clampSidebarWidth(settings.sidebarWidth);
  const width = dragWidth ?? storedWidth;
  const listCollapsed = compact || (canUseExpandedSidebar && width < SIDEBAR_COLLAPSE_AT);
  const resizable = canUseExpandedSidebar;
  // How readable the text layer is at the current width. The collapse happens
  // when this reaches zero, so the text is never squeezed on the way there.
  const labelOpacity = sidebarLabelOpacity(width);

  const commitWidth = useCallback((next: number) => {
    setDragWidth(null);
    if (next < SIDEBAR_COLLAPSE_AT) {
      // The gesture ended collapsed. The collapse has to be durable, otherwise
      // the list would snap back to its width on release; the last expanded
      // width is kept so expanding returns to it.
      if (settings.sidebarMode !== 'compact') updateSettings({ sidebarMode: 'compact' });
      return;
    }
    updateSettings({
      sidebarWidth: clampSidebarWidth(next),
      // Dragging or arrowing out of the rail expands the list.
      ...(settings.sidebarMode === 'compact' ? { sidebarMode: 'expanded' as SidebarMode } : {}),
    });
  }, [settings.sidebarMode, updateSettings]);

  const stopDragging = useCallback(() => {
    dragRef.current = null;
    setDragging(false);
    document.body.style.removeProperty('cursor');
    document.body.style.removeProperty('user-select');
  }, []);

  // A drag in progress must not survive a mode change coming from settings.
  useEffect(() => stopDragging, [stopDragging]);

  function handleDividerPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return;
    // The divider's own left edge is the origin of the gesture, so the width
    // tracks the pointer 1:1 in both states. Collapsed, the gesture starts from
    // the rail (logical width 0), which is what makes dragging out expand.
    const startX = event.currentTarget.getBoundingClientRect().left;
    const startWidth = listCollapsed ? 0 : width;
    dragRef.current = { pointerId: event.pointerId, startX, startWidth };
    setDragging(true);
    setDragWidth(startWidth);
    event.currentTarget.setPointerCapture?.(event.pointerId);
    event.preventDefault();
  }

  function handleDividerPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const next = drag.startWidth + (event.clientX - drag.startX);
    setDragWidth(Math.max(0, next));
    event.preventDefault();
  }

  function handleDividerPointerUp(event: React.PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    const next = drag.startWidth + (event.clientX - drag.startX);
    stopDragging();
    commitWidth(next);
  }

  function handleDividerKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      // Already the rail: shrinking further has nowhere to go. Without this the
      // step would compute from SIDEBAR_MIN_WIDTH and expand again.
      if (listCollapsed) return;
      const next = width - SIDEBAR_KEYBOARD_STEP;
      // Mirrors the drag: one press past the minimum collapses into the rail.
      // Without it the keyboard could never cross the collapse threshold, since
      // SIDEBAR_MIN_WIDTH sits above it and every step is clamped back.
      commitWidth(next < SIDEBAR_MIN_WIDTH ? 0 : next);
      return;
    }
    if (event.key === "ArrowRight") {
      event.preventDefault();
      // From the rail, the first press restores the last expanded width.
      commitWidth(listCollapsed ? storedWidth : width + SIDEBAR_KEYBOARD_STEP);
      return;
    }
    if (event.key === "Home") {
      event.preventDefault();
      commitWidth(0);
      return;
    }
    if (event.key === "End") {
      event.preventDefault();
      commitWidth(SIDEBAR_MAX_WIDTH);
    }
  }

  function clearSelectedRepo() {
    const params = new URLSearchParams(searchParams);
    params.delete('repo');
    setSearchParams(params, { replace: true });
  }

  function toggleSidebarMode() {
    updateSettings({ sidebarMode: settings.sidebarMode === 'compact' ? 'expanded' : 'compact' });
  }

  if (repos.length === 0) {
    return (
      <div className="flex h-full min-h-0 w-full items-center justify-center p-6 text-center">
        <div className="max-w-sm">
          <Activity size={28} className="mx-auto text-foreground-subtle opacity-25" />
          <p className="mt-4 text-title font-semibold text-foreground">{t('consoleEmptyTitle')}</p>
          <p className="mt-2 text-body text-foreground-subtle">
            {t('consoleEmptyDescription')}
          </p>
        </div>
      </div>
    );
  }

  // The Tailwind grid classes stay as the default layout. They are overridden
  // only when the user owns a width, so the untouched app keeps its responsive
  // 24rem/26rem columns.
  const customColumns = resizable && (settings.sidebarWidth != null || dragging)
    ? { gridTemplateColumns: `${listCollapsed ? SIDEBAR_RAIL_WIDTH : width}px minmax(0, 1fr)` }
    : undefined;

  return (
    <div
      className={cn(
        "grid h-full min-h-0 w-full min-w-0 overflow-hidden",
        // No transition while the pointer drives the width, and none at all for
        // anyone who asked for reduced motion: a sidebar that slides on its own
        // is exactly the kind of motion that setting exists to stop.
        !dragging && "transition-[grid-template-columns] duration-150 motion-reduce:transition-none",
        compact ? "md:grid-cols-[5.25rem_minmax(0,1fr)]" : "lg:grid-cols-[24rem_minmax(0,1fr)] xl:grid-cols-[26rem_minmax(0,1fr)]"
      )}
      style={customColumns}
      data-sidebar-width={resizable ? (listCollapsed ? SIDEBAR_RAIL_WIDTH : width) : undefined}
    >
      <aside id="console-repository-list" className="relative min-h-0 min-w-0 border-r border-border/60 bg-background">
        <TriageQueue
          repos={repos}
          selectedRepoId={selectedRepo?.repo.id.toString()}
          // Driven by the live width, not only by the stored mode: the list has
          // to become the rail during the gesture, not after the release.
          compact={listCollapsed}
          labelOpacity={labelOpacity}
          railOpacity={listCollapsed ? 1 : 1 - labelOpacity}
          onToggleCompact={canUseExpandedSidebar ? toggleSidebarMode : undefined}
        />

        {resizable && (
          <div
            role="separator"
            aria-orientation="vertical"
            aria-label={t('resizeRepositoryList')}
            aria-valuenow={listCollapsed ? SIDEBAR_RAIL_WIDTH : width}
            aria-valuemin={SIDEBAR_RAIL_WIDTH}
            aria-valuemax={SIDEBAR_MAX_WIDTH}
            aria-valuetext={listCollapsed ? t('sidebarCollapsedValue') : `${width}px`}
            aria-controls="console-repository-list"
            tabIndex={0}
            onPointerDown={handleDividerPointerDown}
            onPointerMove={handleDividerPointerMove}
            onPointerUp={handleDividerPointerUp}
            onPointerCancel={handleDividerPointerUp}
            onKeyDown={handleDividerKeyDown}
            onDoubleClick={toggleSidebarMode}
            className={cn(
              "group absolute inset-y-0 -right-1 z-20 w-2 cursor-col-resize touch-none",
              // Same indicator the rest of the console uses, not a thinner one.
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            )}
          >
            {/* The hairline is the affordance: it is always there, and it widens
                on hover so the grab area announces itself without a label. */}
            <span
              aria-hidden="true"
              className={cn(
                "pointer-events-none absolute inset-y-0 left-1/2 w-px -translate-x-1/2 rounded-full bg-border transition-[width,background-color] duration-150 motion-reduce:transition-none",
                "group-hover:w-0.5 group-hover:bg-primary/60 group-focus-visible:w-0.5 group-focus-visible:bg-primary",
                dragging && "w-0.5 bg-primary"
              )}
            />
          </div>
        )}
      </aside>

      <section className="hidden min-h-0 min-w-0 overflow-hidden bg-surface-2 md:flex">
        {desktopRepo ? <Inspector repo={desktopRepo} runtime={runtime} /> : <GlobalDashboard repos={repos} />}
      </section>

      <Sheet open={!canShowWorkspace && Boolean(selectedRepo)} onOpenChange={(open) => { if (!open) clearSelectedRepo(); }}>
        <SheetContent side="right" className="flex w-full max-w-none flex-col overflow-hidden border-border bg-surface-2 p-0 sm:max-w-[34rem] md:hidden">
          <SheetTitle className="sr-only">{t('inspectorSheetTitle')}</SheetTitle>
          <SheetDescription className="sr-only">{t('inspectorSheetDescription')}</SheetDescription>
          <Inspector repo={selectedRepo} runtime={runtime} />
        </SheetContent>
      </Sheet>
    </div>
  );
}

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    const media = window.matchMedia(query);
    const handleChange = () => setMatches(media.matches);
    handleChange();
    media.addEventListener('change', handleChange);
    return () => media.removeEventListener('change', handleChange);
  }, [query]);

  return matches;
}
