import React, { useLayoutEffect } from 'react';
import { Outlet } from 'react-router';
import { StatusBar } from './StatusBar';
import { isTauriRuntime } from '@/config/site';
import { setupExternalLinkHandler } from '@/services/open-external';
import { bootMark } from '@/services/startup-metrics';
import { DesktopShell } from '@/desktop';
import '@/desktop/ui-tokens.css';

type AppShellRuntime = 'local' | 'public';

export function AppShell({ runtime = 'local' }: { runtime?: AppShellRuntime }) {
  const isTauri = isTauriRuntime();

  useLayoutEffect(() => {
    document.documentElement.classList.add('app-shell-active');
    document.body.classList.add('app-shell-active');
    bootMark('shell-ready');
    const removeExternalHandler = setupExternalLinkHandler();
    return () => {
      document.documentElement.classList.remove('app-shell-active');
      document.body.classList.remove('app-shell-active');
      removeExternalHandler();
    };
  }, []);

  const content = (
    <div className="app-viewport flex flex-col bg-background text-foreground-muted selection:bg-selection-bg selection:text-foreground">
      <StatusBar runtime={runtime} />
      <main className="flex min-h-0 w-full flex-1 overflow-hidden">
        <Outlet />
      </main>
    </div>
  );

  if (!isTauri) return content;

  return (
    <DesktopShell
      title="Push_"
      appIcon={
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
        </svg>
      }
    >
      {content}
    </DesktopShell>
  );
}